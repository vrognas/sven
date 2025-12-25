// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Copy Path Commands
 *
 * Copies relative or absolute path of files from SCM changes view to clipboard
 */

import { env, SourceControlResourceState, window, workspace } from "vscode";
import { Command } from "./command";

export class CopyRelativePath extends Command {
  constructor() {
    super("sven.copyRelativePath");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    if (resourceStates.length === 0) {
      return;
    }

    const paths = resourceStates
      .filter(r => r.resourceUri)
      .map(r => workspace.asRelativePath(r.resourceUri));

    if (paths.length === 0) {
      return;
    }

    const text = paths.join("\n");
    await env.clipboard.writeText(text);

    const count = paths.length;
    window.setStatusBarMessage(
      `Copied ${count} relative path${count > 1 ? "s" : ""} to clipboard`,
      3000
    );
  }
}

export class CopyAbsolutePath extends Command {
  constructor() {
    super("sven.copyAbsolutePath");
  }

  public async execute(...resourceStates: SourceControlResourceState[]) {
    if (resourceStates.length === 0) {
      return;
    }

    const paths = resourceStates
      .filter(r => r.resourceUri)
      .map(r => r.resourceUri.fsPath);

    if (paths.length === 0) {
      return;
    }

    const text = paths.join("\n");
    await env.clipboard.writeText(text);

    const count = paths.length;
    window.setStatusBarMessage(
      `Copied ${count} absolute path${count > 1 ? "s" : ""} to clipboard`,
      3000
    );
  }
}
