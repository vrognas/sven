// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState, Uri, window } from "vscode";
import { Resource } from "../resource";
import { Command } from "./command";
import { diffWithExternalTool } from "../util/fileOperations";
import { getErrorMessage, logError } from "../util/errorLogger";

/**
 * Command to open file diff with external diff tool using SVN's --diff-cmd
 * Reads svn.diff.tool from settings (path to bcsvn.bat or similar wrapper)
 * Useful for large tabular files (CSV) where built-in diff is inadequate
 */
export class DiffWithExternalTool extends Command {
  constructor() {
    super("sven.diffWithExternalTool");
  }

  public async execute(
    arg?: Resource | Uri,
    ...resourceStates: SourceControlResourceState[]
  ) {
    const uri =
      this.extractUri(arg) ??
      this.extractUri(resourceStates[0]) ??
      (await this.getSCMResource())?.resourceUri;

    if (!uri) {
      window.showErrorMessage("No file selected for diff");
      return;
    }
    const filePath = uri.fsPath;

    try {
      const sourceControlManager = await this.getSourceControlManager();

      // Get repository for the file path
      const repository = sourceControlManager.getRepository(Uri.file(filePath));

      if (!repository) {
        window.showErrorMessage("File is not in an SVN repository");
        return;
      }

      // Use shared utility for diff
      await diffWithExternalTool(
        repository.workspaceRoot,
        filePath,
        sourceControlManager.svn.exec.bind(sourceControlManager.svn),
        undefined, // oldRevision
        undefined, // newRevision
        sourceControlManager.context
      );
    } catch (error) {
      logError("Failed to launch external diff", error);
      window.showErrorMessage(
        `Failed to launch external diff: ${getErrorMessage(error)}`
      );
    }
  }
}
