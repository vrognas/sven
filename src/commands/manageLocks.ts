// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { QuickPickItem, QuickPickItemKind, ThemeIcon, window } from "vscode";
import { Command } from "./command";
import { Repository } from "../repository";
import { LockStatus } from "../common/types";

interface LockQuickPickItem extends QuickPickItem {
  path?: string;
  action?: "unlock" | "unlockAll";
}

/**
 * Manage locked files via QuickPick.
 */
export class ManageLocks extends Command {
  constructor() {
    super("sven.manageLocks", { repository: true });
  }

  public async execute(repository: Repository) {
    const locks = repository.getLockedFilePaths();
    const items: LockQuickPickItem[] = [];

    // Header info
    if (locks.length === 0) {
      items.push({
        label: "No locked files",
        description: "Use 'Lock' command to lock files",
        kind: QuickPickItemKind.Separator
      });
    } else {
      const myLocks = locks.filter(l => l.lockStatus === LockStatus.K).length;
      const otherLocks = locks.length - myLocks;
      let desc = `${locks.length} locked file(s)`;
      if (myLocks > 0 && otherLocks > 0) {
        desc = `${myLocks} by you, ${otherLocks} by others`;
      }
      items.push({
        label: desc,
        kind: QuickPickItemKind.Separator
      });
    }

    // List locked files
    const workspaceRoot = repository.workspaceRoot;
    for (const lock of locks) {
      const fileName = path.basename(lock.relativePath);
      const dirPath = path.dirname(lock.relativePath);

      const isMine = lock.lockStatus === LockStatus.K;
      const icon = isMine ? "lock" : "warning";
      const owner = lock.lockOwner || (isMine ? "you" : "others");

      items.push({
        label: fileName,
        description: `${dirPath === "." ? "" : dirPath} (${owner})`,
        iconPath: new ThemeIcon(icon),
        path: lock.relativePath,
        action: isMine ? "unlock" : undefined
      });
    }

    // Actions - only show unlock all if user has locks
    const myLocks = locks.filter(l => l.lockStatus === LockStatus.K);
    if (myLocks.length > 0) {
      items.push({ label: "", kind: QuickPickItemKind.Separator });
      items.push({
        label: "Unlock all my locks",
        description: `Release ${myLocks.length} lock(s)`,
        iconPath: new ThemeIcon("unlock"),
        action: "unlockAll"
      });
    }

    const selected = await window.showQuickPick(items, {
      placeHolder: "Manage locks - select your lock to release"
    });

    if (!selected) {
      return;
    }

    if (selected.action === "unlock" && selected.path) {
      const fullPath = path.join(workspaceRoot, selected.path);
      try {
        await repository.unlock([fullPath]);
      } catch (err) {
        window.showErrorMessage(`Failed to unlock: ${(err as Error).message}`);
      }
    } else if (selected.action === "unlockAll") {
      const confirm = await window.showWarningMessage(
        `Release all ${myLocks.length} lock(s)?`,
        { modal: true },
        "Yes"
      );
      if (confirm === "Yes") {
        const paths = myLocks.map(l =>
          path.join(workspaceRoot, l.relativePath)
        );
        try {
          await repository.unlock(paths);
        } catch (err) {
          window.showErrorMessage(
            `Failed to unlock: ${(err as Error).message}`
          );
        }
      }
    }
  }
}
