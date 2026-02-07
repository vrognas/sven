// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Command } from "./command";

export class AddToIgnoreSCM extends Command {
  constructor() {
    super("sven.addToIgnoreSCM");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    await this.withSelectedResourceUris(resourceStates, async uris => {
      await this.addToIgnore(uris);
    });
  }
}
