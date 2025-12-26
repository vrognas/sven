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
 * Commit only staged files.
 * Uses QuickPick flow or legacy webview based on config.
 */
export class CommitStaged extends Command {
  constructor() {
    super("sven.commitStaged", { repository: true });
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
