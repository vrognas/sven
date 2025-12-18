// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import picomatch from "picomatch";
import { Uri, window } from "vscode";
import { Status } from "../common/types";
import { Command } from "./command";
import { Repository } from "../repository";
import { formatSvnError, logError } from "../util/errorLogger";

/**
 * Toggle svn:ignore for a file/folder.
 * - If ignored: remove from svn:ignore
 * - If unversioned: add to svn:ignore
 */
export class ToggleIgnore extends Command {
  constructor() {
    super("sven.toggleIgnore");
  }

  public async execute(_mainUri?: Uri, allUris?: Uri[]) {
    if (!allUris || allUris.length === 0) {
      return;
    }

    // For now, handle single file only
    const uri = allUris[0]!;
    const dirName = path.dirname(uri.fsPath);
    const fileName = path.basename(uri.fsPath);

    // Use parent directory for repository lookup (more reliable for ignored files)
    // The directory is always versioned since it has the svn:ignore property
    const dirUri = Uri.file(dirName);

    return this.runByRepository(dirUri, async (repository: Repository) => {
      // Check if file is ignored
      const resource = repository.getResourceFromFile(uri);
      const isIgnored = resource?.type === Status.IGNORED;

      if (isIgnored) {
        // Remove from ignore
        await this.removeFromIgnore(repository, dirName, fileName);
      } else {
        // Add to ignore
        await this.addToIgnore([uri]);
      }
    });
  }

  private async removeFromIgnore(
    repository: Repository,
    dirName: string,
    fileName: string
  ): Promise<void> {
    // Get current ignore patterns for this directory
    const patterns = (await repository.getCurrentIgnore(dirName)).filter(
      p => p.trim() !== ""
    );

    if (patterns.length === 0) {
      window.showInformationMessage(
        "No ignore patterns found in this directory"
      );
      return;
    }

    // Find patterns that match this file
    const matchingPatterns = patterns.filter(p => {
      if (p === fileName) return true;
      return picomatch.isMatch(fileName, p, { dot: true });
    });

    if (matchingPatterns.length === 0) {
      // Show all patterns for user to pick
      const pick = await window.showQuickPick(
        patterns.map(p => ({
          label: p,
          description: `Remove '${p}' from svn:ignore`
        })),
        { placeHolder: "Select pattern to remove" }
      );
      if (!pick) return;
      try {
        await repository.removeFromIgnore(pick.label, dirName);
        window.showInformationMessage(
          `Removed '${pick.label}' from svn:ignore`
        );
      } catch (error) {
        logError("Failed to remove pattern", error);
        window.showErrorMessage(
          formatSvnError(error, "Failed to remove ignore pattern")
        );
      }
    } else if (matchingPatterns.length === 1) {
      // Single match - remove directly
      const pattern = matchingPatterns[0]!;
      try {
        await repository.removeFromIgnore(pattern, dirName);
        window.showInformationMessage(`Removed '${pattern}' from svn:ignore`);
      } catch (error) {
        logError("Failed to remove pattern", error);
        window.showErrorMessage(
          formatSvnError(error, "Failed to remove ignore pattern")
        );
      }
    } else {
      // Multiple matches - let user pick
      const pick = await window.showQuickPick(
        matchingPatterns.map(p => ({
          label: p,
          description: `Remove '${p}' from svn:ignore`
        })),
        { placeHolder: "Multiple patterns match - select one to remove" }
      );
      if (!pick) return;
      try {
        await repository.removeFromIgnore(pick.label, dirName);
        window.showInformationMessage(
          `Removed '${pick.label}' from svn:ignore`
        );
      } catch (error) {
        logError("Failed to remove pattern", error);
        window.showErrorMessage(
          formatSvnError(error, "Failed to remove ignore pattern")
        );
      }
    }
  }
}
