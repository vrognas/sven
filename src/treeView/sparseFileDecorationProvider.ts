// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import {
  Disposable,
  FileDecoration,
  FileDecorationProvider,
  ThemeColor,
  Uri,
  window
} from "vscode";
import { LockStatus } from "../common/types";
import { getLockColor, getLockTooltip } from "../util/lockHelpers";

/**
 * Provides file decorations for selective download tree items.
 * - Ghost items (not checked out) are visually de-emphasized
 * - Outdated items (local < server revision) show update indicator
 * - Locked items show K/O/B/T badge (SVN lock status)
 *
 * Uses svn-sparse:// scheme to prevent VS Code SCM decorations from appearing.
 */
export class SparseFileDecorationProvider
  implements FileDecorationProvider, Disposable
{
  private disposable: Disposable;

  constructor() {
    this.disposable = window.registerFileDecorationProvider(this);
  }

  dispose(): void {
    this.disposable.dispose();
  }

  provideFileDecoration(uri: Uri): FileDecoration | undefined {
    // Only handle svn-sparse scheme (prevents SCM decoration conflicts)
    if (uri.scheme !== "svn-sparse") {
      return undefined;
    }

    // Parse query params: sparse=ghost, outdated=true, lock=K/O/B/T
    const params = new URLSearchParams(uri.query);
    const isGhost = params.get("sparse") === "ghost";
    const isOutdated = params.get("outdated") === "true";
    const lockStatus = params.get("lock") as LockStatus | null;
    const lockOwner = params.get("lockOwner");

    // No decoration needed
    if (!isGhost && !isOutdated && !lockStatus) {
      return undefined;
    }

    const decoration: FileDecoration = {};

    // Ghost items: de-emphasized color
    if (isGhost) {
      decoration.color = new ThemeColor("list.deemphasizedForeground");
      decoration.tooltip = "Not downloaded (on server only)";
    }

    // Outdated items: update available indicator
    if (isOutdated) {
      decoration.badge = "↓";
      decoration.color = new ThemeColor(
        "gitDecoration.modifiedResourceForeground"
      );
      const outdatedTooltip = "Update available (server has newer revision)";
      decoration.tooltip = decoration.tooltip
        ? `${decoration.tooltip} - ${outdatedTooltip}`
        : outdatedTooltip;
    }

    // Lock badge using SVN status letters (K=yours, O=others, B=broken, T=stolen)
    if (lockStatus) {
      decoration.badge = decoration.badge
        ? `${lockStatus}${decoration.badge}`
        : lockStatus;
      const lockTooltip = getLockTooltip(lockStatus, lockOwner, "Locked");
      decoration.tooltip = decoration.tooltip
        ? `${decoration.tooltip} - ${lockTooltip}`
        : lockTooltip;
      // Lock color: B/T always red (error), K/O if not ghost/outdated
      if (
        lockStatus === LockStatus.B ||
        lockStatus === LockStatus.T ||
        (!isGhost && !isOutdated)
      ) {
        decoration.color = getLockColor(lockStatus);
      }
    }

    return decoration;
  }
}
