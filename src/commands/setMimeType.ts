// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { QuickPickItem, SourceControlResourceState, Uri, window } from "vscode";
import { Command } from "./command";
import * as path from "path";

interface MimeTypeQuickPickItem extends QuickPickItem {
  value: string;
}

/**
 * MIME type auto-detection map based on file extension.
 */
const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  // Documents
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Archives
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".7z": "application/x-7z-compressed",
  ".rar": "application/vnd.rar",
  // Data
  ".json": "application/json",
  ".xml": "text/xml", // Important: NOT application/xml (causes binary treatment)
  ".csv": "text/csv",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  // Text
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/typescript",
  ".jsx": "text/jsx",
  ".tsx": "text/tsx",
  // Binary
  ".exe": "application/octet-stream",
  ".dll": "application/octet-stream",
  ".so": "application/octet-stream",
  ".dylib": "application/octet-stream",
  ".bin": "application/octet-stream",
  ".dat": "application/octet-stream",
  // Models/ML
  ".h5": "application/octet-stream",
  ".pkl": "application/octet-stream",
  ".pt": "application/octet-stream",
  ".onnx": "application/octet-stream"
};

/**
 * Common MIME types for QuickPick.
 */
const COMMON_MIME_TYPES: MimeTypeQuickPickItem[] = [
  {
    label: "text/plain",
    value: "text/plain",
    description: "Plain text file"
  },
  {
    label: "text/xml",
    value: "text/xml",
    description: "XML file (mergeable)"
  },
  {
    label: "application/json",
    value: "application/json",
    description: "JSON file"
  },
  {
    label: "application/octet-stream",
    value: "application/octet-stream",
    description: "Binary file (no merge/diff)"
  },
  {
    label: "image/png",
    value: "image/png",
    description: "PNG image"
  },
  {
    label: "image/jpeg",
    value: "image/jpeg",
    description: "JPEG image"
  },
  {
    label: "image/svg+xml",
    value: "image/svg+xml",
    description: "SVG image"
  },
  {
    label: "application/pdf",
    value: "application/pdf",
    description: "PDF document"
  },
  {
    label: "$(edit) Custom...",
    value: "__custom__",
    description: "Enter a custom MIME type"
  }
];

/**
 * Get suggested MIME type based on file extension.
 */
function suggestMimeType(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPE_MAP[ext];
}

/**
 * Set svn:mime-type property on files.
 * Controls how SVN handles merges and diffs.
 */
export class SetMimeType extends Command {
  constructor() {
    super("sven.setMimeType");
  }

  public async execute(...args: (SourceControlResourceState | Uri)[]) {
    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        await this.setMimeTypeOnPaths(repository, paths);
      },
      "Unable to set mime-type property"
    );
  }

  private async setMimeTypeOnPaths(
    repository: Parameters<Parameters<typeof this.executeOnResources>[1]>[0],
    paths: string[]
  ): Promise<void> {
    // Build QuickPick items with auto-detected suggestion at top
    const items: MimeTypeQuickPickItem[] = [];

    // Add auto-detected suggestion if single file
    if (paths.length === 1) {
      const suggested = suggestMimeType(paths[0]!);
      if (suggested) {
        items.push({
          label: `$(lightbulb) ${suggested}`,
          value: suggested,
          description: "Auto-detected from file extension (Recommended)"
        });
        items.push({ label: "", value: "", kind: -1 } as MimeTypeQuickPickItem); // Separator
      }
    }

    // Add common MIME types
    items.push(...COMMON_MIME_TYPES);

    const selected = await window.showQuickPick(items, {
      placeHolder: "Select MIME type",
      title: `Set MIME Type on ${paths.length} file(s)`
    });

    if (!selected || !selected.value) return;

    let mimeType = selected.value;

    // Handle custom input
    if (mimeType === "__custom__") {
      const customType = await window.showInputBox({
        prompt: "Enter MIME type",
        placeHolder: "e.g., text/csv, application/octet-stream",
        validateInput: value => {
          if (!value || !value.includes("/")) {
            return 'MIME type must be in format "type/subtype"';
          }
          return undefined;
        }
      });
      if (!customType) return;
      mimeType = customType;
    }

    let successCount = 0;
    let errorMessage = "";

    for (const filePath of paths) {
      try {
        const result = await repository.setMimeType(filePath, mimeType);
        if (result.exitCode === 0) {
          successCount++;
        } else {
          errorMessage = result.stderr || "Unknown error";
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Unknown error";
      }
    }

    if (successCount > 0) {
      const binaryWarning =
        mimeType === "application/octet-stream" || !mimeType.startsWith("text/")
          ? " (binary - no merge/diff)"
          : "";
      window.showInformationMessage(
        `Set svn:mime-type=${mimeType} on ${successCount} file(s)${binaryWarning}`
      );
    }

    if (errorMessage) {
      window.showErrorMessage(`Failed to set mime-type: ${errorMessage}`);
    }
  }
}

/**
 * Remove svn:mime-type property from files.
 */
export class RemoveMimeType extends Command {
  constructor() {
    super("sven.removeMimeType");
  }

  public async execute(...args: (SourceControlResourceState | Uri)[]) {
    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        await this.removeMimeTypeFromPaths(repository, paths);
      },
      "Unable to remove mime-type property"
    );
  }

  private async removeMimeTypeFromPaths(
    repository: Parameters<Parameters<typeof this.executeOnResources>[1]>[0],
    paths: string[]
  ): Promise<void> {
    let successCount = 0;

    for (const filePath of paths) {
      try {
        const result = await repository.removeMimeType(filePath);
        if (result.exitCode === 0) {
          successCount++;
        }
      } catch {
        // Ignore errors for individual files
      }
    }

    if (successCount > 0) {
      window.showInformationMessage(
        `Removed svn:mime-type from ${successCount} file(s)`
      );
    }
  }
}
