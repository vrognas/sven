// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import picomatch from "picomatch";
import { Uri, window } from "vscode";
import { Command } from "./command";
import { Repository } from "../repository";
import { logError } from "../util/errorLogger";

export class RemoveFromIgnore extends Command {
  constructor() {
    super("svn.removeFromIgnore");
  }

  public async execute(_mainUri?: Uri, allUris?: Uri[]) {
    if (!allUris || allUris.length === 0) {
      return;
    }

    // For now, handle single file only
    const uri = allUris[0]!;
    const dirName = path.dirname(uri.fsPath);
    const fileName = path.basename(uri.fsPath);

    return this.runByRepository(allUris, async (repository: Repository) => {
      // Get current ignore patterns for this directory, filter empty strings
      const patterns = (await repository.getCurrentIgnore(dirName)).filter(
        p => p.trim() !== ""
      );

      if (patterns.length === 0) {
        window.showInformationMessage(
          "No ignore patterns found in this directory"
        );
        return;
      }

      // Find patterns that could match this file using picomatch
      const matchingPatterns = patterns.filter(p => {
        if (p === fileName) return true;
        return picomatch.isMatch(fileName, p, { dot: true });
      });

      if (matchingPatterns.length === 0) {
        // Show all patterns and let user pick
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
          window.showErrorMessage("Failed to remove ignore pattern");
        }
      } else if (matchingPatterns.length === 1) {
        // Single match - confirm and remove
        const pattern = matchingPatterns[0]!;
        const confirm = await window.showQuickPick(
          [
            {
              label: "Yes",
              description: `Remove '${pattern}' from svn:ignore`
            },
            { label: "No", description: "Cancel" }
          ],
          { placeHolder: `Remove pattern '${pattern}'?` }
        );
        if (confirm?.label !== "Yes") return;
        try {
          await repository.removeFromIgnore(pattern, dirName);
          window.showInformationMessage(`Removed '${pattern}' from svn:ignore`);
        } catch (error) {
          logError("Failed to remove pattern", error);
          window.showErrorMessage("Failed to remove ignore pattern");
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
          window.showErrorMessage("Failed to remove ignore pattern");
        }
      }
    });
  }
}
