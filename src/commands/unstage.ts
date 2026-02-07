// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { unstageWithRestoreOptimistic } from "../helpers/stageHelper";
import { Command } from "./command";

abstract class BaseUnstageCommand extends Command {
  protected async unstageSelection(
    resourceStates: SourceControlResourceState[]
  ): Promise<boolean> {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return false;

    await this.runBySelectionPaths(selection, async (repository, paths) => {
      await this.handleRepositoryOperation(
        async () => unstageWithRestoreOptimistic(repository, paths),
        "Unable to unstage files"
      );
    });

    return true;
  }
}

export class Unstage extends BaseUnstageCommand {
  constructor() {
    super("sven.unstage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    await this.unstageSelection(resourceStates);
  }
}

export class UnstageAll extends BaseUnstageCommand {
  constructor() {
    super("sven.unstageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    if (this.hasExplicitResourceSelection(resourceStates)) {
      await this.unstageSelection(resourceStates);
      return;
    }

    await this.runForAllInGroup("staged", async (repository, paths) => {
      await this.handleRepositoryOperation(
        async () => unstageWithRestoreOptimistic(repository, paths),
        "Unable to unstage files"
      );
    });
  }
}
