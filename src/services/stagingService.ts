// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable, Uri } from "vscode";

/**
 * Reserved SVN changelist name for staging.
 * Using double underscore prefix to avoid collision with user changelists.
 */
export const STAGING_CHANGELIST = "__staged__";

/**
 * Service to track staged files for commit.
 * Uses SVN changelists under the hood for persistence.
 *
 * The actual staging is done via SVN changelist commands in Repository:
 * - Stage: repository.addChangelist(files, STAGING_CHANGELIST)
 * - Unstage: repository.removeChangelist(files)
 *
 * This service maintains a cache of staged paths from status results
 * for fast UI lookups without needing SVN queries.
 */
export class StagingService implements Disposable {
  private _stagedPaths = new Set<string>();

  constructor(private readonly repoRoot: string) {}

  /**
   * Sync staged paths from SVN status result.
   * Called by ResourceGroupManager after status refresh.
   * @param paths File paths from the __staged__ changelist
   */
  syncFromChangelist(paths: string[]): void {
    this._stagedPaths.clear();
    for (const path of paths) {
      this._stagedPaths.add(this.normalizePath(path));
    }
  }

  /**
   * Check if a file is staged (from cache)
   */
  isStaged(uri: Uri | string): boolean {
    const path = typeof uri === "string" ? uri : uri.fsPath;
    return this._stagedPaths.has(this.normalizePath(path));
  }

  /**
   * Get all staged file paths
   */
  getStagedPaths(): string[] {
    return Array.from(this._stagedPaths);
  }

  /**
   * Get count of staged files
   */
  get stagedCount(): number {
    return this._stagedPaths.size;
  }

  /**
   * Normalize path for consistent comparison
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  dispose(): void {
    this._stagedPaths.clear();
  }
}
