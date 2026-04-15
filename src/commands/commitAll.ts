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

/**
 * Commit from SCM input box (Ctrl+Enter).
 * Same workflow as CommitAll — requires staged/selected files.
 */
export class CommitFromInputBox extends BaseCommitPromptCommand {
  constructor() {
    super("sven.commitFromInputBox", { repository: true });
  }

  public async execute(repository: Repository) {
    await this.commitWithPrompt(repository);
  }
}
