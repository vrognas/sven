// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { commands, window, workspace } from "vscode";
import { Command } from "./command";
import { logError } from "../util/errorLogger";

/**
 * Recommended settings profiles for different use cases.
 */
const PROFILES = {
  datascience: {
    name: "Data Science (Recommended)",
    description: "Optimized for large repos with binary files",
    settings: {
      "sven.autorefresh": true,
      "sven.blame.enabled": true,
      "sven.blame.autoBlame": false, // Don't auto-blame (slow on large files)
      "sven.blame.largeFileLimit": 1000, // Warn earlier for large files
      "sven.remoteChanges.checkFrequency": 600, // 10 min (less frequent)
      "sven.update.ignoreExternals": true,
      "sven.sourceControl.countUnversioned": false, // Faster status
      "sven.diff.withHead": false, // Use BASE (faster, no network)
      "sven.performance.maxXmlTags": 500000
    }
  },
  minimal: {
    name: "Minimal",
    description: "Essential features only, maximum performance",
    settings: {
      "sven.autorefresh": true,
      "sven.blame.enabled": false,
      "sven.remoteChanges.checkFrequency": 0, // Disabled
      "sven.update.ignoreExternals": true,
      "sven.sourceControl.countUnversioned": false,
      "sven.sourceControl.hideUnversioned": true,
      "sven.diff.withHead": false
    }
  },
  full: {
    name: "Full Features",
    description: "All features enabled (may be slower)",
    settings: {
      "sven.autorefresh": true,
      "sven.blame.enabled": true,
      "sven.blame.autoBlame": true,
      "sven.remoteChanges.checkFrequency": 300, // 5 min
      "sven.update.ignoreExternals": false,
      "sven.sourceControl.countUnversioned": true,
      "sven.diff.withHead": true
    }
  }
};

type ProfileKey = keyof typeof PROFILES;

export class ApplyRecommendedSettings extends Command {
  constructor() {
    super("sven.applyRecommendedSettings");
  }

  public async execute(): Promise<void> {
    // Show profile picker
    const items = Object.entries(PROFILES).map(([key, profile]) => ({
      label: profile.name,
      description: profile.description,
      key: key as ProfileKey
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: "Select a settings profile",
      title: "SVN: Apply Recommended Settings"
    });

    if (!selected) {
      return; // User cancelled
    }

    const profile = PROFILES[selected.key];
    const config = workspace.getConfiguration();

    // Apply settings
    let appliedCount = 0;
    for (const [key, value] of Object.entries(profile.settings)) {
      try {
        await config.update(key, value, true); // true = global settings
        appliedCount++;
      } catch (err) {
        // Log but continue
        logError(`Failed to set ${key}`, err);
      }
    }

    // Show confirmation
    const reloadAction = "Reload Window";
    const result = await window.showInformationMessage(
      `Applied "${profile.name}" profile (${appliedCount} settings). Reload to apply changes.`,
      reloadAction
    );

    if (result === reloadAction) {
      await commands.executeCommand("workbench.action.reloadWindow");
    }
  }
}
