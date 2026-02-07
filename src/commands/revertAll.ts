// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceGroup } from "vscode";
import { getStagedPaths, unstageRevertedFiles } from "../helpers/revertHelper";
import { confirmRevert } from "../ui/confirm";
import { Command } from "./command";

export class RevertAll extends Command {
  constructor() {
    super("sven.revertAll");
  }

  public async execute(resourceGroup: SourceControlResourceGroup) {
    const resourceStates = resourceGroup.resourceStates;

    if (resourceStates.length === 0 || !(await confirmRevert())) {
      return;
    }

    const uris = this.resourceStatesToUris(resourceStates);
    const stagedPaths = getStagedPaths(resourceStates);

    // Always use infinity depth - for files it's ignored by SVN,
    // for directories it ensures full recursive revert including deleted paths
    await this.runByRepositoryPaths(
      uris,
      async (repository, repositoryPaths) => {
        const paths = repositoryPaths.reverse();
        await this.handleRepositoryOperation(async () => {
          await repository.revert(paths, "infinity");
          // Auto-unstage reverted files
          await unstageRevertedFiles(repository, paths, stagedPaths);
        }, "Unable to revert");
      }
    );
  }
}
