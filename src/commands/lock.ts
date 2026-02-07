// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { BaseFileLockCommand } from "./baseFileLockCommand";
import { confirmDestructive } from "../ui";
import { makeFilesWritable } from "../util/lockHelpers";
import { validateLockComment } from "../validation";

export class Lock extends BaseFileLockCommand {
  constructor() {
    super("sven.lock");
  }

  public async execute(...args: unknown[]) {
    const comment = await window.showInputBox({
      prompt: "Enter a lock comment (optional)",
      placeHolder: "e.g., Editing large dataset"
    });
    if (comment === undefined) return;

    if (comment && !validateLockComment(comment)) {
      window.showErrorMessage(
        "Invalid lock comment: shell metacharacters not allowed"
      );
      return;
    }

    await this.executeFileLockOperation({
      args,
      operation: (repository, paths) =>
        repository.lock(paths, comment ? { comment } : {}),
      successMessage: count => `Locked ${count} file(s)`,
      resultErrorPrefix: "Lock failed",
      executeErrorMessage: "Unable to lock files",
      onSuccess: async (_repository, paths) => {
        await makeFilesWritable(paths);
      }
    });
  }
}

/** Steal lock from another user (svn lock --force) */
export class StealLock extends BaseFileLockCommand {
  constructor() {
    super("sven.stealLock");
  }

  public async execute(...args: unknown[]) {
    const confirmed = await confirmDestructive(
      "Steal lock from another user? They will lose their lock.",
      "Steal Lock"
    );
    if (!confirmed) return;

    await this.executeFileLockOperation({
      args,
      operation: (repository, paths) => repository.lock(paths, { force: true }),
      successMessage: count => `Stole lock on ${count} file(s)`,
      resultErrorPrefix: "Steal lock failed",
      executeErrorMessage: "Unable to steal lock",
      onSuccess: async (_repository, paths) => {
        await makeFilesWritable(paths);
      }
    });
  }
}
