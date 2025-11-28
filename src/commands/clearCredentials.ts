// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { Repository } from "../repository";
import { Command } from "./command";

export class ClearCredentials extends Command {
  constructor() {
    super("svn.clearCredentials", { repository: true });
  }

  public async execute(repository: Repository) {
    await repository.clearCredentials();
    window.showInformationMessage(
      "SVN credentials cleared. You will be prompted on next operation."
    );
  }
}
