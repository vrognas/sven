// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { Repository } from "../repository";
import { SourceControlManager } from "../source_control_manager";

export interface StatusBarConfig {
  id: string;
  alignment: StatusBarAlignment;
  priority: number;
  command?: string;
}

/**
 * Base class for status bars that track repository state.
 * Handles subscription lifecycle for repository open/close events.
 *
 * Subclasses must implement:
 * - getRepoEvent: Return the event to subscribe to on each repository
 * - update: Update the status bar display
 */
export abstract class BaseStatusBar implements Disposable {
  protected statusBarItem: StatusBarItem;
  protected disposables: Disposable[] = [];
  private repoSubscriptions = new Map<unknown, Disposable>();

  constructor(
    protected sourceControlManager: SourceControlManager,
    config: StatusBarConfig
  ) {
    this.statusBarItem = window.createStatusBarItem(
      config.id,
      config.alignment,
      config.priority
    );
    if (config.command) {
      this.statusBarItem.command = config.command;
    }

    this.setupRepositoryListeners();
    this.update();
  }

  /**
   * Get the repository event to subscribe to.
   * Called once per repository to set up change notifications.
   *
   * @param repo - Repository to get event from
   * @returns Function that subscribes to the event and returns a Disposable
   */
  protected abstract getRepoEvent(
    repo: Repository
  ): (callback: () => void) => Disposable;

  /**
   * Update the status bar display.
   * Called when any repository state changes.
   */
  protected abstract update(): void;

  private setupRepositoryListeners(): void {
    // Subscribe to existing repositories
    for (const repo of this.sourceControlManager.repositories) {
      this.subscribeToRepository(repo);
    }

    // Subscribe to new repositories
    this.disposables.push(
      this.sourceControlManager.onDidOpenRepository(repo => {
        this.subscribeToRepository(repo);
        this.update();
      })
    );

    // Clean up closed repositories
    this.disposables.push(
      this.sourceControlManager.onDidCloseRepository(repo => {
        const sub = this.repoSubscriptions.get(repo);
        if (sub) {
          sub.dispose();
          this.repoSubscriptions.delete(repo);
        }
        this.update();
      })
    );
  }

  private subscribeToRepository(repo: Repository): void {
    // Prevent duplicate subscriptions
    if (this.repoSubscriptions.has(repo)) {
      return;
    }
    const eventSubscriber = this.getRepoEvent(repo);
    const sub = eventSubscriber(() => this.update());
    this.repoSubscriptions.set(repo, sub);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.repoSubscriptions.forEach(d => d.dispose());
    this.repoSubscriptions.clear();
    this.statusBarItem.dispose();
  }
}
