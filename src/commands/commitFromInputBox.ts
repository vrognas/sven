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
 * Commit from SCM input box (Ctrl+Enter).
 * Requires files to be staged/selected before commit.
 * If no files staged, offers to stage all and proceed.
 */
export class CommitFromInputBox extends Command {
  constructor() {
    super("sven.commitFromInputBox", { repository: true });
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

    const { displayPaths, renameMap } = buildCommitPaths(
      resourcesToCommit,
      repository
    );

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
