"use strict";

import { Uri, window } from "vscode";
import { Command } from "../command";
import { blameStateManager } from "../../blame/blameStateManager";

/**
 * Command shown when blame is disabled (eye-closed icon)
 * Clicking enables blame for the file
 */
export class EnableBlame extends Command {
  constructor() {
    super("svn.blame.enableBlame");
  }

  async execute(uri?: Uri): Promise<void> {
    if (!uri) {
      const editor = window.activeTextEditor;
      if (!editor) {
        return;
      }
      uri = editor.document.uri;
    }

    // Enable blame
    blameStateManager.setBlameEnabled(uri, true);
  }
}
