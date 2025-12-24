// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { SourceControlManager } from "../source_control_manager";

/**
 * Status bar showing count of files with svn:needs-lock property.
 * Aggregates count from all repositories.
 * - $(unlock) 3: 3 files need lock
 */
export class NeedsLockStatusBar implements Disposable {
  private statusBarItem: StatusBarItem;
  private _text = "";
  private _tooltip = "";
  private _visible = false;
  private disposables: Disposable[] = [];
  // Track per-repository subscriptions for cleanup on repo close
  private repoSubscriptions = new Map<unknown, Disposable>();

  constructor(private sourceControlManager: SourceControlManager) {
    this.statusBarItem = window.createStatusBarItem(
      "sven.needsLock.statusBar",
      StatusBarAlignment.Left,
      49.1 // After watch (50), before other extensions at 49
    );
    this.statusBarItem.command = "sven.manageNeedsLock";

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
        // Clean up subscription for closed repo
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
    onDidChangeNeedsLock: (cb: () => void) => Disposable;
  }): void {
    // Prevent duplicate subscriptions (could happen if repo is in list during constructor
    // AND onDidOpenRepository fires for same repo)
    if (this.repoSubscriptions.has(repo)) {
      return;
    }
    const sub = repo.onDidChangeNeedsLock(() => this.update());
    this.repoSubscriptions.set(repo, sub);
  }

  /**
   * Update status bar display.
   */
  update(): void {
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

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.repoSubscriptions.forEach(d => d.dispose());
    this.repoSubscriptions.clear();
    this.statusBarItem.dispose();
  }
}
