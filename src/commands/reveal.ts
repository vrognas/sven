// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { commands, SourceControlResourceState, Uri, window } from "vscode";
import { revealFileInOS } from "../util/fileOperations";
import { Command } from "./command";

abstract class BaseRevealCommand extends Command {
  protected abstract errorMessage: string;
  protected abstract reveal(uri: Uri): Promise<void>;

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const uri = resourceStates[0]?.resourceUri;
    if (!uri) {
      return;
    }

    try {
      await this.reveal(uri);
    } catch {
      window.showErrorMessage(this.errorMessage);
    }
  }
}

export class RevealInExplorer extends BaseRevealCommand {
  constructor() {
    super("sven.revealInExplorer");
  }

  protected errorMessage = "Unable to reveal file in explorer";

  protected async reveal(uri: Uri): Promise<void> {
    await revealFileInOS(uri);
  }
}

export class RevealInExplorerView extends BaseRevealCommand {
  constructor() {
    super("sven.revealInExplorerView");
  }

  protected errorMessage = "Unable to reveal file in Explorer view";

  protected async reveal(uri: Uri): Promise<void> {
    await commands.executeCommand("revealInExplorer", uri);
  }
}
