// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Repository } from "../repository";
import { BaseStagedCommitCommand } from "./baseStagedCommitCommand";

/**
 * Commit only staged files.
 * Uses QuickPick flow or legacy webview based on config.
 */
export class CommitStaged extends BaseStagedCommitCommand {
  constructor() {
    super("sven.commitStaged", { repository: true });
  }

  public async execute(repository: Repository) {
    const context = this.prepareStagedCommit(repository);
    if (!context) {
      return;
    }
    const { displayPaths, renameMap } = context;
    await this.commitWithMessageFlow(repository, displayPaths, renameMap);
  }
}
