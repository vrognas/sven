// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import {
  buildCommitPaths,
  ensureStagedOrOffer,
  executeCommit,
  runCommitMessageFlow
} from "../helpers/commitHelper";
import { Repository } from "../repository";
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
    const staged = this.filterResources(repository.staged.resourceStates);
    const changes = this.filterResources(repository.changes.resourceStates);

    const proceed = await ensureStagedOrOffer(
      staged,
      changes,
      repository,
      this.resourcesToPaths.bind(this)
    );
    if (!proceed) return;

    // Get staged files (possibly just auto-staged)
    const resourcesToCommit = this.filterResources(
      repository.staged.resourceStates
    );

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
