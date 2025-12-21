// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { SourceControlManager } from "../source_control_manager";

/**
 * Status bar showing count of locked files (by me or others).
 * Aggregates count from all repositories.
 * - $(lock) 3: 3 files locked
 */
export class LockStatusBar implements Disposable {
  private statusBarItem: StatusBarItem;
  private _text = "";
  private _tooltip = "";
  private _visible = false;
  private disposables: Disposable[] = [];
  private repoSubscriptions = new Map<unknown, Disposable>();

  constructor(private sourceControlManager: SourceControlManager) {
    this.statusBarItem = window.createStatusBarItem(
      "sven.lock.statusBar",
      StatusBarAlignment.Left,
      48 // Left side, after needs-lock status bar
    );
    this.statusBarItem.command = "sven.manageLocks";

    // Subscribe to existing repositories
    for (const repo of sourceControlManager.repositories) {
      this.subscribeToRepository(repo);
    }

    // Subscribe to new repositories
    this.disposables.push(
      sourceControlManager.onDidOpenRepository(repo => {
        this.subscribeToRepository(repo);
        this.update();
      })
    );

    this.disposables.push(
      sourceControlManager.onDidCloseRepository(repo => {
        const sub = this.repoSubscriptions.get(repo);
        if (sub) {
          sub.dispose();
          this.repoSubscriptions.delete(repo);
        }
        this.update();
      })
    );

    this.update();
  }

  private subscribeToRepository(repo: {
    onDidChangeLockStatus: (cb: () => void) => Disposable;
  }): void {
    if (this.repoSubscriptions.has(repo)) {
      return;
    }
    const sub = repo.onDidChangeLockStatus(() => this.update());
    this.repoSubscriptions.set(repo, sub);
  }

  /**
   * Update status bar display.
   */
  update(): void {
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
    this._tooltip = count === 1 ? "1 locked file" : `${count} locked files`;

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

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.repoSubscriptions.forEach(d => d.dispose());
    this.repoSubscriptions.clear();
    this.statusBarItem.dispose();
  }
}
