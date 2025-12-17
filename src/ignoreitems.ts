// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { QuickPickItem, Uri, window } from "vscode";
import { Repository } from "./repository";

export class IgnoreSingleItem implements QuickPickItem {
  constructor(
    public expression: string,
    public recursive: boolean = false,
    public directory?: string
  ) {}

  get label(): string {
    const text = this.recursive ? " (Recursive)" : "";
    return `${this.expression}${text}`;
  }

  get description(): string {
    return this.recursive
      ? "Applies to this folder AND all subfolders"
      : "Applies to this folder only";
  }

  get detail(): string {
    const dir = this.directory
      ? path.basename(this.directory)
      : "this directory";
    return this.recursive
      ? `Sets svn:ignore recursively - pattern '${this.expression}' applied to all subdirectories`
      : `Sets svn:ignore on ${dir} - pattern '${this.expression}' only matches here`;
  }
}

export class IgnoreCustomItem implements QuickPickItem {
  label = "$(edit) Custom pattern...";
  description = "Enter a custom ignore pattern";
  detail = "Use glob syntax: *.log, temp_*, build/, etc.";
}

export async function inputIgnoreList(repository: Repository, uris: Uri[]) {
  if (uris.length === 0) {
    return false;
  }

  const regexExtension = new RegExp("\\.[^\\.]+(\\.map)?$", "i");

  if (uris.length === 1) {
    const uri = uris[0]!;
    const matchExt = uri.fsPath.match(regexExtension);
    const ext = matchExt && matchExt[0] ? matchExt[0] : "";
    const fileName = path.basename(uri.fsPath);
    const dirName = path.dirname(uri.fsPath);

    const picks: (IgnoreSingleItem | IgnoreCustomItem)[] = [];
    picks.push(new IgnoreSingleItem(fileName, false, dirName));
    if (ext) {
      picks.push(new IgnoreSingleItem("*" + ext, false, dirName));
    }
    picks.push(new IgnoreSingleItem(fileName, true, dirName));
    if (ext) {
      picks.push(new IgnoreSingleItem("*" + ext, true, dirName));
    }
    picks.push(new IgnoreCustomItem());

    const pick = await window.showQuickPick(picks, {
      placeHolder: "Select pattern to ignore"
    });

    if (!pick) {
      return false;
    }

    // Handle custom pattern
    if (pick instanceof IgnoreCustomItem) {
      const customPattern = await window.showInputBox({
        prompt: "Enter ignore pattern",
        placeHolder: "e.g., *.log, temp_*, __pycache__",
        validateInput: value => {
          if (!value || value.trim().length === 0) {
            return "Pattern cannot be empty";
          }
          if (value.includes("\n") || value.includes("\r")) {
            return "Pattern cannot contain newlines";
          }
          if (value.length > 255) {
            return "Pattern too long (max 255 chars)";
          }
          return undefined;
        }
      });
      if (!customPattern) {
        return false;
      }
      // Ask if recursive
      const recursiveChoice = await window.showQuickPick(
        [
          {
            label: "This folder only",
            description: "Pattern applies only to this directory",
            recursive: false
          },
          {
            label: "Recursive (all subfolders)",
            description:
              "Pattern applies to this directory and all subdirectories",
            recursive: true
          }
        ],
        { placeHolder: "Select scope for the pattern" }
      );
      if (!recursiveChoice) {
        return false;
      }
      return repository.addToIgnore(
        [customPattern.trim()],
        dirName,
        recursiveChoice.recursive
      );
    }

    return repository.addToIgnore([pick.expression], dirName, pick.recursive);
  }

  const count = uris.length;
  const recursive = "(Recursive)";

  const ignoreByFileName = `Ignore ${count} by filename`;
  const ignoreByExtension = `Ignore ${count} by extension`;
  const ignoreByFileNameRecursive = `Ignore ${count} by filename ${recursive}`;
  const ignoreByExtensionRecursive = `Ignore ${count} by extension ${recursive}`;

  const picks: string[] = [
    ignoreByFileName,
    ignoreByExtension,
    ignoreByFileNameRecursive,
    ignoreByExtensionRecursive
  ];

  const pick = await window.showQuickPick(picks);

  if (!pick) {
    return false;
  }

  const isByFile = pick.startsWith(ignoreByFileName);
  const isRecursive = pick.endsWith(recursive);

  const byDir: { [key: string]: string[] } = {};

  for (const uri of uris) {
    const dirname = path.dirname(uri.fsPath);
    const filename = path.basename(uri.fsPath);
    const matchExt = uri.fsPath.match(regexExtension);
    const ext = matchExt && matchExt[0] ? matchExt[0] : "";

    if (typeof byDir[dirname] === "undefined") {
      byDir[dirname] = [];
    }

    if (isByFile) {
      byDir[dirname].push(filename);
    } else if (ext) {
      byDir[dirname].push("*" + ext);
    }
  }

  for (const dir in byDir) {
    if (Object.hasOwn(byDir, dir)) {
      const files = [...new Set(byDir[dir])]; // Unique list
      await repository.addToIgnore(files, dir, isRecursive);
    }
  }

  return true;
}
