// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { window } from "vscode";
import { Status } from "../common/types";
import { configuration } from "../helpers/configuration";
import { inputCommitMessage } from "../messages";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { CommitFlowService } from "../services/commitFlowService";
import { Command } from "./command";

/**
 * Commit from SCM input box (Ctrl+Enter).
 * Uses new QuickPick flow or legacy webview based on config.
 */
export class CommitFromInputBox extends Command {
  private commitFlowService: CommitFlowService;

  constructor() {
    super("svn.commitFromInputBox", { repository: true });
    this.commitFlowService = new CommitFlowService();
  }

  public async execute(repository: Repository) {
    // Get all resources from changes group
    const changes = repository.changes.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    if (changes.length === 0) {
      window.showInformationMessage("No changes to commit");
      return;
    }

    const filePaths = changes.map(state => state.resourceUri.fsPath);

    // Handle renamed files and parent directories
    changes.forEach(state => {
      if (state.type === Status.ADDED && state.renameResourceUri) {
        filePaths.push(state.renameResourceUri.fsPath);
      }

      let dir = path.dirname(state.resourceUri.fsPath);
      let parent = repository.getResourceFromFile(dir);

      while (parent) {
        if (parent.type === Status.ADDED) {
          filePaths.push(dir);
        }
        dir = path.dirname(dir);
        parent = repository.getResourceFromFile(dir);
      }
    });

    // Get config options
    const useQuickPick = configuration.get<boolean>(
      "commit.useQuickPick",
      true
    );
    const conventionalCommits = configuration.get<boolean>(
      "commit.conventionalCommits",
      true
    );
    const updateBeforeCommit = configuration.get<boolean>(
      "commit.updateBeforeCommit",
      true
    );

    let message: string | undefined;

    if (useQuickPick) {
      // New flow: QuickPick multi-step
      const result = await this.commitFlowService.runCommitFlow(
        repository,
        filePaths,
        {
          conventionalCommits,
          updateBeforeCommit
        }
      );

      if (result.cancelled) {
        return;
      }
      message = result.message;
    } else {
      // Legacy flow: Webview
      message = await inputCommitMessage(
        repository.inputBox.value,
        true,
        filePaths
      );
    }

    if (message === undefined) {
      return;
    }

    await this.handleRepositoryOperation(async () => {
      const result = await repository.commitFiles(message!, filePaths);
      window.showInformationMessage(result);
      repository.inputBox.value = "";
    }, "Unable to commit");
  }
}
