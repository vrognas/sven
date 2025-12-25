// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * SVN Terminology Mappings (P1.1)
 *
 * Maps SVN jargon to user-friendly terms.
 * Pattern: "User-friendly term (SVN_TERM)"
 *
 * Keeping SVN terms in parentheses helps users:
 * - Search SVN documentation
 * - Understand CLI output
 * - Communicate with team members
 */

export const TERMINOLOGY = {
  // Revision references
  BASE: "your version",
  HEAD: "server latest",
  PREV: "previous revision",
  WORKING: "local changes",

  // Working copy concepts
  WC: "local",
  workingCopy: "local folder",
  checkout: "download",
  update: "sync",
  commit: "save to server",

  // Organization
  changelist: "change group",
  repository: "repository",
  branch: "branch",

  // Properties
  EOL: "line ending",
  eolStyle: "line ending style",
  MIME: "file type",
  mimeType: "file type",
  autoProps: "auto-properties",
  needsLock: "require lock",

  // Operations
  blame: "annotations",
  annotate: "annotations",
  diff: "compare",
  patch: "changes",
  merge: "merge",
  revert: "undo changes",

  // Sparse checkout
  sparse: "selective download",
  depth: "download scope",
  exclude: "remove from disk",

  // Conflicts
  conflict: "conflict",
  resolved: "mark resolved",
  theirs: "server version",
  mine: "my version"
} as const;

/**
 * Format a term with optional SVN original in parentheses.
 *
 * @example
 * humanize("BASE") // "your version (BASE)"
 * humanize("BASE", false) // "your version"
 */
export function humanize(
  term: keyof typeof TERMINOLOGY,
  includeOriginal = true
): string {
  const friendly = TERMINOLOGY[term];
  return includeOriginal ? `${friendly} (${term})` : friendly;
}

/**
 * Command title patterns for consistent naming.
 *
 * Use ellipsis (...) for commands that:
 * - Open dialogs/pickers
 * - Require additional input
 * - Navigate away from current context
 */
export const COMMAND_PATTERNS = {
  // Action commands (no ellipsis)
  action: (verb: string, noun?: string) => (noun ? `${verb} ${noun}` : verb),

  // Dialog-opening commands (with ellipsis)
  dialog: (verb: string, noun?: string) =>
    noun ? `${verb} ${noun}...` : `${verb}...`,

  // Toggle commands
  toggle: (noun: string) => `Toggle ${noun}`,

  // View commands
  view: (noun: string) => `View ${noun}`,

  // Manage commands (opens complex dialog)
  manage: (noun: string) => `Manage ${noun}...`
} as const;
