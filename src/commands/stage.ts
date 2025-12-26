// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Repository } from "../repository";
import {
  getAffectedChangelists,
  buildOriginalChangelistMap,
  warnAboutChangelists,
  saveOriginalChangelists
} from "../helpers/stageHelper";
import { Command } from "./command";

export class Stage extends Command {
  constructor() {
    super("sven.stage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    // Warn if files are in other changelists
    const affected = getAffectedChangelists(selection);
    if (!(await warnAboutChangelists(affected))) return;

    // Build map of original changelists before staging
    const originalChangelists = buildOriginalChangelistMap(selection);

    await this.runByRepository(
      this.toUris(selection),
      async (repository, resources) => {
        const paths = this.toPaths(resources);
        saveOriginalChangelists(repository, paths, originalChangelists);

        // Use optimistic update - skips full status refresh
        await this.handleRepositoryOperation(
          async () => repository.stageOptimistic(paths),
          "Unable to stage files"
        );
      }
    );
  }
}

/**
 * Stage resources including all children of directories.
 * For folders, stages the folder plus all changed files within.
 */
export class StageWithChildren extends Command {
  constructor() {
    super("sven.stageWithChildren");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    // Warn if files are in other changelists
    const affected = getAffectedChangelists(selection);
    if (!(await warnAboutChangelists(affected))) return;

    // Build map of original changelists before staging
    const originalChangelists = buildOriginalChangelistMap(selection);

    await this.runByRepository(
      this.toUris(selection),
      async (repository, resources) => {
        const paths = this.toPaths(resources);
        saveOriginalChangelists(repository, paths, originalChangelists);

        // Use optimistic update with children - expands directories
        await this.handleRepositoryOperation(
          async () => repository.stageOptimisticWithChildren(paths),
          "Unable to stage files"
        );
      }
    );
  }
}

export class StageAll extends Command {
  constructor() {
    super("sven.stageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    // Check if called with explicit selection vs button on group header
    const hasExplicitSelection =
      resourceStates.length > 0 &&
      resourceStates[0]?.resourceUri instanceof (await import("vscode")).Uri;

    if (hasExplicitSelection) {
      // Stage selected resources
      const selection = await this.getResourceStates(resourceStates);
      if (selection.length === 0) return;

      // Warn if files are in other changelists
      const affected = getAffectedChangelists(selection);
      if (!(await warnAboutChangelists(affected))) return;

      // Build map of original changelists before staging
      const originalChangelists = buildOriginalChangelistMap(selection);

      await this.runByRepository(
        this.toUris(selection),
        async (repository, resources) => {
          const paths = this.toPaths(resources);
          saveOriginalChangelists(repository, paths, originalChangelists);

          // Use optimistic update - skips full status refresh
          await this.handleRepositoryOperation(
            async () => repository.stageOptimistic(paths),
            "Unable to stage files"
          );
        }
      );
    } else {
      // Stage all changes in all repositories
      await this.runForAllChanges(async (repository, paths) => {
        await this.handleRepositoryOperation(
          async () => repository.stageOptimistic(paths),
          "Unable to stage files"
        );
      });
    }
  }

  /**
   * Run operation for all changes across all repositories.
   */
  private async runForAllChanges(
    fn: (repository: Repository, paths: string[]) => Promise<void>
  ): Promise<void> {
    const { commands } = await import("vscode");

    const sourceControlManager = (await commands.executeCommand(
      "sven.getSourceControlManager",
      ""
    )) as { repositories: Repository[] };

    for (const repository of sourceControlManager.repositories) {
      const changes = repository.changes.resourceStates;
      const paths = changes.map(r => r.resourceUri.fsPath);
      if (paths.length > 0) {
        await fn(repository, paths);
      }
    }
  }
}
