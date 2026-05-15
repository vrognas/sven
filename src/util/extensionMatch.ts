// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { Uri } from "vscode";

/**
 * True iff the uri's file extension is in `exts` (case-insensitive).
 * Empty/invalid lists return false; files without an extension return false.
 */
export function matchesExtensionList(uri: Uri, exts: string[]): boolean {
  if (!Array.isArray(exts) || exts.length === 0) {
    return false;
  }
  const fileExt = path.extname(uri.fsPath).toLowerCase();
  if (!fileExt) {
    return false;
  }
  return exts.some(e => e.toLowerCase() === fileExt);
}
