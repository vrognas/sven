// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Command } from "./command";
import { confirmDestructive } from "../ui";
import {
  handleSvnResult,
  makeFilesReadOnlyIfNeeded
} from "../util/lockHelpers";

export class Unlock extends Command {
  constructor() {
    super("sven.unlock");
  }

  public async execute(...args: unknown[]) {
    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        const result = await repository.unlock(paths);
        if (
          handleSvnResult(
            result,
            `Unlocked ${paths.length} file(s)`,
            "Unlock failed"
          )
        ) {
          await makeFilesReadOnlyIfNeeded(paths, p =>
            repository.hasNeedsLock(p)
          );
        }
      },
      "Unable to unlock files"
    );
  }
}

export class BreakLock extends Command {
  constructor() {
    super("sven.breakLock");
  }

  public async execute(...args: unknown[]) {
    const confirmed = await confirmDestructive(
      "Break lock owned by another user? This cannot be undone.",
      "Break Lock"
    );
    if (!confirmed) return;

    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        const result = await repository.unlock(paths, { force: true });
        if (
          handleSvnResult(
            result,
            `Broke lock on ${paths.length} file(s)`,
            "Break lock failed"
          )
        ) {
          await makeFilesReadOnlyIfNeeded(paths, p =>
            repository.hasNeedsLock(p)
          );
        }
      },
      "Unable to break lock"
    );
  }
}
