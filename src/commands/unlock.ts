// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { BaseFileLockCommand } from "./baseFileLockCommand";
import { confirmDestructive } from "../ui";
import { makeFilesReadOnlyIfNeeded } from "../util/lockHelpers";

export class Unlock extends BaseFileLockCommand {
  constructor() {
    super("sven.unlock");
  }

  public async execute(...args: unknown[]) {
    await this.executeFileLockOperation({
      args,
      operation: (repository, paths) => repository.unlock(paths),
      successMessage: count => `Unlocked ${count} file(s)`,
      resultErrorPrefix: "Unlock failed",
      executeErrorMessage: "Unable to unlock files",
      onSuccess: async (repository, paths) => {
        await makeFilesReadOnlyIfNeeded(paths, p => repository.hasNeedsLock(p));
      }
    });
  }
}

export class BreakLock extends BaseFileLockCommand {
  constructor() {
    super("sven.breakLock");
  }

  public async execute(...args: unknown[]) {
    const confirmed = await confirmDestructive(
      "Break lock owned by another user? This cannot be undone.",
      "Break Lock"
    );
    if (!confirmed) return;

    await this.executeFileLockOperation({
      args,
      operation: (repository, paths) =>
        repository.unlock(paths, { force: true }),
      successMessage: count => `Broke lock on ${count} file(s)`,
      resultErrorPrefix: "Break lock failed",
      executeErrorMessage: "Unable to break lock",
      onSuccess: async (repository, paths) => {
        await makeFilesReadOnlyIfNeeded(paths, p => repository.hasNeedsLock(p));
      }
    });
  }
}
