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
 * If staged files exist, commits only staged (Git-like behavior).
 * Otherwise commits all changes.
 */
export class CommitFromInputBox extends Command {
  private commitFlowService: CommitFlowService;

  constructor() {
    super("svn.commitFromInputBox", { repository: true });
    this.commitFlowService = new CommitFlowService();
  }

  public async execute(repository: Repository) {
    // Check for staged files first - if present, commit only staged
    const staged = repository.staged.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    const changes = repository.changes.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    // Determine what to commit: staged takes priority
    const resourcesToCommit = staged.length > 0 ? staged : changes;
    const isCommittingStaged = staged.length > 0;

    if (resourcesToCommit.length === 0) {
      window.showInformationMessage("No changes to commit");
      return;
    }

    const filePaths = resourcesToCommit.map(state => state.resourceUri.fsPath);

    // Handle renamed files and parent directories
    resourcesToCommit.forEach(state => {
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
      // Clear original changelist tracking if we committed staged files
      if (isCommittingStaged) {
        repository.staging.clearOriginalChangelists(filePaths);
      }
    }, "Unable to commit");
  }
}
