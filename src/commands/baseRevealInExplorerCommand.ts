// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState, Uri, window } from "vscode";
import { Command } from "./command";

export abstract class BaseRevealInExplorerCommand extends Command {
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
