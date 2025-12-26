// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Repository } from "../repository";
import { unstageWithRestoreOptimistic } from "../helpers/stageHelper";
import { Command } from "./command";

export class Unstage extends Command {
  constructor() {
    super("sven.unstage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    const uris = selection.map(resource => resource.resourceUri);

    await this.runByRepository(uris, async (repository, resources) => {
      const paths = resources.map(r => r.fsPath);
      await this.handleRepositoryOperation(
        async () => unstageWithRestoreOptimistic(repository, paths),
        "Unable to unstage files"
      );
    });
  }
}

export class UnstageAll extends Command {
  constructor() {
    super("sven.unstageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    // Check if called with explicit selection vs button on group header
    const hasExplicitSelection =
      resourceStates.length > 0 &&
      resourceStates[0]?.resourceUri instanceof (await import("vscode")).Uri;

    if (hasExplicitSelection) {
      // Unstage selected resources
      const selection = await this.getResourceStates(resourceStates);
      if (selection.length === 0) return;

      const uris = selection.map(resource => resource.resourceUri);
      await this.runByRepository(uris, async (repository, resources) => {
        const paths = resources.map(r => r.fsPath);
        await this.handleRepositoryOperation(
          async () => unstageWithRestoreOptimistic(repository, paths),
          "Unable to unstage files"
        );
      });
    } else {
      // Unstage all staged files across all repositories
      await this.runForAllStaged(async (repository, paths) => {
        await this.handleRepositoryOperation(
          async () => unstageWithRestoreOptimistic(repository, paths),
          "Unable to unstage files"
        );
      });
    }
  }

  /**
   * Run operation for all staged files across all repositories.
   */
  private async runForAllStaged(
    fn: (repository: Repository, paths: string[]) => Promise<void>
  ): Promise<void> {
    const { commands } = await import("vscode");

    const sourceControlManager = (await commands.executeCommand(
      "sven.getSourceControlManager",
      ""
    )) as { repositories: Repository[] };

    for (const repository of sourceControlManager.repositories) {
      const staged = repository.staged.resourceStates;
      const paths = staged.map(r => r.resourceUri.fsPath);
      if (paths.length > 0) {
        await fn(repository, paths);
      }
    }
  }
}
