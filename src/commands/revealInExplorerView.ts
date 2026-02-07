// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Reveal In Explorer View Command
 *
 * Reveals a file from the SCM changes view in VS Code's Explorer sidebar
 */

import { commands, Uri } from "vscode";
import { BaseRevealInExplorerCommand } from "./baseRevealInExplorerCommand";

export class RevealInExplorerView extends BaseRevealInExplorerCommand {
  constructor() {
    super("sven.revealInExplorerView");
  }

  protected errorMessage = "Unable to reveal file in Explorer view";

  protected async reveal(uri: Uri): Promise<void> {
    // Use VS Code's built-in command to reveal in Explorer sidebar
    await commands.executeCommand("revealInExplorer", uri);
  }
}
