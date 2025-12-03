// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Command } from "./command";

export class Unstage extends Command {
  constructor() {
    super("svn.unstage");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    const uris = selection.map(resource => resource.resourceUri);

    await this.runByRepository(uris, async (repository, resources) => {
      repository.staging.unstageAll(resources);
    });
  }
}

export class UnstageAll extends Command {
  constructor() {
    super("svn.unstageAll");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStates(resourceStates);

    // If called with resources, unstage those; otherwise unstage all
    if (selection.length > 0) {
      const uris = selection.map(resource => resource.resourceUri);
      await this.runByRepository(uris, async (repository, resources) => {
        repository.staging.unstageAll(resources);
      });
    } else {
      // Unstage all in all repositories
      await this.runByRepository([], async repository => {
        repository.staging.unstageAll();
      });
    }
  }
}
