// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { QuickPickItem, SourceControlResourceState, Uri, window } from "vscode";
import { BasePropertyCommand } from "./basePropertyCommand";
import { askRecursive, hasAnyDirectory } from "../helpers/propertyHelper";
import type { Repository } from "../repository";

type EolStyleValue = "native" | "LF" | "CRLF" | "CR";

interface EolStyleQuickPickItem extends QuickPickItem {
  value: EolStyleValue;
}

/**
 * Set svn:eol-style property on files.
 * Controls line-ending normalization across platforms.
 */
export class SetEolStyle extends BasePropertyCommand {
  constructor() {
    super("sven.setEolStyle");
  }

  public async execute(...args: (SourceControlResourceState | Uri)[]) {
    await this.executePropertyOperation(
      args,
      (repository, paths) => this.setEolStyleOnPaths(repository, paths),
      "Unable to set eol-style property"
    );
  }

  private async setEolStyleOnPaths(
    repository: Repository,
    paths: string[]
  ): Promise<void> {
    // Check for directories (for title and recursive prompt)
    const hasDirectory = await hasAnyDirectory(paths);

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
      const answer = await askRecursive("Apply");
      if (answer === undefined) return;
      recursive = answer;
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
export class RemoveEolStyle extends BasePropertyCommand {
  constructor() {
    super("sven.removeEolStyle");
  }

  public async execute(...args: (SourceControlResourceState | Uri)[]) {
    await this.executePropertyOperation(
      args,
      (repository, paths) => this.removeEolStyleFromPaths(repository, paths),
      "Unable to remove eol-style property"
    );
  }

  private async removeEolStyleFromPaths(
    repository: Repository,
    paths: string[]
  ): Promise<void> {
    // Ask about recursive if any directories selected
    let recursive = false;
    if (await hasAnyDirectory(paths)) {
      const answer = await askRecursive("Remove");
      if (answer === undefined) return;
      recursive = answer;
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
