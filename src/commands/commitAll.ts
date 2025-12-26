// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import {
  buildCommitPaths,
  executeCommit,
  runCommitMessageFlow
} from "../helpers/commitHelper";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { Command } from "./command";

/**
 * Commit all staged files (or offer to stage all if none staged).
 * Enforces "stage before commit" workflow.
 */
export class CommitAll extends Command {
  constructor() {
    super("sven.commitAll", { repository: true });
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

    // Run commit flow (config + UI)
    const flowResult = await runCommitMessageFlow(
      repository,
      displayPaths,
      renameMap
    );
    if (
      flowResult.cancelled ||
      !flowResult.message ||
      !flowResult.commitPaths
    ) {
      return;
    }

    await this.handleRepositoryOperation(
      () =>
        executeCommit(repository, flowResult.message!, flowResult.commitPaths!),
      "Unable to commit"
    );
  }
}
