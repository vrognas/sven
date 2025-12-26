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
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    const uris = this.toUris(this.filterResources(selection));

    return this.addToIgnore(uris);
  }
}
