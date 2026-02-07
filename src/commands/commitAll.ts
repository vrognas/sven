// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Repository } from "../repository";
import { BaseCommitPromptCommand } from "./baseCommitPromptCommand";

/**
 * Commit all staged files (or offer to stage all if none staged).
 * Enforces "stage before commit" workflow.
 */
export class CommitAll extends BaseCommitPromptCommand {
  constructor() {
    super("sven.commitAll", { repository: true });
  }

  public async execute(repository: Repository) {
    await this.commitWithPrompt(repository);
  }
}
