// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { Command } from "./command";
import { confirmDestructive } from "../ui";
import { handleSvnResult, makeFilesWritable } from "../util/lockHelpers";
import { validateLockComment } from "../validation";

export class Lock extends Command {
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

    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        const result = await repository.lock(paths, comment ? { comment } : {});
        if (
          handleSvnResult(
            result,
            `Locked ${paths.length} file(s)`,
            "Lock failed"
          )
        ) {
          await makeFilesWritable(paths);
        }
      },
      "Unable to lock files"
    );
  }
}

/** Steal lock from another user (svn lock --force) */
export class StealLock extends Command {
  constructor() {
    super("sven.stealLock");
  }

  public async execute(...args: unknown[]) {
    const confirmed = await confirmDestructive(
      "Steal lock from another user? They will lose their lock.",
      "Steal Lock"
    );
    if (!confirmed) return;

    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        const result = await repository.lock(paths, { force: true });
        if (
          handleSvnResult(
            result,
            `Stole lock on ${paths.length} file(s)`,
            "Steal lock failed"
          )
        ) {
          await makeFilesWritable(paths);
        }
      },
      "Unable to steal lock"
    );
  }
}
