// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { commands, Uri, window } from "vscode";
import { Command } from "./command";

/**
 * Unified Property Management (P2.2)
 *
 * Consolidates 6+ property commands into single entry point.
 * Categories: EOL, MIME, Auto-Props, Ignore, Lock
 */

const PROPERTY_CATEGORIES = [
  {
    label: "$(symbol-property) Line Endings",
    id: "eol",
    detail: "Set or manage svn:eol-style property"
  },
  {
    label: "$(file-media) File Types",
    id: "mime",
    detail: "Set svn:mime-type property"
  },
  {
    label: "$(gear) Auto-Properties",
    id: "autoprops",
    detail: "Configure automatic property settings"
  },
  {
    label: "$(eye-closed) Ignore Patterns",
    id: "ignore",
    detail: "View svn:ignore patterns"
  },
  {
    label: "$(lock) Lock Settings",
    id: "lock",
    detail: "Manage file locks and needs-lock property"
  }
] as const;

/**
 * Show unified property management quick-pick.
 */
export async function manageProperties(uri?: Uri): Promise<void> {
  const selected = await window.showQuickPick(
    PROPERTY_CATEGORIES.map(c => ({
      label: c.label,
      detail: c.detail,
      id: c.id
    })),
    {
      title: "Manage File Properties",
      placeHolder: "Select property category"
    }
  );

  if (!selected) return;

  switch (selected.id) {
    case "eol":
      await commands.executeCommand("sven.manageEolStyles", uri);
      break;
    case "mime":
      await commands.executeCommand("sven.setMimeType", uri);
      break;
    case "autoprops":
      await commands.executeCommand("sven.manageAutoProps");
      break;
    case "ignore":
      await commands.executeCommand("sven.viewIgnorePatterns", uri);
      break;
    case "lock":
      await commands.executeCommand("sven.manageLocks");
      break;
  }
}

/**
 * Command class for VS Code registration.
 */
export class ManageProperties extends Command {
  constructor() {
    super("sven.manageProperties", { repository: false });
  }

  public async execute(uri?: Uri): Promise<void> {
    await manageProperties(uri);
  }
}
