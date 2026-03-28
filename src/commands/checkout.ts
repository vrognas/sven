// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as os from "os";
import * as path from "path";
import { commands, ProgressLocation, Uri, window, workspace } from "vscode";
import { IAuth, ICpOptions, ISvnErrorData } from "../common/types";
import { getBranchName } from "../helpers/branch";
import { configuration } from "../helpers/configuration";
import { svnErrorCodes } from "../svn";
import { validateRepositoryUrl } from "../validation";
import { Command } from "./command";
import { DepthQuickPickItem } from "./setDepth";

/** Depth options for initial checkout — shallow first so user can deepen via Selective Download */
const initialCheckoutDepthOptions: DepthQuickPickItem[] = [
  {
    label: "$(list-tree) Shallow (recommended)",
    description: "Files + empty subfolders",
    detail:
      "Fast checkout. Shows repo structure, then use Selective Download to get what you need.",
    depth: "immediates"
  },
  {
    label: "$(folder) Folder Only",
    description: "Empty placeholder",
    detail: "Fastest checkout. Only creates the folder, no files downloaded.",
    depth: "empty"
  },
  {
    label: "$(file) Files Only",
    description: "Skip subfolders",
    detail: "Downloads root files but no subfolders.",
    depth: "files"
  },
  {
    label: "$(folder-opened) Full",
    description: "Download everything",
    detail: "Downloads all files and folders recursively. Can be slow for large repos.",
    depth: "infinity"
  }
];

export class Checkout extends Command {
  constructor() {
    super("sven.checkout");
  }

  public async execute(url?: string) {
    if (!url) {
      url = await window.showInputBox({
        prompt: "Repository URL",
        title: "Checkout (1/3): Repository URL",
        ignoreFocusOut: true
      });
    }

    if (!url) {
      return;
    }

    // Validate URL to prevent SSRF and command injection
    if (!validateRepositoryUrl(url)) {
      window.showErrorMessage(
        `Invalid repository URL. Only http://, https://, svn://, and svn+ssh:// protocols are allowed.`
      );
      return;
    }

    let defaultCheckoutDirectory =
      configuration.get<string>("defaultCheckoutDirectory") || os.homedir();
    defaultCheckoutDirectory = defaultCheckoutDirectory.replace(
      /^~/,
      os.homedir()
    );

    const uris = await window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: Uri.file(defaultCheckoutDirectory),
      openLabel: "Select Repository Location"
    });

    if (!uris || uris.length === 0) {
      return;
    }

    const uri = uris[0]!;
    const parentPath = uri.fsPath;

    // Default folder name: from branch layout (strip trunk/branches/tags),
    // or last path segment of URL
    let folderName: string | undefined;
    const branch = getBranchName(url);
    if (branch) {
      const baseUrl = url.replace(/\//g, "/").replace(branch.path, "");
      folderName = path.basename(baseUrl);
    }
    if (!folderName) {
      // Strip trailing slashes and query string, take last segment
      const cleanUrl = url.replace(/[?#].*$/, "").replace(/\/+$/, "");
      folderName = path.basename(cleanUrl) || undefined;
    }

    folderName = await window.showInputBox({
      prompt: "Folder name",
      title: "Checkout (2/3): Folder Name",
      value: folderName,
      ignoreFocusOut: true
    });

    if (!folderName) {
      return;
    }

    const repositoryPath = path.join(parentPath, folderName);

    // Depth picker — default to shallow so user can selectively download later
    const depthPick = await window.showQuickPick(initialCheckoutDepthOptions, {
      placeHolder: "How much to download? (use Selective Download to add more later)",
      title: `Checkout (3/3): Download Depth`
    });

    if (!depthPick) {
      return;
    }

    // Use Notification location if supported
    let location: ProgressLocation = ProgressLocation.Window;
    if ((ProgressLocation as unknown as Record<string, unknown>).Notification) {
      location = (
        ProgressLocation as unknown as Record<string, ProgressLocation>
      ).Notification!;
    }

    const depthLabel = depthPick.depth === "infinity" ? "" : ` (${depthPick.description})`;
    const progressOptions = {
      location,
      title: `Checkout svn repository${depthLabel}...`,
      cancellable: true
    };

    let attempt = 0;

    const opt: ICpOptions = {};

    while (true) {
      attempt++;
      try {
        await window.withProgress(progressOptions, async () => {
          const sourceControlManager = await this.getSourceControlManager();
          const args = ["checkout", "--depth", depthPick.depth, url, repositoryPath];
          await sourceControlManager.svn.exec(parentPath, args, opt);
        });
        break;
      } catch (err) {
        const svnError = err as ISvnErrorData;
        if (
          svnError.svnErrorCode === svnErrorCodes.AuthorizationFailed &&
          attempt <= 3
        ) {
          const auth = (await commands.executeCommand(
            "sven.promptAuth",
            opt.username,
            undefined,
            url
          )) as IAuth;
          if (auth) {
            opt.username = auth.username;
            opt.password = auth.password;
            continue;
          }
        }
        throw err;
      }
    }

    const choices = [];
    let message = "Would you like to open the checked out repository?";
    const open = "Open Repository";
    choices.push(open);

    const addToWorkspace = "Add to Workspace";
    if (
      workspace.workspaceFolders &&
      (workspace as unknown as Record<string, unknown>).updateWorkspaceFolders // For VSCode >= 1.21
    ) {
      message =
        "Would you like to open the checked out repository, or add it to the current workspace?";
      choices.push(addToWorkspace);
    }

    const result = await window.showInformationMessage(message, ...choices);

    const openFolder = result === open;

    if (openFolder) {
      commands.executeCommand("vscode.openFolder", Uri.file(repositoryPath));
    } else if (result === addToWorkspace) {
      // For VSCode >= 1.21
      (
        workspace as unknown as {
          updateWorkspaceFolders: (
            start: number,
            deleteCount: number,
            folder: { uri: Uri }
          ) => void;
        }
      ).updateWorkspaceFolders(workspace.workspaceFolders!.length, 0, {
        uri: Uri.file(repositoryPath)
      });
    }
  }
}
