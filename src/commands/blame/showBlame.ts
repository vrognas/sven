// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

"use strict";

import { Uri, window } from "vscode";
import { Command } from "../command";
import {
  blameStateManager,
  getBlameTargetUri
} from "../../blame/blameStateManager";

export class ShowBlame extends Command {
  constructor() {
    super("sven.blame.showBlame");
  }

  async execute(uri?: Uri): Promise<void> {
    const target = getBlameTargetUri(uri);
    if (!target) return;

    blameStateManager.setBlameEnabled(target, true);
    window.showInformationMessage(`SVN Blame enabled for ${target.fsPath}`);
  }
}
