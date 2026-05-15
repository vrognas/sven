// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

"use strict";

import {
  ConfigurationChangeEvent,
  ConfigurationTarget,
  Event,
  EventEmitter,
  Uri,
  workspace,
  WorkspaceConfiguration
} from "vscode";
import { matchesExtensionList } from "../util/extensionMatch";

const SVEN = "sven";
const DEFAULT_DIFF_CSV_EXTENSIONS = [".csv", ".tsv"];
const DEFAULT_DIFF_CSV_SIZE_LIMIT_MB = 1;

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

  // ========== Typed accessors (only those with callers; add more as needed) ==========

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

  /** Use QuickPick for commit flow */
  public commitUseQuickPick(): boolean {
    return this.get<boolean>("commit.useQuickPick", true);
  }

  /** Aggressive size limit (MB) for csv-like diffs */
  public diffCsvSizeLimitMB(): number {
    return this.get<number>(
      "diff.csvSizeLimitMB",
      DEFAULT_DIFF_CSV_SIZE_LIMIT_MB
    );
  }

  /** Match uri against configured csv-like diff extension list (case-insensitive) */
  public isCsvLikeDiff(uri: Uri): boolean {
    return matchesExtensionList(
      uri,
      this.get<string[]>("diff.csvExtensions", DEFAULT_DIFF_CSV_EXTENSIONS)
    );
  }
}

export const configuration = new Configuration();
