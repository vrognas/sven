// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

"use strict";

import { Uri } from "vscode";
import { Command } from "../command";
import {
  blameStateManager,
  getBlameTargetUri
} from "../../blame/blameStateManager";

/**
 * Command shown when blame is disabled (eye-closed icon)
 * Clicking enables blame for the file
 */
export class EnableBlame extends Command {
  constructor() {
    super("sven.blame.enableBlame");
  }

  async execute(uri?: Uri): Promise<void> {
    const target = getBlameTargetUri(uri);
    if (!target) return;
    blameStateManager.setBlameEnabled(target, true);
  }
}
