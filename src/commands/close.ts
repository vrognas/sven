// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { commands } from "vscode";
import { SourceControlManager } from "../source_control_manager";
import { Repository } from "../repository";
import { Command } from "./command";

export class Close extends Command {
  constructor() {
    super("sven.close", { repository: true });
  }

  public async execute(repository: Repository) {
    const sourceControlManager = (await commands.executeCommand(
      "sven.getSourceControlManager",
      ""
    )) as SourceControlManager;

    sourceControlManager.close(repository);
  }
}
