import { SourceControlResourceState, Uri, window, workspace } from "vscode";
import { Resource } from "../resource";
import { Command } from "./command";
import { spawn } from "child_process";
import { existsSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { logError } from "../util/errorLogger";

/**
 * Command to open file diff with configurable external diff tool
 * Reads svn.diff.tool and svn.diff.toolArguments from settings
 * Supports variable substitution: %base, %mine, %bname, %yname
 * Useful for large tabular files (CSV) where built-in diff is inadequate
 */
export class DiffWithTortoiseSvn extends Command {
  constructor() {
    super("svn.diffWithTortoiseSvn");
  }

  public async execute(
    arg?: Resource | Uri,
    ...resourceStates: SourceControlResourceState[]
  ) {
    let filePath: string | undefined;

    // Extract file path from Resource or Uri
    if (arg instanceof Resource) {
      filePath = arg.resourceUri.fsPath;
    } else if (arg instanceof Uri) {
      filePath = arg.fsPath;
    }

    // If no file provided, try to get from resource states
    if (!filePath && resourceStates.length > 0) {
      filePath = resourceStates[0].resourceUri.fsPath;
    }

    if (!filePath) {
      window.showErrorMessage("No file selected for diff");
      return;
    }

    // Read external diff tool configuration
    const config = workspace.getConfiguration("svn");
    const diffToolPath = config.get<string>("diff.tool");
    const diffToolArgs = config.get<string>("diff.toolArguments", "%base %mine");

    if (!diffToolPath) {
      window.showErrorMessage(
        "External diff tool not configured. Set svn.diff.tool in settings."
      );
      return;
    }

    if (!existsSync(diffToolPath)) {
      window.showErrorMessage(
        `External diff tool not found at: ${diffToolPath}`
      );
      return;
    }

    const repository = this.getRepository(filePath);
    if (!repository) {
      window.showErrorMessage("File is not in an SVN repository");
      return;
    }

    try {
      // Get BASE version from SVN
      const baseContent = await repository.showBuffer(filePath, "BASE");

      // Create temp file for BASE version
      const tempDir = mkdtempSync(join(tmpdir(), "svn-diff-"));
      const fileName = filePath.split(/[\\\/]/).pop() || "file";
      const baseFileName = join(tempDir, "BASE_" + fileName);
      writeFileSync(baseFileName, baseContent);

      // Substitute variables in arguments
      const substitutedArgs = diffToolArgs
        .replace(/%base/g, baseFileName)
        .replace(/%mine/g, filePath)
        .replace(/%bname/g, `BASE_${fileName}`)
        .replace(/%yname/g, fileName);

      // Parse arguments (handle quoted strings)
      const args = substitutedArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const cleanedArgs = args.map(arg => arg.replace(/^"|"$/g, ""));

      // Launch external diff tool
      const child = spawn(
        `"${diffToolPath}"`,
        cleanedArgs.map(arg => `"${arg}"`),
        {
          detached: true,
          stdio: "ignore",
          shell: true
        }
      );

      child.on("error", (error) => {
        logError("Failed to spawn external diff tool", error);
        window.showErrorMessage(
          `Failed to launch external diff tool: ${error.message}`
        );
      });

      // Detach the process so it runs independently
      child.unref();
    } catch (error) {
      logError("Failed to launch external diff", error);
      window.showErrorMessage(
        `Failed to launch external diff: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
