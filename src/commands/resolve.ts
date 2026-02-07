// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { pickConflictOption } from "../conflictItems";
import { Command } from "./command";

export class Resolve extends Command {
  constructor() {
    super("sven.resolve");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;

    const choice = await pickConflictOption("Select conflict option");

    if (!choice) {
      return;
    }

    await this.executeOnResources(
      selection,
      async (repository, paths) => {
        await repository.resolve(paths, choice.label);
      },
      "Unable to resolve conflicts"
    );
  }
}
