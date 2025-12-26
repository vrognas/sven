// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { window } from "vscode";
import { buildCommitPaths, expandCommitPaths } from "../helpers/commitHelper";
import { Repository } from "../repository";
import { Command } from "./command";

/**
 * Quick commit without message prompt.
 * Uses input box value if present, otherwise auto-generates message.
 */
export class CommitQuick extends Command {
  constructor() {
    super("sven.commitQuick", { repository: true });
  }

  public async execute(repository: Repository) {
    // Get staged resources
    const stagedResources = this.filterResources(
      repository.staged.resourceStates
    );

    if (stagedResources.length === 0) {
      window.showInformationMessage("No staged files to commit");
      return;
    }

    // Build paths including parent dirs and track renames
    const { displayPaths, renameMap } = buildCommitPaths(
      stagedResources,
      repository
    );
    const filePaths = expandCommitPaths(displayPaths, renameMap);

    // Use input box value or auto-generate message
    let message = repository.inputBox.value.trim();
    if (!message) {
      // Auto-generate message based on file count and primary action
      const fileCount = stagedResources.length;
      const primaryFile = path.basename(stagedResources[0]!.resourceUri.fsPath);
      message =
        fileCount === 1 ? `Update ${primaryFile}` : `Update ${fileCount} files`;
    }

    await this.handleRepositoryOperation(async () => {
      const result = await repository.commitFiles(message, filePaths);
      window.showInformationMessage(result);
      repository.inputBox.value = "";
      repository.staging.clearOriginalChangelists(filePaths);
    }, "Unable to commit");
  }
}
