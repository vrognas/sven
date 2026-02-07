// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Repository } from "../repository";
import { BaseCommitPromptCommand } from "./baseCommitPromptCommand";

/**
 * Commit from SCM input box (Ctrl+Enter).
 * Requires files to be staged/selected before commit.
 * If no files staged, offers to stage all and proceed.
 */
export class CommitFromInputBox extends BaseCommitPromptCommand {
  constructor() {
    super("sven.commitFromInputBox", { repository: true });
  }

  public async execute(repository: Repository) {
    await this.commitWithPrompt(repository);
  }
}
