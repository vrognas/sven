// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { inputCommitFiles } from "../changelistItems";
import { buildCommitPaths, expandCommitPaths } from "../helpers/commitHelper";
import { inputCommitMessage } from "../messages";
import { Repository } from "../repository";
import { Command } from "./command";

export class CommitWithMessage extends Command {
  constructor() {
    super("sven.commitWithMessage", { repository: true });
  }

  public async execute(repository: Repository) {
    const resourceStates = await inputCommitFiles(repository);
    if (!resourceStates || resourceStates.length === 0) {
      return;
    }

    // Filter to Resource instances for path building
    const resources = this.filterResources(resourceStates);

    // Build initial paths for message input
    const initialPaths = this.resourcesToPaths(resources);

    const message = await inputCommitMessage(
      repository.inputBox.value,
      false,
      initialPaths
    );
    if (message === undefined) {
      return;
    }

    // Build paths including parent dirs and track renames
    const { displayPaths, renameMap } = buildCommitPaths(resources, repository);
    const filePaths = expandCommitPaths(displayPaths, renameMap);

    await this.handleRepositoryOperation(async () => {
      const result = await repository.commitFiles(message, filePaths);
      window.showInformationMessage(result);
      repository.inputBox.value = "";
    }, "Unable to commit");
  }
}
