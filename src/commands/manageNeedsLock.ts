// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { QuickPickItem, QuickPickItemKind, ThemeIcon, window } from "vscode";
import { Command } from "./command";
import { Repository } from "../repository";

interface NeedsLockQuickPickItem extends QuickPickItem {
  path?: string;
  action?: "remove" | "clear";
}

/**
 * Manage files with svn:needs-lock property via QuickPick.
 */
export class ManageNeedsLock extends Command {
  constructor() {
    super("sven.manageNeedsLock", { repository: true });
  }

  public async execute(repository: Repository) {
    const paths = repository.getNeedsLockPaths();
    const items: NeedsLockQuickPickItem[] = [];

    // Header info
    if (paths.length === 0) {
      items.push({
        label: "No files with needs-lock property",
        description: "Use 'Toggle Needs-Lock' on files to add",
        kind: QuickPickItemKind.Separator
      });
    } else {
      items.push({
        label: `${paths.length} file(s) need lock`,
        kind: QuickPickItemKind.Separator
      });
    }

    // List current needs-lock files
    const workspaceRoot = repository.workspaceRoot;
    for (const relativePath of paths) {
      const fileName = path.basename(relativePath);
      const dirPath = path.dirname(relativePath);

      items.push({
        label: fileName,
        description: dirPath === "." ? "" : dirPath,
        iconPath: new ThemeIcon("unlock"),
        path: relativePath,
        action: "remove"
      });
    }

    // Actions
    if (paths.length > 0) {
      items.push({ label: "", kind: QuickPickItemKind.Separator });
      items.push({
        label: "Remove needs-lock from all",
        description: "Remove svn:needs-lock property from all files",
        iconPath: new ThemeIcon("trash"),
        action: "clear"
      });
    }

    const selected = await window.showQuickPick(items, {
      placeHolder: "Manage needs-lock files - select to remove property"
    });

    if (!selected) {
      return;
    }

    if (selected.action === "remove" && selected.path) {
      const fullPath = path.join(workspaceRoot, selected.path);
      try {
        await repository.removeNeedsLock(fullPath);
      } catch (err) {
        window.showErrorMessage(
          `Failed to remove needs-lock: ${(err as Error).message}`
        );
      }
    } else if (selected.action === "clear") {
      const confirm = await window.showWarningMessage(
        "Remove needs-lock from all files?",
        { modal: true },
        "Yes"
      );
      if (confirm === "Yes") {
        const errors: string[] = [];
        // Use Promise.allSettled for parallel execution with error collection
        const results = await Promise.allSettled(
          paths.map(p => {
            const fullPath = path.join(workspaceRoot, p);
            return repository.removeNeedsLock(fullPath);
          })
        );
        for (let i = 0; i < results.length; i++) {
          if (results[i]!.status === "rejected") {
            errors.push(paths[i]!);
          }
        }
        if (errors.length > 0) {
          window.showErrorMessage(
            `Failed to remove needs-lock from ${errors.length} file(s)`
          );
        }
      }
    }
  }
}
