// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { QuickPickItem, SourceControlResourceState, Uri, window } from "vscode";
import { Command } from "./command";
import * as fs from "../fs";

type EolStyleValue = "native" | "LF" | "CRLF" | "CR";

interface EolStyleQuickPickItem extends QuickPickItem {
  value: EolStyleValue;
}

/**
 * Set svn:eol-style property on files.
 * Controls line-ending normalization across platforms.
 */
export class SetEolStyle extends Command {
  constructor() {
    super("sven.setEolStyle");
  }

  public async execute(...args: (SourceControlResourceState | Uri)[]) {
    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        await this.setEolStyleOnPaths(repository, paths);
      },
      "Unable to set eol-style property"
    );
  }

  private async setEolStyleOnPaths(
    repository: Parameters<Parameters<typeof this.executeOnResources>[1]>[0],
    paths: string[]
  ): Promise<void> {
    // Check if any path is a directory
    let hasDirectory = false;
    for (const path of paths) {
      try {
        const stat = await fs.stat(path);
        if (stat.isDirectory()) {
          hasDirectory = true;
          break;
        }
      } catch {
        // Ignore stat errors
      }
    }

    // Build QuickPick items with descriptions
    const items: EolStyleQuickPickItem[] = [
      {
        label: "native",
        value: "native",
        description: "Convert to platform EOL (CRLF Windows, LF Unix)",
        detail: "Most common - recommended for text files"
      },
      {
        label: "LF",
        value: "LF",
        description: "Force Unix line endings",
        detail: "Recommended for shell scripts"
      },
      {
        label: "CRLF",
        value: "CRLF",
        description: "Force Windows line endings",
        detail: "For Windows-specific files like .bat"
      },
      {
        label: "CR",
        value: "CR",
        description: "Force old Mac line endings",
        detail: "Rarely used - legacy systems only"
      }
    ];

    const selected = await window.showQuickPick(items, {
      placeHolder: "Select EOL style",
      title: hasDirectory
        ? `Set EOL Style on ${paths.length} item(s)`
        : `Set EOL Style on ${paths.length} file(s)`
    });

    if (!selected) return;

    // Ask about recursive if any directories selected
    let recursive = false;
    if (hasDirectory) {
      const answer = await window.showQuickPick(
        [
          {
            label: "Yes",
            description: "Apply to all files in selected directories"
          },
          { label: "No", description: "Apply only to directories themselves" }
        ],
        {
          placeHolder: "Apply recursively to directory contents?",
          title: "Recursive Application"
        }
      );
      if (!answer) return;
      recursive = answer.label === "Yes";
    }

    await this.executeWithFeedback(
      paths,
      path => repository.setEolStyle(path, selected.value, recursive),
      count => `Set svn:eol-style=${selected.value} on ${count} item(s)`,
      "Failed to set eol-style"
    );
  }
}

/**
 * Remove svn:eol-style property from files.
 */
export class RemoveEolStyle extends Command {
  constructor() {
    super("sven.removeEolStyle");
  }

  public async execute(...args: (SourceControlResourceState | Uri)[]) {
    await this.executeOnUrisOrResources(
      args,
      async (repository, paths) => {
        await this.removeEolStyleFromPaths(repository, paths);
      },
      "Unable to remove eol-style property"
    );
  }

  private async removeEolStyleFromPaths(
    repository: Parameters<Parameters<typeof this.executeOnResources>[1]>[0],
    paths: string[]
  ): Promise<void> {
    // Check if any path is a directory
    let hasDirectory = false;
    for (const path of paths) {
      try {
        const stat = await fs.stat(path);
        if (stat.isDirectory()) {
          hasDirectory = true;
          break;
        }
      } catch {
        // Ignore stat errors
      }
    }

    // Ask about recursive if any directories selected
    let recursive = false;
    if (hasDirectory) {
      const answer = await window.showQuickPick(
        [
          {
            label: "Yes",
            description: "Remove from all files in selected directories"
          },
          {
            label: "No",
            description: "Remove only from directories themselves"
          }
        ],
        {
          placeHolder: "Remove recursively from directory contents?",
          title: "Recursive Removal"
        }
      );
      if (!answer) return;
      recursive = answer.label === "Yes";
    }

    await this.executeWithFeedback(
      paths,
      path => repository.removeEolStyle(path, recursive),
      "Removed svn:eol-style from {count} item(s)",
      "Failed to remove eol-style",
      { ignoreErrors: true }
    );
  }
}
