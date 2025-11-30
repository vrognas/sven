// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as fs from "fs";
import * as path from "path";
import {
  CancellationToken,
  commands,
  ProgressLocation,
  QuickPickItem,
  Uri,
  window,
  workspace
} from "vscode";
import { SvnDepth } from "../common/types";
import { Command } from "./command";
import { SourceControlManager } from "../source_control_manager";

/** Default download timeout in minutes */
const DEFAULT_DOWNLOAD_TIMEOUT_MINUTES = 10;

/** Pre-scan timeout in seconds */
const PRE_SCAN_TIMEOUT_SECONDS = 30;

/** Progress poll interval in ms */
const POLL_INTERVAL_MS = 500;

/** Max recursion depth for file counting */
const MAX_RECURSION_DEPTH = 100;

/** Format seconds into human-readable duration */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format bytes into human-readable size */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Get total size of files in a folder (bytes).
 * Used for tracking download progress by size.
 */
function getFolderSize(
  folderPath: string,
  visited = new Set<string>(),
  depth = 0
): number {
  if (depth > MAX_RECURSION_DEPTH) return 0;

  let size = 0;
  try {
    const folderStats = fs.statSync(folderPath);
    const inode = `${folderStats.dev}:${folderStats.ino}`;
    if (visited.has(inode)) return 0;
    visited.add(inode);

    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".svn") continue;
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        size += getFolderSize(fullPath, visited, depth + 1);
      } else if (entry.isFile()) {
        try {
          size += fs.statSync(fullPath).size;
        } catch {
          // File may have been deleted
        }
      }
    }
  } catch {
    // Folder may not exist yet
  }
  return size;
}

/**
 * Count files recursively in a directory.
 * Used for tracking folder download progress.
 */
function countFilesInFolder(
  folderPath: string,
  visited = new Set<string>(),
  depth = 0
): number {
  if (depth > MAX_RECURSION_DEPTH) return 0;

  let count = 0;
  try {
    const folderStats = fs.statSync(folderPath);
    const inode = `${folderStats.dev}:${folderStats.ino}`;
    if (visited.has(inode)) return 0;
    visited.add(inode);

    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".svn") continue;
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        count += countFilesInFolder(fullPath, visited, depth + 1);
      } else if (entry.isFile()) {
        count++;
      }
    }
  } catch {
    // Folder may not exist yet
  }
  return count;
}

export interface DepthQuickPickItem extends QuickPickItem {
  depth: keyof typeof SvnDepth;
}

/** Checkout depth options (for restoring ghost items - no exclude option) */
export const checkoutDepthOptions: DepthQuickPickItem[] = [
  {
    label: "$(folder-opened) Full",
    description: "Download everything",
    detail: "Downloads the folder and all its contents recursively.",
    depth: "infinity"
  },
  {
    label: "$(list-tree) Shallow",
    description: "Files + empty subfolders",
    detail:
      "Downloads files and shows subfolders as empty. Good for exploring structure.",
    depth: "immediates"
  },
  {
    label: "$(file) Files Only",
    description: "Skip subfolders",
    detail: "Downloads files in this folder, but skips all subfolders.",
    depth: "files"
  },
  {
    label: "$(folder) Folder Only",
    description: "Empty placeholder",
    detail: "Keeps the folder as a placeholder but downloads no files.",
    depth: "empty"
  }
];

/** Full depth options including exclude (for setDepth command on local items) */
export const depthPickerOptions: DepthQuickPickItem[] = [
  {
    label: "$(eye-closed) Exclude",
    description: "Don't download this folder",
    detail:
      "Removes the folder and all contents locally. Use for large folders you don't need.",
    depth: "exclude"
  },
  ...checkoutDepthOptions
];

export class SetDepth extends Command {
  constructor() {
    super("svn.setDepth");
  }

  public async execute(arg?: Uri | { fullPath: string }): Promise<void> {
    // Get URI from argument (Uri from explorer, or SparseItemNode from tree)
    let uri: Uri | undefined;

    if (arg instanceof Uri) {
      uri = arg;
    } else if (arg && typeof arg === "object" && "fullPath" in arg) {
      // SparseItemNode from sparse checkout tree view
      uri = Uri.file(arg.fullPath);
    }

    if (!uri) {
      return;
    }

    // Get repository for this path
    const sourceControlManager = (await commands.executeCommand(
      "svn.getSourceControlManager",
      ""
    )) as SourceControlManager;

    const repository = sourceControlManager.getRepository(uri);
    if (!repository) {
      window.showErrorMessage("No SVN repository found for this folder");
      return;
    }

    // Get folder name for display
    const folderName = uri.fsPath.split(/[\\/]/).pop() || "folder";

    // Show QuickPick for depth selection
    const selected = await window.showQuickPick(depthPickerOptions, {
      placeHolder: "What should be downloaded for this folder?",
      title: `SVN: Sparse Checkout - ${folderName}`
    });

    if (!selected) {
      return; // User cancelled
    }

    // Confirm for destructive operations (all except infinity add content)
    if (selected.depth !== "infinity") {
      const warningMessages: Record<string, string> = {
        exclude:
          "This will remove the folder and all its contents locally. " +
          "The files still exist on the server and can be restored later.",
        empty:
          "This will remove all files and subfolders inside this folder. " +
          "The folder itself will remain as an empty placeholder.",
        files:
          "This will remove all subfolders (but keep files). " +
          "Subfolder contents can be restored later.",
        immediates:
          "This will remove contents of subfolders (keeping them as empty). " +
          "Deeper contents can be restored later."
      };

      const confirm = await window.showWarningMessage(
        warningMessages[selected.depth] ||
          "This operation may remove local files.",
        { modal: true },
        "Continue",
        "Cancel"
      );
      if (confirm !== "Continue") {
        return;
      }
    }

    // Get configurable timeout
    const timeoutMinutes = workspace
      .getConfiguration("svn.sparse")
      .get<number>("downloadTimeoutMinutes", DEFAULT_DOWNLOAD_TIMEOUT_MINUTES);
    const downloadTimeoutMs = timeoutMinutes * 60 * 1000;

    // Suppress status updates during download (prevents WC lock conflicts)
    repository.sparseDownloadInProgress = true;

    try {
      // Show progress with cancellation support for infinity depth (downloads)
      const isDownload = selected.depth === "infinity";

      const result = await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: isDownload
            ? `Downloading "${folderName}"...`
            : `Setting depth for "${folderName}"...`,
          cancellable: isDownload
        },
        async (progress, token: CancellationToken) => {
          // Immediate feedback
          progress.report({
            message: isDownload ? "Starting download..." : "Preparing..."
          });

          // Check for cancellation before starting
          if (token.isCancellationRequested) {
            return { exitCode: -1, cancelled: true, stderr: "" };
          }

          let pollInterval: ReturnType<typeof setInterval> | undefined;
          let expectedFileCount = 0;
          let expectedTotalSize = 0;
          let initialFileCount = 0;
          let initialTotalSize = 0;

          try {
            if (isDownload) {
              // For downloads, pre-scan server to get expected file count and size
              progress.report({ message: `Scanning ${folderName}...` });

              try {
                const relativePath = repository.repository.removeAbsolutePath(
                  uri.fsPath
                );
                const items = await repository.listRecursive(
                  relativePath,
                  PRE_SCAN_TIMEOUT_SECONDS * 1000
                );
                const files = items.filter(i => i.kind === "file");
                expectedFileCount = files.length;
                expectedTotalSize = files.reduce(
                  (sum, f) => sum + (parseInt(f.size || "0", 10) || 0),
                  0
                );

                if (token.isCancellationRequested) {
                  return { exitCode: -1, cancelled: true, stderr: "" };
                }

                const sizeLabel =
                  expectedTotalSize > 0
                    ? ` (${formatBytes(expectedTotalSize)})`
                    : "";
                progress.report({
                  message: `Found ${expectedFileCount} files${sizeLabel} in ${folderName}`
                });
              } catch {
                expectedFileCount = 0;
                expectedTotalSize = 0;
              }

              // Start progress polling for downloads
              if (expectedFileCount > 0) {
                const startTime = Date.now();
                progress.report({
                  message: `Downloading ${folderName} (0/${expectedFileCount} files)...`
                });

                pollInterval = setInterval(() => {
                  if (token.isCancellationRequested) return;
                  const currentCount = countFilesInFolder(uri.fsPath);
                  const currentSize = getFolderSize(uri.fsPath);
                  const pct =
                    expectedTotalSize > 0
                      ? Math.round((currentSize / expectedTotalSize) * 100)
                      : Math.round((currentCount / expectedFileCount) * 100);

                  // Calculate ETA based on bytes/sec (more accurate than files)
                  let etaLabel = "";
                  if (currentSize > 0 && expectedTotalSize > 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = currentSize / elapsed; // bytes/sec
                    const remaining = expectedTotalSize - currentSize;
                    if (speed > 0 && remaining > 0) {
                      const eta = remaining / speed;
                      etaLabel = ` ~${formatDuration(eta)}`;
                    }
                  }

                  progress.report({
                    message: `${folderName}: ${currentCount}/${expectedFileCount} files (${pct}%)${etaLabel}`
                  });
                }, POLL_INTERVAL_MS);
              } else {
                progress.report({ message: `Downloading ${folderName}...` });
              }
            } else {
              // For removals (exclude, empty, files, immediates), count existing files
              initialFileCount = countFilesInFolder(uri.fsPath);
              initialTotalSize = getFolderSize(uri.fsPath);

              if (initialFileCount > 0) {
                const startTime = Date.now();
                const actionLabel =
                  selected.depth === "exclude" ? "Excluding" : "Removing files";
                const sizeLabel =
                  initialTotalSize > 0
                    ? ` (${formatBytes(initialTotalSize)})`
                    : "";
                progress.report({
                  message: `${actionLabel} ${initialFileCount} files${sizeLabel}...`
                });

                pollInterval = setInterval(() => {
                  const remainingCount = countFilesInFolder(uri.fsPath);
                  const remainingSize = getFolderSize(uri.fsPath);
                  const removed = initialFileCount - remainingCount;
                  if (removed > 0) {
                    // Calculate ETA based on bytes removed
                    let etaLabel = "";
                    const removedSize = initialTotalSize - remainingSize;
                    if (removedSize > 0 && initialTotalSize > 0) {
                      const elapsed = (Date.now() - startTime) / 1000;
                      const speed = removedSize / elapsed; // bytes/sec
                      if (speed > 0 && remainingSize > 0) {
                        const eta = remainingSize / speed;
                        etaLabel = ` ~${formatDuration(eta)}`;
                      }
                    }

                    progress.report({
                      message: `${actionLabel}: ${removed}/${initialFileCount} removed${etaLabel}`
                    });
                  }
                }, POLL_INTERVAL_MS);
              } else {
                progress.report({ message: "Applying changes..." });
              }
            }

            const res = await repository.setDepth(uri.fsPath, selected.depth, {
              parents: true,
              timeout: downloadTimeoutMs
            });

            if (token.isCancellationRequested) {
              return { ...res, cancelled: true };
            }

            return { ...res, cancelled: false };
          } catch (err) {
            return {
              exitCode: 1,
              cancelled: token.isCancellationRequested,
              stderr: String(err)
            };
          } finally {
            if (pollInterval) {
              clearInterval(pollInterval);
            }
          }
        }
      );

      if (result.cancelled) {
        window.showInformationMessage(`Operation cancelled`);
        return;
      }

      if (result.exitCode === 0) {
        const successMessages: Record<string, string> = {
          exclude: `"${folderName}" excluded`,
          empty: `"${folderName}" contents removed (folder kept)`,
          files: `"${folderName}" set to files only`,
          immediates: `"${folderName}" set to shallow`,
          infinity: `"${folderName}" fully restored`
        };
        window.showInformationMessage(
          successMessages[selected.depth] || `Checkout depth changed`
        );
        // Refresh sparse checkout tree to reflect changes
        commands.executeCommand("svn.sparse.refresh");
      } else {
        window.showErrorMessage(
          `Failed to change checkout: ${result.stderr || "Unknown error"}`
        );
      }
    } catch (error) {
      window.showErrorMessage(`Failed to change checkout: ${error}`);
    } finally {
      // Re-enable status updates
      repository.sparseDownloadInProgress = false;
    }
  }
}
