// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import {
  prepareStaging,
  saveOriginalChangelists
} from "../helpers/stageHelper";
import { Repository } from "../repository";
import { Command } from "./command";

abstract class BaseStageCommand extends Command {
  protected async stageSelection(
    resourceStates: SourceControlResourceState[],
    stageOperation: (repository: Repository, paths: string[]) => Promise<void>
  ): Promise<boolean> {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return false;

    const originalChangelists = await prepareStaging(selection);
    if (!originalChangelists) return false;

    await this.runBySelectionPaths(selection, async (repository, paths) => {
      saveOriginalChangelists(repository, paths, originalChangelists);

      await this.handleRepositoryOperation(
        async () => stageOperation(repository, paths),
        "Unable to stage files"
      );
    });

    return true;
  }

  protected async stageAllChanges(): Promise<void> {
    await this.runForAllInGroup("changes", async (repository, paths) => {
      await this.handleRepositoryOperation(
        async () => repository.stageOptimistic(paths),
        "Unable to stage files"
      );
    });
  }
}

export class Stage extends BaseStageCommand {
  constructor() {
    super("sven.stage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    await this.stageSelection(resourceStates, (repository, paths) =>
      repository.stageOptimistic(paths)
    );
  }
}

/**
 * Stage resources including all children of directories.
 * For folders, stages the folder plus all changed files within.
 */
export class StageWithChildren extends BaseStageCommand {
  constructor() {
    super("sven.stageWithChildren");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    await this.stageSelection(resourceStates, (repository, paths) =>
      repository.stageOptimisticWithChildren(paths)
    );
  }
}

export class StageAll extends BaseStageCommand {
  constructor() {
    super("sven.stageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    if (this.hasExplicitResourceSelection(resourceStates)) {
      await this.stageSelection(resourceStates, (repository, paths) =>
        repository.stageOptimistic(paths)
      );
      return;
    }

    await this.stageAllChanges();
  }
}
