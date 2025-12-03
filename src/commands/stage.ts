// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { STAGING_CHANGELIST } from "../services/stagingService";
import { Command } from "./command";

export class Stage extends Command {
  constructor() {
    super("svn.stage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    const uris = selection.map(resource => resource.resourceUri);

    await this.runByRepository(uris, async (repository, resources) => {
      const paths = resources.map(r => r.fsPath);
      await this.handleRepositoryOperation(
        async () => repository.addChangelist(paths, STAGING_CHANGELIST),
        "Unable to stage files"
      );
    });
  }
}

export class StageAll extends Command {
  constructor() {
    super("svn.stageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStates(resourceStates);

    // If called with resources, stage those; otherwise stage all changes
    if (selection.length > 0) {
      const uris = selection.map(resource => resource.resourceUri);
      await this.runByRepository(uris, async (repository, resources) => {
        const paths = resources.map(r => r.fsPath);
        await this.handleRepositoryOperation(
          async () => repository.addChangelist(paths, STAGING_CHANGELIST),
          "Unable to stage files"
        );
      });
    } else {
      // Stage all changes in all repositories
      await this.runByRepository([], async repository => {
        const changes = repository.changes.resourceStates;
        const paths = changes.map(r => r.resourceUri.fsPath);
        if (paths.length > 0) {
          await this.handleRepositoryOperation(
            async () => repository.addChangelist(paths, STAGING_CHANGELIST),
            "Unable to stage files"
          );
        }
      });
    }
  }
}
