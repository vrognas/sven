// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

"use strict";

import {
  ConfigurationChangeEvent,
  ConfigurationTarget,
  Event,
  EventEmitter,
  workspace,
  WorkspaceConfiguration
} from "vscode";

const SVEN = "sven";

class Configuration {
  private configuration: WorkspaceConfiguration;
  private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();

  get onDidChange(): Event<ConfigurationChangeEvent> {
    return this._onDidChange.event;
  }

  constructor() {
    this.configuration = workspace.getConfiguration(SVEN);
    workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
  }

  private onConfigurationChanged(event: ConfigurationChangeEvent) {
    if (!event.affectsConfiguration(SVEN)) {
      return;
    }

    this.configuration = workspace.getConfiguration(SVEN);

    this._onDidChange.fire(event);
  }

  public get<T>(section: string, defaultValue?: T): T {
    return this.configuration.get<T>(section, defaultValue!);
  }

  public update(
    section: string,
    value: unknown,
    configurationTarget?: ConfigurationTarget | boolean
  ): Thenable<void> {
    return this.configuration.update(section, value, configurationTarget);
  }

  public inspect(section: string) {
    return this.configuration.inspect(section);
  }

  // ========== Typed accessors (DRY - single source of truth) ==========

  /** Log entries to fetch per page (default: 50) */
  public logLength(): number {
    return parseInt(this.get<string>("log.length", "50"), 10) || 50;
  }

  /** Auto-update mode: "both" | "before" | "after" | "none" */
  public commitAutoUpdate(): "both" | "before" | "after" | "none" {
    return this.get<"both" | "before" | "after" | "none">(
      "commit.autoUpdate",
      "both"
    );
  }

  /** Default file encoding for SVN operations */
  public defaultEncoding(): string | undefined {
    return this.get<string>("default.encoding");
  }

  /** Patterns to ignore in source control view */
  public sourceControlIgnore(): string[] {
    return this.get<string[]>("sourceControl.ignore", []);
  }

  /** Hide unversioned files in source control view */
  public hideUnversioned(): boolean {
    return this.get<boolean>("sourceControl.hideUnversioned", false);
  }

  /** Count unversioned files in badge */
  public countUnversioned(): boolean {
    return this.get<boolean>("sourceControl.countUnversioned", true);
  }

  /** Use QuickPick for commit flow */
  public commitUseQuickPick(): boolean {
    return this.get<boolean>("commit.useQuickPick", true);
  }

  /** Enable conventional commits format */
  public commitConventionalCommits(): boolean {
    return this.get<boolean>("commit.conventionalCommits", true);
  }

  /** Show colored author dots in history */
  public logAuthorColors(): boolean {
    return this.get<boolean>("log.authorColors", true);
  }
}

export const configuration = new Configuration();
