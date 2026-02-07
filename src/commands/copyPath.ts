// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Copy Path Commands
 *
 * Copies relative or absolute path of files from SCM changes view to clipboard
 */

import {
  env,
  SourceControlResourceState,
  Uri,
  window,
  workspace
} from "vscode";
import { Command } from "./command";

abstract class BaseCopyPathCommand extends Command {
  protected abstract pathTypeLabel: string;
  protected abstract mapPath(uri: Uri): string;

  public async execute(...resourceStates: SourceControlResourceState[]) {
    if (resourceStates.length === 0) {
      return;
    }

    const paths = resourceStates
      .map(r => r.resourceUri)
      .filter((uri): uri is Uri => uri instanceof Uri)
      .map(uri => this.mapPath(uri));

    if (paths.length === 0) {
      return;
    }

    const text = paths.join("\n");
    await env.clipboard.writeText(text);

    const count = paths.length;
    window.setStatusBarMessage(
      `Copied ${count} ${this.pathTypeLabel} path${count > 1 ? "s" : ""} to clipboard`,
      3000
    );
  }
}

export class CopyRelativePath extends BaseCopyPathCommand {
  constructor() {
    super("sven.copyRelativePath");
  }

  protected pathTypeLabel = "relative";

  protected mapPath(uri: Uri): string {
    return workspace.asRelativePath(uri);
  }
}

export class CopyAbsolutePath extends BaseCopyPathCommand {
  constructor() {
    super("sven.copyAbsolutePath");
  }

  protected pathTypeLabel = "absolute";

  protected mapPath(uri: Uri): string {
    return uri.fsPath;
  }
}
