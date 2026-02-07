// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ensureStagedOrOffer, requireStaged } from "../helpers/commitHelper";
import { Repository } from "../repository";
import { BaseStagedCommitCommand } from "./baseStagedCommitCommand";

export abstract class BaseCommitPromptCommand extends BaseStagedCommitCommand {
  protected async commitWithPrompt(repository: Repository): Promise<void> {
    const staged = this.filterResources(repository.staged.resourceStates);
    const changes = this.filterResources(repository.changes.resourceStates);

    const proceed = await ensureStagedOrOffer(
      staged,
      changes,
      repository,
      this.resourcesToPaths.bind(this)
    );
    if (!proceed) {
      return;
    }

    const stagedResources = this.filterResources(
      repository.staged.resourceStates
    );
    if (!requireStaged(stagedResources)) {
      return;
    }

    const { displayPaths, renameMap } = this.buildStagedCommitContext(
      repository,
      stagedResources
    );

    await this.commitWithMessageFlow(repository, displayPaths, renameMap);
  }
}
