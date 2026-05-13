// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Event, Uri, workspace, EventEmitter, RelativePattern } from "vscode";
import { FSWatcher } from "fs";
import { exists } from "../fs";
import { join } from "path";
import { debounce } from "../decorators";
import {
  anyEvent,
  filterEvent,
  throttleEvent,
  IDisposable,
  isDescendant,
  fixPathSeparator,
  getSvnDir
} from "../util";
import { logError } from "../util/errorLogger";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFs: typeof import("fs") = require("fs");

// https://subversion.apache.org/docs/release-notes/1.3.html#_svn-hack
const SVN_PATTERN = /[\\\/](\.svn|_svn)[\\\/]/;
const SVN_TMP_PATTERN = /[\\\/](\.svn|_svn)[\\\/]tmp/;

export class RepositoryFilesWatcher implements IDisposable {
  private disposables: IDisposable[] = [];
  private nativeWatcher?: FSWatcher; // Track native fs.watch for cleanup

  private _onRepoChange = new EventEmitter<Uri>();
  private _onRepoCreate = new EventEmitter<Uri>();
  private _onRepoDelete = new EventEmitter<Uri>();

  /** Any fs event inside the working copy (including `.svn/`). */
  public readonly onDidAny: Event<Uri>;
  /** Events inside `.svn/` (with native fs.watch fallback when the workspace doesn't include root). */
  public readonly onDidSvnAny: Event<Uri>;
  /** Deletions of non-`.svn` files (consumed by deleted-file detector). */
  public readonly onDidWorkspaceDelete: Event<Uri>;

  constructor(readonly root: string) {
    const fsWatcher = workspace.createFileSystemWatcher(
      new RelativePattern(fixPathSeparator(root), "**")
    );
    this.disposables.push(fsWatcher);

    // Fallback native watcher: when the workspace doesn't include the repo
    // root (sparse checkout, file open outside workspaceFolders), VS Code's
    // workspace watcher doesn't fire — watch `.svn/` directly via fs.watch.
    const useNativeFallback =
      typeof workspace.workspaceFolders !== "undefined" &&
      !workspace.workspaceFolders.some(w => isDescendant(w.uri.fsPath, root));
    if (useNativeFallback) {
      try {
        this.nativeWatcher = nodeFs.watch(
          join(root, getSvnDir()),
          this.repoWatch.bind(this)
        );
        this.nativeWatcher.on("error", error => {
          // Common errors: ENOENT (.svn deleted), EACCES — degrade, don't crash.
          logError(`SVN repository watcher error for ${root}`, error);
        });
      } catch (error) {
        logError(`SVN repository watcher setup error for ${root}`, error);
      }
    }

    // Phase 8.3 perf fix - throttle events (300ms) to reduce CPU spikes
    // during bulk changes. Skip `.svn/tmp` (transient SVN scratch files).
    const notTmp = (u: Uri) => !SVN_TMP_PATTERN.test(u.path);
    const onChange = throttleEvent(
      filterEvent(fsWatcher.onDidChange, notTmp),
      300
    );
    const onCreate = throttleEvent(
      filterEvent(fsWatcher.onDidCreate, notTmp),
      300
    );
    const onDelete = throttleEvent(
      filterEvent(fsWatcher.onDidDelete, notTmp),
      300
    );

    this.onDidAny = anyEvent(onChange, onCreate, onDelete);
    this.onDidWorkspaceDelete = filterEvent(
      onDelete,
      u => !SVN_PATTERN.test(u.path)
    );

    // `.svn/` events: prefer native fallback if active, else filter the
    // workspace stream to `.svn/` paths.
    if (this.nativeWatcher) {
      this.onDidSvnAny = anyEvent(
        this._onRepoChange.event,
        this._onRepoCreate.event,
        this._onRepoDelete.event
      );
    } else {
      const inSvn = (u: Uri) => SVN_PATTERN.test(u.path);
      this.onDidSvnAny = anyEvent(
        filterEvent(onChange, inSvn),
        filterEvent(onCreate, inSvn),
        filterEvent(onDelete, inSvn)
      );
    }
  }

  @debounce(500)
  private repoWatch(event: string, filename: string | null): void {
    if (!filename) {
      return;
    }

    // Safely parse filename to Uri - fs.watch returns relative paths
    // that Uri.parse may reject if malformed
    const safeParseUri = (name: string): Uri | null => {
      try {
        return Uri.parse(name);
      } catch (err) {
        logError(`[RepositoryFilesWatcher] Failed to parse URI: ${name}`, err);
        return null;
      }
    };

    if (event === "change") {
      const uri = safeParseUri(filename);
      if (uri) {
        this._onRepoChange.fire(uri);
      }
    } else if (event === "rename") {
      exists(filename)
        .then(doesExist => {
          const uri = safeParseUri(filename);
          if (uri) {
            if (doesExist) {
              this._onRepoCreate.fire(uri);
            } else {
              this._onRepoDelete.fire(uri);
            }
          }
        })
        .catch(err => {
          logError(
            `[RepositoryFilesWatcher] Rename detection failed for ${filename}`,
            err
          );
        });
    }
  }

  public dispose(): void {
    // Close native fs.watch watcher to prevent file handle leak
    if (this.nativeWatcher) {
      if (
        typeof (this.nativeWatcher as { close?: () => void }).close ===
        "function"
      ) {
        this.nativeWatcher.close();
      }
      this.nativeWatcher = undefined;
    }
    this.disposables.forEach(d => d.dispose());
  }
}
