// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { getPatchChangelist } from "../changelistItems";
import { Repository } from "../repository";
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

export class PatchAll extends Command {
  constructor() {
    super("sven.patchAll", { repository: true });
  }

  public async execute(repository: Repository) {
    const content = await repository.patch([]);
    await this.showDiffPath(repository, content);
  }
}

export class PatchChangeList extends Command {
  constructor() {
    super("sven.patchChangeList", { repository: true });
  }

  public async execute(repository: Repository) {
    const changelistName = await getPatchChangelist(repository);

    if (!changelistName) {
      return;
    }

    const content = await repository.patchChangelist(changelistName);
    await this.showDiffPath(repository, content);
  }
}
