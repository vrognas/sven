// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { SourceControlResourceState, Uri } from "vscode";
import { Status } from "../common/types";
import { getStagedPaths, unstageRevertedFiles } from "../helpers/revertHelper";
import { confirmRevert } from "../ui/confirm";
import { Command } from "./command";

export class Revert extends Command {
  constructor() {
    super("sven.revert");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    const selection = await this.getResourceStatesOrExit(resourceStates);
    if (!selection || !(await confirmRevert())) return;

    const stagedPaths = getStagedPaths(selection);

    // Track renamed files - need to revert both old and new paths
    // Otherwise reverting renamed.txt leaves file.txt deleted
    const renamedFromPaths = this.filterResources(selection)
      .filter(r => r.type === Status.ADDED && r.renameResourceUri)
      .map(r => r.renameResourceUri!.fsPath);

    // Always use infinity depth - for files it's ignored by SVN,
    // for directories it ensures full recursive revert including deleted paths
    await this.runByRepository(
      this.toUris(selection),
      async (repository, resources) => {
        const paths = this.toPaths(resources);

        // Include original paths of renamed files (relative to this repo)
        const renamePaths = renamedFromPaths.filter(p =>
          p.startsWith(repository.workspaceRoot + path.sep)
        );
        const allPaths = [...paths, ...renamePaths];

        await this.handleRepositoryOperation(async () => {
          await repository.revert(allPaths, "infinity");
          // Rebuild needs-lock cache from SVN for immediate L badge update
          await repository.refreshNeedsLockCache();
          // Refresh Explorer decorations for reverted files (L badge, etc)
          repository.refreshExplorerDecorations(allPaths.map(p => Uri.file(p)));
          // Auto-unstage reverted files
          await unstageRevertedFiles(repository, paths, stagedPaths);
        }, "Unable to revert");
      }
    );
  }
}
