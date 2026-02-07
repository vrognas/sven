// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Command } from "./command";

export class Patch extends Command {
  constructor() {
    super("sven.patch");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    await this.withSelectedResourceUris(resourceStates, async uris => {
      await this.runByRepositoryPaths(uris, async (repository, files) => {
        const content = await repository.patch(files);
        await this.showDiffPath(repository, content);
      });
    });
  }
}
