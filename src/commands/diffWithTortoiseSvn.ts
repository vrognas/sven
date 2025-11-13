import { SourceControlResourceState, Uri, window, workspace } from "vscode";
import { Resource } from "../resource";
import { Command } from "./command";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { logError } from "../util/errorLogger";

/**
 * Command to open file diff with configurable external diff tool using SVN's --diff-cmd
 * Reads svn.diff.tool from settings and passes it to svn diff --diff-cmd
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
    console.log("DiffWithTortoiseSvn command called", { arg, resourceStates });

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

    // Read external diff tool configuration
    const config = workspace.getConfiguration("svn");
    const diffToolPath = config.get<string>("diff.tool");

    console.log("Settings:", { diffToolPath });

    if (!diffToolPath) {
      console.log("ERROR: diff.tool not configured");
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
      // Create wrapper script that calls the diff tool
      // SVN passes: label1 label2 oldfile newfile width height
      const wrapperScript = this.createWrapperScript(diffToolPath);

      console.log(`Calling svn diff --diff-cmd="${wrapperScript}" "${filePath}"`);

      // Call svn diff with --diff-cmd flag
      // This will launch the external diff tool through SVN's built-in mechanism
      await (repository as any).svn.exec(repository.workspaceRoot, [
        "diff",
        `--diff-cmd=${wrapperScript}`,
        filePath
      ]);

    } catch (error) {
      logError("Failed to launch external diff", error);
      window.showErrorMessage(
        `Failed to launch external diff: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a temporary wrapper script for the diff tool
   * SVN passes 7 args: label1 label2 oldfile=BASE oldfile newfile=working newfile
   * Based on TortoiseSVN doc: %3=label1, %5=label2, %6=oldfile, %7=newfile
   * We want: tool oldfile newfile /title1=label1 /title2=label2
   */
  private createWrapperScript(toolPath: string): string {
    const isWindows = process.platform === "win32";

    if (isWindows) {
      // Create a batch file wrapper
      const scriptPath = join(tmpdir(), "svn-diff-wrapper.bat");
      const scriptContent = `@echo off
"${toolPath}" "%6" "%7" /title1=%3 /title2=%5 /leftreadonly
exit /b %errorlevel%`;
      writeFileSync(scriptPath, scriptContent);
      return scriptPath;
    } else {
      // Create a shell script wrapper
      const scriptPath = join(tmpdir(), "svn-diff-wrapper.sh");
      const scriptContent = `#!/bin/sh
"${toolPath}" "$6" "$7" -title1="$3" -title2="$5" -readonly
exit $?`;
      writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
      return scriptPath;
    }
  }
}
