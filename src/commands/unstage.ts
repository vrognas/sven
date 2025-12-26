// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { unstageWithRestoreOptimistic } from "../helpers/stageHelper";
import { Command } from "./command";

export class Unstage extends Command {
  constructor() {
    super("sven.unstage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    await this.runByRepository(
      this.toUris(selection),
      async (repository, resources) => {
        const paths = this.toPaths(resources);
        await this.handleRepositoryOperation(
          async () => unstageWithRestoreOptimistic(repository, paths),
          "Unable to unstage files"
        );
      }
    );
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

      await this.runByRepository(
        this.toUris(selection),
        async (repository, resources) => {
          const paths = this.toPaths(resources);
          await this.handleRepositoryOperation(
            async () => unstageWithRestoreOptimistic(repository, paths),
            "Unable to unstage files"
          );
        }
      );
    } else {
      // Unstage all staged files across all repositories
      await this.runForAllInGroup("staged", async (repository, paths) => {
        await this.handleRepositoryOperation(
          async () => unstageWithRestoreOptimistic(repository, paths),
          "Unable to unstage files"
        );
      });
    }
  }
}
