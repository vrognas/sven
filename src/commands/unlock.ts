// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { Command } from "./command";
import { confirmDestructive } from "../ui";
import { makeReadOnly } from "../fs";

export class Unlock extends Command {
  constructor() {
    super("sven.unlock");
  }

  public async execute(...args: unknown[]) {
    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        const result = await repository.unlock(paths);
        if (result.exitCode === 0) {
          for (const p of paths) {
            if (await repository.hasNeedsLock(p)) {
              try {
                await makeReadOnly(p);
              } catch {
                /* ignore */
              }
            }
          }
          window.showInformationMessage(`Unlocked ${paths.length} file(s)`);
        } else {
          window.showErrorMessage(
            `Unlock failed: ${result.stderr || "Unknown error"}`
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
        if (result.exitCode === 0) {
          for (const p of paths) {
            if (await repository.hasNeedsLock(p)) {
              try {
                await makeReadOnly(p);
              } catch {
                /* ignore */
              }
            }
          }
          window.showInformationMessage(
            `Broke lock on ${paths.length} file(s)`
          );
        } else {
          window.showErrorMessage(
            `Break lock failed: ${result.stderr || "Unknown error"}`
          );
        }
      },
      "Unable to break lock"
    );
  }
}
