// Copyright (c) 2017-2020 Christopher Johnston
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
 * Commit all staged files (or offer to stage all if none staged).
 * Enforces "stage before commit" workflow.
 */
export class CommitAll extends Command {
  private commitFlowService: CommitFlowService;

  constructor() {
    super("sven.commitAll", { repository: true });
    this.commitFlowService = new CommitFlowService();
  }

  public async execute(repository: Repository) {
    // Get staged and changed files
    const staged = repository.staged.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    const changes = repository.changes.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    // Require files to be staged before commit
    if (staged.length === 0) {
      if (changes.length === 0) {
        window.showInformationMessage("No changes to commit");
        return;
      }

      // Offer to stage all and commit
      const choice = await window.showInformationMessage(
        `${changes.length} file(s) not staged. Stage all and commit?`,
        "Stage All",
        "Cancel"
      );

      if (choice !== "Stage All") {
        return;
      }

      // Stage all changes
      const changePaths = changes.map(r => r.resourceUri.fsPath);
      await repository.stageOptimistic(changePaths);
    }

    // Get staged files (possibly just auto-staged)
    const resourcesToCommit = repository.staged.resourceStates.filter(
      s => s instanceof Resource
    ) as Resource[];

    // Build display paths and rename map using helper
    const { displayPaths, renameMap } = buildCommitPaths(
      resourcesToCommit,
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
      message = await inputCommitMessage(
        repository.inputBox.value,
        true,
        displayPaths
      );
      selectedPaths = displayPaths; // All paths when not using QuickPick
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
      repository.staging.clearOriginalChangelists(commitPaths);
    }, "Unable to commit");
  }
}
