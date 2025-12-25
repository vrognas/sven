// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable, StatusBarAlignment } from "vscode";
import { Repository } from "../repository";
import { SourceControlManager } from "../source_control_manager";
import { BaseStatusBar } from "./baseStatusBar";

/**
 * Status bar showing count of locked files (by me or others).
 * Aggregates count from all repositories.
 * - $(lock) 3: 3 files locked
 */
export class LockStatusBar extends BaseStatusBar {
  private _text = "";
  private _tooltip = "";
  private _visible = false;

  constructor(sourceControlManager: SourceControlManager) {
    super(sourceControlManager, {
      id: "sven.lock.statusBar",
      alignment: StatusBarAlignment.Left,
      priority: 49.05, // Immediately after needs-lock (49.1)
      command: "sven.manageLocks"
    });
  }

  protected getRepoEvent(
    repo: Repository
  ): (callback: () => void) => Disposable {
    return (cb: () => void) => repo.onDidChangeLockStatus(cb);
  }

  /**
   * Update status bar display.
   */
  protected update(): void {
    let count = 0;
    for (const repo of this.sourceControlManager.repositories) {
      count += repo.getLockedFileCount();
    }

    if (count === 0) {
      this._visible = false;
      this.statusBarItem.hide();
      return;
    }

    this._text = `$(lock) ${count}`;
    this._tooltip = count === 1 ? "1 locked item" : `${count} locked items`;

    this.statusBarItem.text = this._text;
    this.statusBarItem.tooltip = this._tooltip;
    this._visible = true;
    this.statusBarItem.show();
  }

  getText(): string {
    return this._text;
  }

  getTooltip(): string {
    return this._tooltip;
  }

  isVisible(): boolean {
    return this._visible;
  }
}
