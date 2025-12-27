// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import {
  commands,
  Disposable,
  Position,
  Range,
  SourceControlResourceState,
  TextDocumentShowOptions,
  TextEditor,
  Uri,
  ViewColumn,
  window,
  workspace,
  WorkspaceEdit
} from "vscode";
import {
  ICommandOptions,
  PropStatus,
  Status,
  SvnUriAction,
  LineChange
} from "../common/types";
import { exists, readFile, stat, unlink } from "../fs";
import { configuration } from "../helpers/configuration";
import { inputIgnoreList } from "../ignoreitems";
import { applyLineChanges } from "../lineChanges";
import { SourceControlManager } from "../source_control_manager";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { fromSvnUri, toSvnUri } from "../uri";
import { getSvnDir } from "../util";
import { logError, logWarning } from "../util/errorLogger";

/**
 * Type-safe command argument patterns used across all commands.
 * Commands can accept various combinations of these argument types.
 */
export type CommandArgs =
  // Repository commands (e.g., refresh, update)
  | [Repository]
  // Resource state commands (e.g., commit, revert)
  | SourceControlResourceState[]
  // URI-based commands
  | [Uri]
  | [Uri, LineChange[], number] // revertChange
  // Resource/URI with optional states
  | [Resource | Uri | undefined, ...SourceControlResourceState[]]
  // Other variadic patterns
  | unknown[];

/**
 * Return type for command execution. Most commands return void or Promise<void>,
 * but some may return specific values.
 */
export type CommandResult = void | Promise<void> | Promise<unknown>;

export abstract class Command implements Disposable {
  // Phase 10.2 perf fix - cache SourceControlManager to avoid IPC overhead
  private static _sourceControlManager?: SourceControlManager;

  static setSourceControlManager(scm: SourceControlManager) {
    Command._sourceControlManager = scm;
  }

  private _disposable?: Disposable;

  constructor(commandName: string, options: ICommandOptions = {}) {
    if (options.repository) {
      const command = this.createRepositoryCommand(this.execute);

      this._disposable = commands.registerCommand(commandName, command);

      return;
    }

    this._disposable = commands.registerCommand(
      commandName,
      (...args: unknown[]) => this.execute(...args)
    );
  }

  public abstract execute(...args: unknown[]): CommandResult;

  public dispose() {
    this._disposable?.dispose();
  }

  private createRepositoryCommand(
    method: (...args: unknown[]) => CommandResult
  ): (...args: unknown[]) => Promise<unknown> {
    const result = async (...args: unknown[]) => {
      const sourceControlManager =
        Command._sourceControlManager ||
        ((await commands.executeCommand(
          "sven.getSourceControlManager",
          ""
        )) as SourceControlManager);
      const repository = sourceControlManager.getRepository(args[0]);
      let repositoryPromise;

      if (repository) {
        repositoryPromise = Promise.resolve(repository);
      } else if (sourceControlManager.repositories.length === 1) {
        repositoryPromise = Promise.resolve(
          sourceControlManager.repositories[0]!
        );
      } else {
        repositoryPromise = sourceControlManager.pickRepository();
      }

      const result = repositoryPromise.then(repository => {
        if (!repository) {
          return Promise.resolve();
        }

        return Promise.resolve(method.apply(this, [repository, ...args]));
      });

      return result.catch(err => {
        logError("Command execution failed", err);
      });
    };

    return result;
  }

  protected async getResourceStates(
    resourceStates: SourceControlResourceState[]
  ): Promise<Resource[]> {
    if (
      resourceStates.length === 0 ||
      !(resourceStates[0]!.resourceUri instanceof Uri)
    ) {
      const resource = await this.getSCMResource();

      if (!resource) {
        return [];
      }

      resourceStates = [resource];
    }

    return resourceStates.filter(s => s instanceof Resource) as Resource[];
  }

  /**
   * Get resource states or return null if empty (Phase 13.2).
   * Replaces pattern: `if (selection.length === 0) return;`
   */
  protected async getResourceStatesOrExit(
    resourceStates: SourceControlResourceState[]
  ): Promise<Resource[] | null> {
    const selection = await this.getResourceStates(resourceStates);
    return selection.length === 0 ? null : selection;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRY Helpers - Reduce common patterns in commands
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter resource states to only Resource instances.
   * Replaces: `.filter(s => s instanceof Resource) as Resource[]`
   */
  protected filterResources(states: SourceControlResourceState[]): Resource[] {
    return states.filter((s): s is Resource => s instanceof Resource);
  }

  /**
   * Extract URIs from resources.
   * Replaces: `.map(resource => resource.resourceUri)`
   */
  protected toUris(resources: Resource[]): Uri[] {
    return resources.map(r => r.resourceUri);
  }

  /**
   * Extract file system paths from URIs.
   * Replaces: `.map(uri => uri.fsPath)`
   */
  protected toPaths(uris: Uri[]): string[] {
    return uris.map(u => u.fsPath);
  }

  /**
   * Convert resources directly to paths (combines toUris + toPaths).
   * Replaces: `.map(r => r.resourceUri).map(u => u.fsPath)`
   */
  protected resourcesToPaths(resources: Resource[]): string[] {
    return resources.map(r => r.resourceUri.fsPath);
  }

  /**
   * Extract URIs from command args (Explorer context menu multi-select).
   * Returns null if args are not URI-based (e.g., SCM resource states).
   * Pattern: args[0] = clicked item, args[1] = all selected items (multi-select)
   */
  protected extractUris(args: unknown[]): Uri[] | null {
    if (args.length > 0 && args[0] instanceof Uri) {
      return Array.isArray(args[1])
        ? (args[1] as Uri[]).filter((a): a is Uri => a instanceof Uri)
        : [args[0]];
    }
    return null;
  }

  /**
   * Run operation for all resources in a group across all repositories.
   * Replaces: runForAllChanges/runForAllStaged patterns
   */
  protected async runForAllInGroup(
    group: "changes" | "staged",
    fn: (repository: Repository, paths: string[]) => Promise<void>
  ): Promise<void> {
    const { commands } = await import("vscode");

    const sourceControlManager = (await commands.executeCommand(
      "sven.getSourceControlManager",
      ""
    )) as { repositories: Repository[] };

    for (const repository of sourceControlManager.repositories) {
      const resources = repository[group].resourceStates;
      const paths = resources.map(r => r.resourceUri.fsPath);
      if (paths.length > 0) {
        await fn(repository, paths);
      }
    }
  }

  protected runByRepository<T>(
    resource: Uri,
    fn: (repository: Repository, resource: Uri) => Promise<T>
  ): Promise<T[]>;
  protected runByRepository<T>(
    resources: Uri[],
    fn: (repository: Repository, resources: Uri[]) => Promise<T>
  ): Promise<T[]>;
  protected async runByRepository<T>(
    arg: Uri | Uri[],
    fn:
      | ((repository: Repository, resource: Uri) => Promise<T>)
      | ((repository: Repository, resources: Uri[]) => Promise<T>)
  ): Promise<T[]> {
    const resources = arg instanceof Uri ? [arg] : arg;
    const isSingleResource = arg instanceof Uri;

    const sourceControlManager =
      Command._sourceControlManager ||
      ((await commands.executeCommand(
        "sven.getSourceControlManager",
        ""
      )) as SourceControlManager);

    const groups: Array<{ repository: Repository; resources: Uri[] }> = [];

    for (const resource of resources) {
      const repository = sourceControlManager.getRepository(resource);

      if (!repository) {
        logWarning("Could not find Svn repository for resource");
        continue;
      }

      const tuple = groups.filter(p => p.repository === repository)[0];

      if (tuple) {
        tuple.resources.push(resource);
      } else {
        groups.push({ repository, resources: [resource] });
      }
    }

    const promises = groups.map(({ repository, resources }) => {
      if (isSingleResource) {
        return (fn as (repository: Repository, resource: Uri) => Promise<T>)(
          repository as Repository,
          resources[0]!
        );
      }
      return (fn as (repository: Repository, resources: Uri[]) => Promise<T>)(
        repository as Repository,
        resources
      );
    });

    return Promise.all(promises);
  }

  protected async getSCMResource(uri?: Uri): Promise<Resource | undefined> {
    uri = uri
      ? uri
      : window.activeTextEditor && window.activeTextEditor.document.uri;

    if (!uri) {
      return undefined;
    }

    if (uri.scheme === "svn") {
      const { fsPath } = fromSvnUri(uri);
      uri = Uri.file(fsPath);
    }

    if (uri.scheme === "file") {
      const sourceControlManager =
        Command._sourceControlManager ||
        ((await commands.executeCommand(
          "sven.getSourceControlManager",
          ""
        )) as SourceControlManager);
      const repository = sourceControlManager.getRepository(uri);

      if (!repository) {
        return undefined;
      }

      return repository.getResourceFromFile(uri);
    }

    // Unsupported URI scheme (e.g., untitled, output)
    return undefined;
  }

  protected async _openResource(
    resource: Resource,
    against?: string,
    preview?: boolean,
    preserveFocus?: boolean,
    preserveSelection?: boolean
  ): Promise<void> {
    // Property-only changes (status=NORMAL, props!=NONE) - show patch
    // VS Code diff can't show property changes, so show the SVN patch instead
    if (
      resource.type === Status.NORMAL &&
      resource.props &&
      resource.props !== PropStatus.NONE
    ) {
      const scm = Command._sourceControlManager;
      if (scm) {
        const repository = scm.getRepository(resource.resourceUri);
        if (repository) {
          const content = await repository.patch([resource.resourceUri.fsPath]);
          await this.showDiffPath(repository, content);
          return;
        }
      }
      // Fallback if can't get repository
      window.showInformationMessage(
        `Only SVN properties changed. Use 'svn diff' to see property changes.`
      );
      return;
    }

    let left = await this.getLeftResource(resource, against);
    let right = this.getRightResource(resource, against);
    const title = this.getTitle(resource, against);

    if (resource.remote && left) {
      [left, right] = [right, left];
    }

    if (!right) {
      window.showErrorMessage("Unable to open resource: file not found");
      return;
    }

    if (
      (await exists(right.fsPath)) &&
      (await stat(right.fsPath)).isDirectory()
    ) {
      return;
    }

    const opts: TextDocumentShowOptions = {
      preserveFocus,
      preview,
      viewColumn: ViewColumn.Active
    };

    const activeTextEditor = window.activeTextEditor;

    if (
      preserveSelection &&
      activeTextEditor &&
      activeTextEditor.document.uri.toString() === right.toString()
    ) {
      opts.selection = activeTextEditor.selection;
    }

    if (!left) {
      return commands.executeCommand<void>("vscode.open", right, opts);
    }

    return commands.executeCommand<void>(
      "vscode.diff",
      left,
      right,
      title,
      opts
    );
  }

  protected async getLeftResource(
    resource: Resource,
    against: string = ""
  ): Promise<Uri | undefined> {
    if (resource.remote) {
      if (resource.type !== Status.DELETED) {
        return toSvnUri(resource.resourceUri, SvnUriAction.SHOW, {
          ref: against
        });
      }
      return;
    }

    if (resource.type === Status.ADDED && resource.renameResourceUri) {
      return toSvnUri(resource.renameResourceUri, SvnUriAction.SHOW, {
        ref: against
      });
    }

    // Show file if has conflicts marks
    if (
      resource.type === Status.CONFLICTED &&
      (await exists(resource.resourceUri.fsPath))
    ) {
      const text = (await readFile(resource.resourceUri.fsPath, {
        encoding: "utf8"
      })) as string;

      // Check for lines begin with "<<<<<<", "=======", ">>>>>>>"
      if (/^<{7}[^]+^={7}[^]+^>{7}/m.test(text)) {
        return undefined;
      }
    }

    switch (resource.type) {
      case Status.CONFLICTED:
      case Status.MODIFIED:
      case Status.REPLACED:
        return toSvnUri(resource.resourceUri, SvnUriAction.SHOW, {
          ref: against
        });
    }

    return;
  }

  protected getRightResource(
    resource: Resource,
    against: string = ""
  ): Uri | undefined {
    if (resource.remote) {
      if (resource.type !== Status.ADDED) {
        return resource.resourceUri;
      }
      return;
    }
    switch (resource.type) {
      case Status.ADDED:
      case Status.CONFLICTED:
      case Status.IGNORED:
      case Status.MODIFIED:
      case Status.UNVERSIONED:
      case Status.REPLACED:
      case Status.NORMAL: // Property-only changes have status=NORMAL
        return resource.resourceUri;
      case Status.DELETED:
      case Status.MISSING:
        return toSvnUri(resource.resourceUri, SvnUriAction.SHOW, {
          ref: against
        });
    }

    return;
  }

  private getTitle(resource: Resource, against?: string): string {
    if (resource.type === Status.ADDED && resource.renameResourceUri) {
      const basename = path.basename(resource.renameResourceUri.fsPath);

      const newname = path.relative(
        path.dirname(resource.renameResourceUri.fsPath),
        resource.resourceUri.fsPath
      );
      if (against) {
        return `${basename} -> ${newname} (${against})`;
      }
      return `${basename} -> ${newname}`;
    }
    const basename = path.basename(resource.resourceUri.fsPath);

    if (against) {
      return `${basename} (${against})`;
    }

    return "";
  }

  protected async openChange(
    arg?: Resource | Uri,
    against?: string,
    resourceStates?: SourceControlResourceState[]
  ): Promise<void> {
    const preserveFocus = arg instanceof Resource;
    const preserveSelection = arg instanceof Uri || !arg;
    let resources: Resource[] | undefined;

    if (arg instanceof Uri) {
      const resource = await this.getSCMResource(arg);
      if (resource !== undefined) {
        resources = [resource];
      }
    } else {
      let resource: Resource | undefined;

      if (arg instanceof Resource) {
        resource = arg;
      } else {
        resource = await this.getSCMResource();
      }

      if (resource) {
        resources = [...(resourceStates as Resource[]), resource];
      }
    }

    if (!resources) {
      return;
    }

    const preview = resources.length === 1 ? undefined : false;
    for (const resource of resources) {
      await this._openResource(
        resource,
        against,
        preview,
        preserveFocus,
        preserveSelection
      );
    }
  }

  protected async showDiffPath(repository: Repository, content: string) {
    try {
      const tempFile = path.join(
        repository.root,
        getSvnDir(),
        "tmp",
        "sven.patch"
      );

      if (await exists(tempFile)) {
        try {
          await unlink(tempFile);
        } catch (err) {
          logError(`Failed to unlink temp file ${tempFile}`, err);
        }
      }

      const uri = Uri.file(tempFile).with({
        scheme: "untitled"
      });

      const document = await workspace.openTextDocument(uri);
      const textEditor = await window.showTextDocument(document);

      await textEditor.edit(e => {
        // if is opened, clear content
        e.delete(
          new Range(
            new Position(0, 0),
            new Position(Number.MAX_SAFE_INTEGER, 0)
          )
        );
        e.insert(new Position(0, 0), content);
      });
    } catch (error) {
      logError("Patch operation failed", error);
      window.showErrorMessage("Unable to patch");
    }
  }

  protected async _revertChanges(
    textEditor: TextEditor,
    changes: LineChange[]
  ): Promise<void> {
    const modifiedDocument = textEditor.document;
    const modifiedUri = modifiedDocument.uri;

    if (modifiedUri.scheme !== "file") {
      return;
    }

    const originalUri = toSvnUri(modifiedUri, SvnUriAction.SHOW, {
      ref: "BASE"
    });
    const originalDocument = await workspace.openTextDocument(originalUri);

    const result = applyLineChanges(
      originalDocument,
      modifiedDocument,
      changes
    );
    const edit = new WorkspaceEdit();
    edit.replace(
      modifiedUri,
      new Range(
        new Position(0, 0),
        modifiedDocument.lineAt(modifiedDocument.lineCount - 1).range.end
      ),
      result
    );
    workspace.applyEdit(edit);
    await modifiedDocument.save();
  }

  protected async addToIgnore(uris: Uri[]): Promise<void> {
    await this.runByRepository(uris, async (repository, resources) => {
      if (!repository) {
        return;
      }

      try {
        const ignored = await inputIgnoreList(repository, resources);

        if (ignored) {
          window.showInformationMessage(
            "svn:ignore set on parent folder - file(s) will be ignored"
          );
        }
      } catch (error) {
        logError("Property ignore operation failed", error);
        window.showErrorMessage("Unable to set property ignore");
      }
    });
  }

  /**
   * Execute operation on resource states grouped by repository.
   * Pattern: getResourceStates → map → runByRepository → error handling
   */
  protected async executeOnResources(
    resourceStates: SourceControlResourceState[],
    operation: (repository: Repository, paths: string[]) => Promise<void>,
    errorMsg: string
  ): Promise<void> {
    const selection = await this.getResourceStates(resourceStates);

    if (selection.length === 0) {
      return;
    }

    const uris = this.toUris(selection);

    await this.runByRepository(uris, async (repository, resources) => {
      if (!repository) {
        return;
      }

      const paths = this.toPaths(resources);

      try {
        await operation(repository, paths);
      } catch (error) {
        logError("Repository resource operation failed", error);
        // Extract SVN error message if available
        const err = error as {
          message?: string;
          stderr?: string;
          stderrFormated?: string;
        };
        const rawStderr = err?.stderrFormated || err?.stderr || "";
        const svnMsg = this.sanitizeStderr(rawStderr) || err?.message || "";
        const userMessage = svnMsg ? `${errorMsg}: ${svnMsg}` : errorMsg;

        // Offer cleanup button for cleanup-related errors
        if (this.needsCleanup(error)) {
          const runCleanup = "Run Cleanup";
          const choice = await window.showErrorMessage(userMessage, runCleanup);
          if (choice === runCleanup) {
            await commands.executeCommand("sven.cleanup");
          }
        } else {
          window.showErrorMessage(userMessage);
        }
      }
    });
  }

  /**
   * Execute operation on URIs or resource states (unified handler).
   * Handles both Explorer context menu (URIs) and SCM view (resource states).
   * Returns true if executed, false if cancelled/empty.
   */
  protected async executeOnUrisOrResources(
    args: unknown[],
    operation: (repository: Repository, paths: string[]) => Promise<void>,
    errorMsg: string
  ): Promise<boolean> {
    // Try URI path first (Explorer context menu)
    const uris = this.extractUris(args);
    if (uris) {
      await this.runByRepository(uris, async (repository, resources) => {
        const paths = resources.map(r => r.fsPath);
        try {
          await operation(repository, paths);
        } catch (error) {
          logError("URI operation failed", error);
          window.showErrorMessage(errorMsg);
        }
      });
      return true;
    }

    // Fall back to resource states (SCM view)
    const selection = await this.getResourceStatesOrExit(
      args as SourceControlResourceState[]
    );
    if (!selection) return false;

    await this.executeOnResources(selection, operation, errorMsg);
    return true;
  }

  /**
   * Sanitize stderr to prevent information disclosure.
   * Strips file paths, credentials, and internal URLs.
   * WARNING: When debug.disableSanitization enabled, returns raw stderr
   */
  private sanitizeStderr(stderr: string): string {
    if (!stderr) {
      return "";
    }

    // ⚠️ DEBUG MODE: Return raw stderr when sanitization disabled
    if (configuration.get<boolean>("debug.disableSanitization", false)) {
      return stderr;
    }

    return (
      stderr
        // Strip absolute file paths (Unix and Windows)
        .replace(/\/[^\s:]+/g, "[PATH]")
        .replace(/[A-Za-z]:\\[^\s:]+/g, "[PATH]")
        // Remove password parameters (handles quoted values with spaces)
        .replace(
          /password[=:]\s*(?:"[^"]*"|'[^']*'|\S+)/gi,
          "password=[REDACTED]"
        )
        .replace(
          /--password\s+(?:"[^"]*"|'[^']*'|\S+)/gi,
          "--password [REDACTED]"
        )
        // Remove username parameters (handles quoted values with spaces)
        .replace(
          /username[=:]\s*(?:"[^"]*"|'[^']*'|\S+)/gi,
          "username=[REDACTED]"
        )
        .replace(
          /--username\s+(?:"[^"]*"|'[^']*'|\S+)/gi,
          "--username [REDACTED]"
        )
        // Sanitize URLs (preserve protocol and domain, strip credentials)
        .replace(/https?:\/\/[^:@\s]+:[^@\s]+@/g, "https://[CREDENTIALS]@")
        // Strip internal IP addresses
        .replace(
          /\b(?:10|127|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
          "[INTERNAL_IP]"
        )
    );
  }

  /**
   * Extract error code from SVN error message.
   */
  private extractErrorCode(stderr: string): string | undefined {
    const match = stderr.match(/E\d{6}/);
    return match ? match[0] : undefined;
  }

  /**
   * Format user-friendly error message based on error type.
   * Includes error code for transparency (e.g., "Message (E155004)").
   * Provides actionable guidance for common errors.
   */
  private formatErrorMessage(error: unknown, fallbackMsg: string): string {
    const err = error as
      | { message?: string; stderr?: string; stderrFormated?: string }
      | undefined;
    const errorStr = err?.message || String(error) || "";
    const rawStderr = err?.stderr || err?.stderrFormated || "";
    const stderr = this.sanitizeStderr(rawStderr);
    const fullError = `${errorStr} ${stderr}`.toLowerCase();
    const code = this.extractErrorCode(`${errorStr} ${rawStderr}`);

    // Authentication errors - check FIRST (priority over network errors)
    // SVN may return E170013 with E215004 when auth fails
    if (
      fullError.includes("e170001") ||
      fullError.includes("e215004") ||
      fullError.includes("no more credentials") ||
      fullError.includes("authorization failed") ||
      fullError.includes("authentication failed")
    ) {
      const c = fullError.includes("e215004") ? "E215004" : "E170001";
      return `Authentication failed (${c}). Check credentials and try again.`;
    }

    // Network/connection errors (E170013)
    if (
      fullError.includes("e170013") ||
      fullError.includes("unable to connect") ||
      fullError.includes("connection refused") ||
      fullError.includes("could not resolve host")
    ) {
      return "Unable to connect (E170013). Check network and repository URL.";
    }

    // Timeout errors (E175002)
    if (
      fullError.includes("e175002") ||
      fullError.includes("timed out") ||
      fullError.includes("timeout") ||
      fullError.includes("operation timed out")
    ) {
      return "Network timeout (E175002). Try again or check network connection.";
    }

    // Out-of-date errors (E155019, E200042)
    if (
      fullError.includes("e155019") ||
      fullError.includes("e200042") ||
      fullError.includes("out of date") ||
      fullError.includes("not up-to-date")
    ) {
      const c = fullError.includes("e200042") ? "E200042" : "E155019";
      return `Working copy not up-to-date (${c}). Update before committing.`;
    }

    // Conflict errors (E155023, E200024)
    if (
      fullError.includes("e155023") ||
      fullError.includes("e200024") ||
      (fullError.includes("conflict") && !fullError.includes("resolved"))
    ) {
      const c = fullError.includes("e200024") ? "E200024" : "E155023";
      return `Conflict blocking operation (${c}). Resolve conflicts first.`;
    }

    // Lock errors (E200035, E200036, E200041)
    if (fullError.includes("e200035")) {
      return "Path already locked (E200035). Another user has the lock.";
    }
    if (fullError.includes("e200036")) {
      return "Path not locked (E200036). No lock to release.";
    }
    if (fullError.includes("e200041")) {
      return "Lock expired (E200041). Re-lock the file if needed.";
    }

    // Permission errors (E261001, E261002)
    if (fullError.includes("e261001")) {
      return "Access denied (E261001). Insufficient read permissions.";
    }
    if (fullError.includes("e261002")) {
      return "Partial access (E261002). Some items not visible.";
    }

    // Version mismatch (E250006)
    if (fullError.includes("e250006")) {
      return "Version mismatch (E250006). Client/server versions incompatible.";
    }

    // Working copy needs cleanup (E155004, E155037, E200030, E155032, E200033, etc.)
    if (
      fullError.includes("e155004") ||
      fullError.includes("e155037") ||
      fullError.includes("e200030") ||
      fullError.includes("e200033") ||
      fullError.includes("e155032") ||
      /\blocked\b/.test(fullError) ||
      fullError.includes("previous operation") ||
      fullError.includes("run 'cleanup'") ||
      /sqlite[:\[]/.test(fullError)
    ) {
      const c = code || "E155004";
      return `Working copy needs cleanup (${c}). Run cleanup to fix.`;
    }

    // Use fallback message for other errors (append code if found)
    return code ? `${fallbackMsg} (${code})` : fallbackMsg;
  }

  /**
   * Get full error string from error object.
   */
  private getFullErrorString(error: unknown): string {
    const err = error as
      | { message?: string; stderr?: string; stderrFormated?: string }
      | undefined;
    const errorStr = err?.message || String(error) || "";
    const rawStderr = err?.stderr || err?.stderrFormated || "";
    return `${errorStr} ${rawStderr}`.toLowerCase();
  }

  /**
   * Check if an error indicates that cleanup is needed.
   * Returns true for E155xxx working copy errors and related text patterns.
   * @see https://subversion.apache.org/docs/api/1.11/svn__error__codes_8h.html
   */
  private needsCleanup(error: unknown): boolean {
    const fullError = this.getFullErrorString(error);

    return (
      // Working copy locked/lock errors
      fullError.includes("e155004") || // WC locked / already locked
      fullError.includes("e155005") || // WC not locked (inconsistent state)
      fullError.includes("e155009") || // Failed to run WC DB work queue
      fullError.includes("e155010") || // Node in inconsistent state
      fullError.includes("e155015") || // Another client has the lock
      fullError.includes("e155016") || // WC database corrupt
      fullError.includes("e155031") || // Obstructed update
      fullError.includes("e155032") || // WC upgrade required
      fullError.includes("e155037") || // Previous operation not finished
      // SQLite/database errors
      fullError.includes("e200030") ||
      fullError.includes("e200033") ||
      fullError.includes("e200034") ||
      // Text pattern detection
      /\blocked\b/.test(fullError) ||
      fullError.includes("previous operation") ||
      fullError.includes("run 'cleanup'") ||
      fullError.includes("work queue") ||
      fullError.includes("is corrupt") ||
      fullError.includes("disk image is malformed") ||
      /sqlite[:\[]/.test(fullError)
    );
  }

  /**
   * Check if error indicates working copy needs update.
   * Returns true for E155019, E200042, and related text patterns.
   */
  private needsUpdate(error: unknown): boolean {
    const fullError = this.getFullErrorString(error);

    return (
      fullError.includes("e155019") ||
      fullError.includes("e200042") ||
      fullError.includes("out of date") ||
      fullError.includes("not up-to-date")
    );
  }

  /**
   * Check if error indicates conflicts need resolution.
   * Returns true for E155023, E200024, and related text patterns.
   */
  private needsConflictResolution(error: unknown): boolean {
    const fullError = this.getFullErrorString(error);

    return (
      fullError.includes("e155023") ||
      fullError.includes("e200024") ||
      (fullError.includes("conflict") && !fullError.includes("resolved"))
    );
  }

  /**
   * Check if error indicates authentication action needed.
   * Returns true for E170001 (auth failed), E215004 (no credentials).
   */
  private needsAuthAction(error: unknown): boolean {
    const fullError = this.getFullErrorString(error);

    return (
      fullError.includes("e170001") ||
      fullError.includes("e215004") ||
      fullError.includes("no more credentials") ||
      fullError.includes("authorization failed") ||
      fullError.includes("authentication failed")
    );
  }

  /**
   * Check if error indicates network retry might help.
   * Returns true for E170013 (connection failed), E175002 (timeout).
   */
  private needsNetworkRetry(error: unknown): boolean {
    const fullError = this.getFullErrorString(error);

    return (
      fullError.includes("e170013") ||
      fullError.includes("e175002") ||
      fullError.includes("unable to connect") ||
      fullError.includes("network timeout") ||
      fullError.includes("connection refused") ||
      fullError.includes("could not connect")
    );
  }

  /**
   * Check if error is a file lock issue (not working copy lock).
   * Returns the specific lock error type for choosing the right action.
   * E200035 (locked by other), E200036 (not locked), E200041 (expired)
   */
  private getLockErrorType(
    error: unknown
  ): "conflict" | "notLocked" | "expired" | null {
    const fullError = this.getFullErrorString(error);

    if (fullError.includes("e200035") || fullError.includes("already locked")) {
      return "conflict";
    }
    if (fullError.includes("e200036") || fullError.includes("not locked")) {
      return "notLocked";
    }
    if (fullError.includes("e200041") || fullError.includes("lock expired")) {
      return "expired";
    }
    return null;
  }

  /**
   * Check if error needs "Show Output" action for diagnostics.
   * E261001 (access denied), E261002 (partial), E250006 (version mismatch)
   */
  private needsOutputAction(error: unknown): boolean {
    const fullError = this.getFullErrorString(error);

    return (
      fullError.includes("e261001") ||
      fullError.includes("e261002") ||
      fullError.includes("e250006") ||
      fullError.includes("access denied") ||
      fullError.includes("permission denied") ||
      fullError.includes("not readable")
    );
  }

  /**
   * Handle repository operation with consistent error handling.
   * Pattern: try/catch with console.log + showErrorMessage
   * Offers actionable buttons based on error type.
   * Priority: auth > cleanup > update > conflict > lock > network > output
   */
  protected async handleRepositoryOperation<T>(
    operation: () => Promise<T>,
    errorMsg: string
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      logError("Repository operation failed", error);
      const userMessage = this.formatErrorMessage(error, errorMsg);

      // Auth errors - highest priority (often appears with network errors)
      if (this.needsAuthAction(error)) {
        const clearCreds = "Clear Credentials";
        const choice = await window.showErrorMessage(userMessage, clearCreds);
        if (choice === clearCreds) {
          await commands.executeCommand("sven.clearCredentials");
        }
      }
      // Cleanup for working copy issues
      else if (this.needsCleanup(error)) {
        const runCleanup = "Run Cleanup";
        const choice = await window.showErrorMessage(userMessage, runCleanup);
        if (choice === runCleanup) {
          await commands.executeCommand("sven.cleanup");
        }
      }
      // Update for out-of-date errors
      else if (this.needsUpdate(error)) {
        const runUpdate = "Update";
        const choice = await window.showErrorMessage(userMessage, runUpdate);
        if (choice === runUpdate) {
          await commands.executeCommand("sven.update");
        }
      }
      // Conflict resolution
      else if (this.needsConflictResolution(error)) {
        const resolveConflicts = "Resolve Conflicts";
        const choice = await window.showErrorMessage(
          userMessage,
          resolveConflicts
        );
        if (choice === resolveConflicts) {
          await commands.executeCommand("sven.resolveAll");
        }
      }
      // File lock errors (not working copy lock)
      else if (this.getLockErrorType(error) !== null) {
        const lockType = this.getLockErrorType(error);
        if (lockType === "conflict") {
          const stealLock = "Steal Lock";
          const choice = await window.showErrorMessage(userMessage, stealLock);
          if (choice === stealLock) {
            await commands.executeCommand("sven.stealLock");
          }
        } else if (lockType === "notLocked" || lockType === "expired") {
          const acquireLock = "Lock File";
          const choice = await window.showErrorMessage(
            userMessage,
            acquireLock
          );
          if (choice === acquireLock) {
            await commands.executeCommand("sven.lock");
          }
        }
      }
      // Network errors - offer retry
      else if (this.needsNetworkRetry(error)) {
        const retry = "Retry";
        const choice = await window.showErrorMessage(userMessage, retry);
        if (choice === retry) {
          // Re-run the operation
          return this.handleRepositoryOperation(operation, errorMsg);
        }
      }
      // Permission/diagnostic errors - show output
      else if (this.needsOutputAction(error)) {
        const showOutput = "Show Output";
        const choice = await window.showErrorMessage(userMessage, showOutput);
        if (choice === showOutput) {
          await commands.executeCommand("sven.showOutput");
        }
      } else {
        window.showErrorMessage(userMessage);
      }

      return undefined;
    }
  }

  /**
   * Execute operation on each path with success/error feedback.
   * Common pattern: loop paths, count successes, show messages.
   *
   * @param paths Paths to operate on
   * @param operation Function returning { exitCode, stderr? } or void
   * @param successMsg Message template: string with {count} or function
   * @param errorPrefix Prefix for error message
   * @param options.ignoreErrors If true, don't track/show errors
   * @returns Number of successful operations
   */
  protected async executeWithFeedback(
    paths: string[],
    operation: (
      path: string
    ) => Promise<{ exitCode: number; stderr?: string } | void>,
    successMsg: string | ((count: number) => string),
    errorPrefix: string,
    options?: { ignoreErrors?: boolean }
  ): Promise<number> {
    let successCount = 0;
    let errorMessage = "";

    for (const filePath of paths) {
      try {
        const result = await operation(filePath);
        if (!result || result.exitCode === 0) {
          successCount++;
        } else if (!options?.ignoreErrors) {
          errorMessage = result.stderr || "Unknown error";
        }
      } catch (error) {
        if (!options?.ignoreErrors) {
          errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        }
      }
    }

    if (successCount > 0) {
      const msg =
        typeof successMsg === "function"
          ? successMsg(successCount)
          : successMsg.replace("{count}", String(successCount));
      window.showInformationMessage(msg);
    }

    if (errorMessage) {
      window.showErrorMessage(`${errorPrefix}: ${errorMessage}`);
    }

    return successCount;
  }

  /**
   * Execute revert operation with depth check and confirmation.
   * Shared by revert and revertExplorer commands.
   */
  protected async executeRevert(
    uris: Uri[],
    depth: keyof typeof import("../common/types").SvnDepth
  ): Promise<void> {
    await this.runByRepository(uris, async (repository, resources) => {
      if (!repository) {
        return;
      }

      const paths = resources.map(resource => resource.fsPath).reverse();

      try {
        await repository.revert(paths, depth);
      } catch (error) {
        logError("Revert operation failed", error);
        window.showErrorMessage("Unable to revert");
      }
    });
  }
}
