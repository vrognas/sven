// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { window } from "vscode";
import { Status } from "../common/types";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { Command } from "./command";

/**
 * Quick commit without message prompt.
 * Uses input box value if present, otherwise auto-generates message.
 */
export class CommitQuick extends Command {
  constructor() {
    super("svn.commitQuick", { repository: true });
  }

  public async execute(repository: Repository) {
    // Get staged resources
    const stagedResources = repository.staged.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    if (stagedResources.length === 0) {
      window.showInformationMessage("No staged files to commit");
      return;
    }

    // Use Set to avoid duplicates when multiple files share parent dirs
    const filePathSet = new Set(
      stagedResources.map(state => state.resourceUri.fsPath)
    );

    // Handle renamed files and parent directories
    stagedResources.forEach(state => {
      if (state.type === Status.ADDED && state.renameResourceUri) {
        filePathSet.add(state.renameResourceUri.fsPath);
      }

      let dir = path.dirname(state.resourceUri.fsPath);
      let parent = repository.getResourceFromFile(dir);

      while (parent) {
        if (parent.type === Status.ADDED) {
          filePathSet.add(dir);
        }
        dir = path.dirname(dir);
        parent = repository.getResourceFromFile(dir);
      }
    });

    const filePaths = Array.from(filePathSet);

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
