// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import {
  buildCommitPaths,
  executeCommit,
  requireStaged,
  runCommitMessageFlow
} from "../helpers/commitHelper";
import { Repository } from "../repository";
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
    const stagedResources = this.filterResources(
      repository.staged.resourceStates
    );

    if (!requireStaged(stagedResources)) return;

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
