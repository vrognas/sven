// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Reveal In Explorer Command
 *
 * Reveals a file from the SCM changes view in the file explorer
 */

import { Uri } from "vscode";
import { revealFileInOS } from "../util/fileOperations";
import { BaseRevealInExplorerCommand } from "./baseRevealInExplorerCommand";

export class RevealInExplorer extends BaseRevealInExplorerCommand {
  constructor() {
    super("sven.revealInExplorer");
  }

  protected errorMessage = "Unable to reveal file in explorer";

  protected async reveal(uri: Uri): Promise<void> {
    await revealFileInOS(uri);
  }
}
