// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { Uri } from "vscode";
import { Command } from "./command";
import { Repository } from "../repository";
import { removeMatchingIgnorePattern } from "../helpers/ignoreHelper";

export class RemoveFromIgnore extends Command {
  constructor() {
    super("sven.removeFromIgnore");
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
      await removeMatchingIgnorePattern(repository, dirName, fileName, {
        confirmSingleMatch: true
      });
    });
  }
}
