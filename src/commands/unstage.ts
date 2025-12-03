// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Repository } from "../repository";
import { Command } from "./command";

/**
 * Unstage files, restoring them to their original changelist if they had one.
 * Files without original changelist go to Changes group.
 */
async function unstageWithRestore(
  repository: Repository,
  paths: string[]
): Promise<void> {
  // Group paths by their restore destination
  const toRestore = new Map<string, string[]>(); // changelist → paths
  const toRemove: string[] = []; // paths with no original changelist

  for (const path of paths) {
    const original = repository.staging.getOriginalChangelist(path);
    if (original) {
      const list = toRestore.get(original) || [];
      list.push(path);
      toRestore.set(original, list);
    } else {
      toRemove.push(path);
    }
  }

  // Restore files to their original changelists
  for (const [changelist, filePaths] of toRestore) {
    await repository.addChangelist(filePaths, changelist);
  }

  // Remove files that had no original changelist
  if (toRemove.length > 0) {
    await repository.removeChangelist(toRemove);
  }

  // Clear tracking for all unstaged files
  repository.staging.clearOriginalChangelists(paths);
}

export class Unstage extends Command {
  constructor() {
    super("svn.unstage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    const uris = selection.map(resource => resource.resourceUri);

    await this.runByRepository(uris, async (repository, resources) => {
      const paths = resources.map(r => r.fsPath);
      await this.handleRepositoryOperation(
        async () => unstageWithRestore(repository, paths),
        "Unable to unstage files"
      );
    });
  }
}

export class UnstageAll extends Command {
  constructor() {
    super("svn.unstageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStates(resourceStates);

    // If called with resources, unstage those; otherwise unstage all staged
    if (selection.length > 0) {
      const uris = selection.map(resource => resource.resourceUri);
      await this.runByRepository(uris, async (repository, resources) => {
        const paths = resources.map(r => r.fsPath);
        await this.handleRepositoryOperation(
          async () => unstageWithRestore(repository, paths),
          "Unable to unstage files"
        );
      });
    } else {
      // Unstage all in all repositories
      await this.runByRepository([], async repository => {
        const staged = repository.staged.resourceStates;
        const paths = staged.map(r => r.resourceUri.fsPath);
        if (paths.length > 0) {
          await this.handleRepositoryOperation(
            async () => unstageWithRestore(repository, paths),
            "Unable to unstage files"
          );
        }
      });
    }
  }
}
