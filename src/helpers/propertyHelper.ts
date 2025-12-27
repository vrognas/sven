// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import * as fs from "../fs";

/**
 * Check if any paths are directories.
 * Used to determine if recursive option should be shown.
 */
export async function hasAnyDirectory(paths: string[]): Promise<boolean> {
  for (const path of paths) {
    try {
      const stat = await fs.stat(path);
      if (stat.isDirectory()) {
        return true;
      }
    } catch {
      // Ignore stat errors
    }
  }
  return false;
}

/**
 * Ask user about recursive application to directory contents.
 * Only call this if hasAnyDirectory() returned true.
 *
 * @param actionVerb - Verb for prompt (e.g., "Apply", "Remove")
 * @returns true for recursive, false for non-recursive, undefined if cancelled
 */
export async function askRecursive(
  actionVerb: "Apply" | "Remove" = "Apply"
): Promise<boolean | undefined> {
  const description =
    actionVerb === "Apply"
      ? "Apply to all files in selected directories"
      : "Remove from all files in selected directories";

  const answer = await window.showQuickPick(
    [
      { label: "Yes", description },
      {
        label: "No",
        description:
          actionVerb === "Apply"
            ? "Apply only to directories themselves"
            : "Remove only from directories themselves"
      }
    ],
    {
      placeHolder: `${actionVerb} recursively to directory contents?`,
      title: `Recursive ${actionVerb === "Apply" ? "Application" : "Removal"}`
    }
  );

  if (!answer) {
    return undefined;
  }

  return answer.label === "Yes";
}
