// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { configuration } from "../helpers/configuration";
import { buildCommitPaths, expandCommitPaths } from "../helpers/commitHelper";
import { inputCommitMessage } from "../messages";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { CommitFlowService } from "../services/commitFlowService";
import { Command } from "./command";

/**
 * Commit only staged files.
 * Uses QuickPick flow or legacy webview based on config.
 */
export class CommitStaged extends Command {
  private commitFlowService: CommitFlowService;

  constructor() {
    super("sven.commitStaged", { repository: true });
    this.commitFlowService = new CommitFlowService();
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

    // Build display paths and rename map using helper
    const { displayPaths, renameMap } = buildCommitPaths(
      stagedResources,
      repository
    );

    // Get config options
    const useQuickPick = configuration.get<boolean>(
      "commit.useQuickPick",
      true
    );
    const conventionalCommits = configuration.get<boolean>(
      "commit.conventionalCommits",
      true
    );
    const autoUpdate = configuration.get<string>("commit.autoUpdate", "both");
    const updateBeforeCommit = autoUpdate === "both" || autoUpdate === "before";

    let message: string | undefined;
    let selectedPaths: string[] | undefined;

    if (useQuickPick) {
      // QuickPick flow (skips file selection since user already staged)
      const result = await this.commitFlowService.runCommitFlow(
        repository,
        displayPaths,
        {
          conventionalCommits,
          updateBeforeCommit
        }
      );

      if (result.cancelled) {
        return;
      }
      message = result.message;
      selectedPaths = result.selectedFiles;
    } else {
      // Legacy flow
      message = await inputCommitMessage(
        repository.inputBox.value,
        true,
        displayPaths
      );
      selectedPaths = displayPaths;
    }

    if (message === undefined || !selectedPaths) {
      return;
    }

    // Expand paths to include old rename paths for SVN commit
    const commitPaths = expandCommitPaths(selectedPaths, renameMap);

    await this.handleRepositoryOperation(async () => {
      const result = await repository.commitFiles(message!, commitPaths);
      window.showInformationMessage(result);
      repository.inputBox.value = "";
      // Note: SVN automatically removes files from changelists after commit
      // No need to call removeChangelist - it's handled by SVN
      // Clear original changelist tracking for committed files
      repository.staging.clearOriginalChangelists(commitPaths);
    }, "Unable to commit");
  }
}
