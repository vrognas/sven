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

/**
 * Provides file decorations for sparse checkout tree items.
 * - Ghost items (not checked out) are visually de-emphasized
 * - Locked items show lock badge (K/O/B/T) like explorer view
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
    // Parse query params: sparse=ghost, lock=K/O/B/T, lockOwner=name
    const params = new URLSearchParams(uri.query);
    const isGhost = params.get("sparse") === "ghost";
    const lockStatus = params.get("lock") as LockStatus | null;
    const lockOwner = params.get("lockOwner");

    // No decoration needed
    if (!isGhost && !lockStatus) {
      return undefined;
    }

    const decoration: FileDecoration = {};

    // Ghost items: de-emphasized color
    if (isGhost) {
      decoration.color = new ThemeColor("list.deemphasizedForeground");
      decoration.tooltip = "Not checked out (on server only)";
    }

    // Lock badge (K/O/B/T) - same as explorer view
    if (lockStatus) {
      decoration.badge = lockStatus;
      const lockTooltip = this.getLockTooltip(lockStatus, lockOwner);
      decoration.tooltip = decoration.tooltip
        ? `${decoration.tooltip} - ${lockTooltip}`
        : lockTooltip;
    }

    return decoration;
  }

  private getLockTooltip(
    lockStatus: LockStatus,
    lockOwner: string | null
  ): string {
    switch (lockStatus) {
      case LockStatus.K:
        return "Locked by you";
      case LockStatus.O:
        return lockOwner ? `Locked by ${lockOwner}` : "Locked by others";
      case LockStatus.B:
        return "Lock broken";
      case LockStatus.T:
        return lockOwner ? `Lock stolen by ${lockOwner}` : "Lock stolen";
      default:
        return "Locked";
    }
  }
}
