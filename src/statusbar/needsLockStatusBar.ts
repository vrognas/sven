// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable, StatusBarAlignment } from "vscode";
import { Repository } from "../repository";
import { SourceControlManager } from "../source_control_manager";
import { BaseStatusBar } from "./baseStatusBar";

/**
 * Status bar showing count of files with svn:needs-lock property.
 * Aggregates count from all repositories.
 * - $(unlock) 3: 3 files need lock
 */
export class NeedsLockStatusBar extends BaseStatusBar {
  private _text = "";
  private _tooltip = "";
  private _visible = false;

  constructor(sourceControlManager: SourceControlManager) {
    super(sourceControlManager, {
      id: "sven.needsLock.statusBar",
      alignment: StatusBarAlignment.Left,
      priority: 49.1, // After watch (50), before other extensions at 49
      command: "sven.manageNeedsLock"
    });
  }

  protected getRepoEvent(
    repo: Repository
  ): (callback: () => void) => Disposable {
    return (cb: () => void) => repo.onDidChangeNeedsLock(cb);
  }

  /**
   * Update status bar display.
   */
  protected update(): void {
    let count = 0;
    for (const repo of this.sourceControlManager.repositories) {
      count += repo.getNeedsLockCount();
    }

    if (count === 0) {
      this._visible = false;
      this.statusBarItem.hide();
      return;
    }

    this._text = `$(unlock) ${count}`;
    this._tooltip =
      count === 1 ? "1 item needs lock" : `${count} items need lock`;

    this.statusBarItem.text = this._text;
    this.statusBarItem.tooltip = this._tooltip;
    this._visible = true;
    this.statusBarItem.show();
  }

  /**
   * Get current text (for testing).
   */
  getText(): string {
    return this._text;
  }

  /**
   * Get current tooltip (for testing).
   */
  getTooltip(): string {
    return this._tooltip;
  }

  /**
   * Check if visible (for testing).
   */
  isVisible(): boolean {
    return this._visible;
  }
}
