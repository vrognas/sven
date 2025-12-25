// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { Command } from "./command";

/**
 * SVN Terminology Glossary (P1.2)
 *
 * Helps users unfamiliar with SVN understand jargon.
 * Terms include user-friendly name with SVN original in parentheses.
 */
export const GLOSSARY = [
  {
    term: "BASE (Your Version)",
    definition: "The last version you downloaded from the server"
  },
  {
    term: "HEAD (Server Latest)",
    definition: "The most recent version on the SVN server"
  },
  {
    term: "PREV (Previous Revision)",
    definition: "The revision before the current one"
  },
  {
    term: "Working Copy",
    definition: "Your local folder containing checked-out files"
  },
  {
    term: "Revision",
    definition: "A numbered snapshot of the repository at a point in time"
  },
  {
    term: "Change Group (Changelist)",
    definition: "A named set of files to commit together"
  },
  {
    term: "Sparse / Selective Download",
    definition: "Download only specific folders instead of entire repository"
  },
  {
    term: "Lock",
    definition:
      "Reserve a file so others cannot edit it (useful for binary files)"
  },
  {
    term: "Annotations (Blame)",
    definition: "Show who last edited each line of a file"
  },
  {
    term: "Line Ending Style (EOL)",
    definition:
      "How line breaks are stored: native (OS default), LF (Unix), CRLF (Windows)"
  },
  {
    term: "File Type (MIME)",
    definition: "Content type like text/plain or application/octet-stream"
  },
  {
    term: "Require Lock (needs-lock)",
    definition: "Property that makes file read-only until locked"
  }
] as const;

/**
 * Show glossary quick-pick for SVN terminology lookup.
 */
export async function showGlossary(): Promise<void> {
  const items = GLOSSARY.map(g => ({
    label: g.term,
    detail: g.definition
  }));

  await window.showQuickPick(items, {
    title: "SVN Terminology",
    placeHolder: "Search terms...",
    matchOnDetail: true
  });
}

/**
 * Command class for VS Code registration.
 */
export class ShowGlossary extends Command {
  constructor() {
    super("sven.showGlossary", { repository: false });
  }

  public async execute(): Promise<void> {
    await showGlossary();
  }
}
