// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable } from "vscode";
import * as semver from "semver";
import { setVscodeContext } from "../util";

/**
 * Create a VS Code context for SVN version check.
 * Sets context variable to true if SVN version meets minimum requirement.
 */
export function createVersionContext(
  svnVersion: string,
  minVersion: string,
  contextKey: string
): Disposable {
  const satisfies = semver.satisfies(svnVersion, `>= ${minVersion}`);
  setVscodeContext(contextKey, satisfies);
  return { dispose: () => {} };
}
