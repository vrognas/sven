// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { window } from "vscode";
import { inputCommitFiles } from "../changelistItems";
import { Status } from "../common/types";
import { inputCommitMessage } from "../messages";
import { Repository } from "../repository";
import { Resource } from "../resource";
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

    // Use Set to avoid duplicates when multiple files share parent dirs
    const filePathSet = new Set(
      resourceStates.map(state => state.resourceUri.fsPath)
    );

    const message = await inputCommitMessage(
      repository.inputBox.value,
      false,
      Array.from(filePathSet)
    );
    if (message === undefined) {
      return;
    }

    // Add renamed files and added parent directories
    resourceStates.forEach(state => {
      if (state instanceof Resource) {
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
      }
    });

    const filePaths = Array.from(filePathSet);

    await this.handleRepositoryOperation(async () => {
      const result = await repository.commitFiles(message, filePaths);
      window.showInformationMessage(result);
      repository.inputBox.value = "";
    }, "Unable to commit");
  }
}
