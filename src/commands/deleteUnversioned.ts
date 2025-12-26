// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { exists, lstat, unlink } from "../fs";
import { confirmDestructive } from "../ui";
import { deleteDirectory } from "../util";
import { Command } from "./command";

export class DeleteUnversioned extends Command {
  constructor() {
    super("sven.deleteUnversioned");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection) return;
    const uris = this.toUris(this.filterResources(selection));
    if (!(await confirmDestructive("Delete selected files?", "Delete"))) return;

    for (const uri of uris) {
      const fsPath = uri.fsPath;

      await this.handleRepositoryOperation(async () => {
        if (!(await exists(fsPath))) {
          return;
        }

        const stat = await lstat(fsPath);

        if (stat.isDirectory()) {
          await deleteDirectory(fsPath);
        } else {
          await unlink(fsPath);
        }
      }, "Unable to delete file");
    }
  }
}
