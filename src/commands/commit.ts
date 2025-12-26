// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState, window } from "vscode";
import { buildCommitPaths, expandCommitPaths } from "../helpers/commitHelper";
import { inputCommitMessage } from "../messages";
import { Command } from "./command";

export class Commit extends Command {
  constructor() {
    super("sven.commit");
  }

  public async execute(...resources: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resources);
    if (!selection) return;

    // Enforce changelist requirement - only allow files in changelists
    const notInChangelist = selection.filter(r => !r.changelist);
    if (notInChangelist.length > 0) {
      window.showWarningMessage(
        "Stage files before committing. Use the Stage button or Ctrl+Enter."
      );
      return;
    }

    await this.runByRepository(
      this.toUris(selection),
      async (repository, _resources) => {
        // Build paths including parent dirs and track renames
        const repoResources = selection.filter(r =>
          r.resourceUri.fsPath.startsWith(repository.workspaceRoot)
        );
        const { displayPaths, renameMap } = buildCommitPaths(
          repoResources,
          repository
        );
        const paths = expandCommitPaths(displayPaths, renameMap);

        const message = await inputCommitMessage(
          repository.inputBox.value,
          true,
          displayPaths
        );

        if (message === undefined) {
          return;
        }

        repository.inputBox.value = message;

        await this.handleRepositoryOperation(async () => {
          const result = await repository.commitFiles(message, paths);
          window.showInformationMessage(result);
          repository.inputBox.value = "";
        }, "Unable to commit");
      }
    );
  }
}
