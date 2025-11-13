import { commands, SourceControlResourceState, Uri, window, workspace } from "vscode";
import { Resource } from "../resource";
import { Command } from "./command";
import { existsSync } from "fs";
import { logError } from "../util/errorLogger";
import { SourceControlManager } from "../source_control_manager";

/**
 * Command to open file diff with external diff tool using SVN's --diff-cmd
 * Reads svn.diff.tool from settings (path to bcsvn.bat or similar wrapper)
 * Useful for large tabular files (CSV) where built-in diff is inadequate
 */
export class DiffWithExternalTool extends Command {
  constructor() {
    super("svn.diffWithExternalTool");
  }

  public async execute(
    arg?: Resource | Uri,
    ...resourceStates: SourceControlResourceState[]
  ) {
    console.log("DiffWithExternalTool command called", { arg, resourceStates });

    let filePath: string | undefined;

    // Extract file path from Resource or Uri
    if (arg instanceof Resource) {
      filePath = arg.resourceUri.fsPath;
      console.log("Got file path from Resource:", filePath);
    } else if (arg instanceof Uri) {
      filePath = arg.fsPath;
      console.log("Got file path from Uri:", filePath);
    }

    // If no file provided, try to get from resource states
    if (!filePath && resourceStates.length > 0) {
      filePath = resourceStates[0].resourceUri.fsPath;
      console.log("Got file path from resourceStates:", filePath);
    }

    if (!filePath) {
      window.showErrorMessage("No file selected for diff");
      return;
    }

    // Read external diff tool configuration (path to bcsvn.bat)
    const config = workspace.getConfiguration("svn");
    const diffToolPath = config.get<string>("diff.tool");

    console.log("Settings:", { diffToolPath });

    if (!diffToolPath) {
      console.log("ERROR: diff.tool not configured");
      window.showErrorMessage(
        "External diff tool not configured. Set svn.diff.tool to path of bcsvn.bat"
      );
      return;
    }

    console.log("Checking if batch file exists:", diffToolPath);
    if (!existsSync(diffToolPath)) {
      console.log("ERROR: Batch file does not exist");
      window.showErrorMessage(
        `External diff tool not found at: ${diffToolPath}`
      );
      return;
    }
    console.log("Batch file exists ✓");

    try {
      console.log("Getting repository for:", filePath);

      // Get SourceControlManager (use cached static or fetch via command)
      const sourceControlManager = (Command as any)._sourceControlManager || (await commands.executeCommand(
        "svn.getSourceControlManager",
        ""
      )) as SourceControlManager;

      console.log("Got SourceControlManager:", !!sourceControlManager);

      // Get repository for the file path
      const repository = sourceControlManager.getRepository(Uri.file(filePath));
      console.log("getRepository returned:", repository ? "found" : "null/undefined");

      if (!repository) {
        console.log("ERROR: Repository not found");
        window.showErrorMessage("File is not in an SVN repository");
        return;
      }
      console.log("Repository found ✓", repository.workspaceRoot);

      console.log(`Calling svn diff --diff-cmd="${diffToolPath}" "${filePath}"`);

      // Call svn diff with --diff-cmd pointing to bcsvn.bat
      // SVN will invoke the batch file with the file paths
      const result = await sourceControlManager.svn.exec(repository.workspaceRoot, [
        "diff",
        `--diff-cmd=${diffToolPath}`,
        filePath
      ]);

      console.log("svn diff completed, result:", result);

    } catch (error) {
      console.log("ERROR caught:", error);
      logError("Failed to launch external diff", error);
      window.showErrorMessage(
        `Failed to launch external diff: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
