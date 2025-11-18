"use strict";

import {
  Disposable,
  Range,
  TextEditor,
  TextEditorDecorationType,
  ThemeColor,
  Uri,
  window,
  workspace
} from "vscode";
import { debounce, throttle } from "../decorators";
import { ISvnBlameLine } from "../common/types";
import { Repository } from "../repository";
import { blameConfiguration } from "./blameConfiguration";
import { blameStateManager } from "./blameStateManager";

/**
 * BlameProvider manages gutter decorations for SVN blame
 * Per-repository instance (like StatusService)
 */
export class BlameProvider implements Disposable {
  private decorationType: TextEditorDecorationType;
  private blameCache = new Map<string, { data: ISvnBlameLine[]; version: number }>();
  private disposables: Disposable[] = [];
  private isActivated = false;

  constructor(private repository: Repository) {
    // Create decoration type (single instance, reused per line)
    this.decorationType = window.createTextEditorDecorationType({
      before: {
        color: new ThemeColor("editorCodeLens.foreground"),
        margin: "0 1.5em 0 0",
        fontStyle: "italic",
        fontWeight: "normal"
      },
      isWholeLine: false
    });
  }

  /**
   * Activate provider - register event handlers
   */
  public activate(): void {
    if (this.isActivated) {
      return;
    }

    this.disposables.push(
      // Editor changes
      window.onDidChangeActiveTextEditor(e => this.onActiveEditorChange(e)),

      // Document changes
      workspace.onDidChangeTextDocument(e => this.onDocumentChange(e)),
      workspace.onDidSaveTextDocument(d => this.onDocumentSave(d)),
      workspace.onDidCloseTextDocument(d => this.onDocumentClose(d)),

      // Visible range changes (for performance)
      window.onDidChangeTextEditorVisibleRanges(e => this.onVisibleRangeChange(e)),

      // State changes
      blameStateManager.onDidChangeState(uri => this.onBlameStateChange(uri)),
      blameConfiguration.onDidChange(e => this.onConfigurationChange(e))
    );

    this.isActivated = true;

    // Apply to current active editor
    if (window.activeTextEditor) {
      this.onActiveEditorChange(window.activeTextEditor);
    }
  }

  /**
   * Update decorations for editor (throttled to prevent spam)
   */
  @throttle
  public async updateDecorations(editor?: TextEditor): Promise<void> {
    const target = editor || window.activeTextEditor;
    if (!target) {
      return;
    }

    // Check if should decorate
    if (!this.shouldDecorate(target)) {
      this.clearDecorations(target);
      return;
    }

    // Large file check
    if (target.document.lineCount > 5000 && blameConfiguration.shouldWarnLargeFile()) {
      window.showWarningMessage(
        `File too large for blame (${target.document.lineCount} lines). Consider disabling blame.`
      );
      return;
    }

    try {
      // Fetch blame data (with cache)
      const blameData = await this.getBlameData(target.document.uri);
      if (!blameData) {
        this.clearDecorations(target);
        return;
      }

      // Create decorations
      const decorations = this.createDecorations(blameData, target);

      // Apply to editor
      target.setDecorations(this.decorationType, decorations);
    } catch (err) {
      console.error("BlameProvider: Failed to update decorations", err);
      this.clearDecorations(target);
    }
  }

  /**
   * Clear decorations for editor
   */
  public clearDecorations(editor?: TextEditor): void {
    const target = editor || window.activeTextEditor;
    if (target) {
      target.setDecorations(this.decorationType, []);
    }
  }

  /**
   * Clear cache for URI
   */
  public clearCache(uri: Uri): void {
    this.blameCache.delete(uri.toString());
  }

  /**
   * Dispose provider - cleanup resources
   */
  public dispose(): void {
    this.decorationType.dispose();
    this.blameCache.clear();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.isActivated = false;
  }

  // ===== Event Handlers =====

  private async onActiveEditorChange(editor: TextEditor | undefined): Promise<void> {
    if (!editor) {
      return;
    }

    await this.updateDecorations(editor);
  }

  @debounce(500)
  private onDocumentChange(event: { document: { uri: Uri } }): void {
    // Clear decorations on text change (debounced to wait for typing to stop)
    const editor = window.activeTextEditor;
    if (editor && editor.document.uri.toString() === event.document.uri.toString()) {
      this.clearDecorations(editor);
    }
  }

  private async onDocumentSave(document: { uri: Uri }): Promise<void> {
    // Invalidate cache and refresh on save
    this.clearCache(document.uri);

    const editor = window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
      await this.updateDecorations(editor);
    }
  }

  private onDocumentClose(document: { uri: Uri }): void {
    // Clear cache on close
    this.clearCache(document.uri);
  }

  private async onVisibleRangeChange(event: { textEditor: TextEditor }): Promise<void> {
    // Update decorations when scrolling (for future optimization)
    // Currently updates all decorations, but can be optimized to only visible range
    await this.updateDecorations(event.textEditor);
  }

  private async onBlameStateChange(uri: Uri | undefined): Promise<void> {
    // State toggled - update decorations
    const editor = window.activeTextEditor;
    if (!uri || (editor && editor.document.uri.toString() === uri.toString())) {
      await this.updateDecorations(editor);
    }
  }

  private async onConfigurationChange(_event: any): Promise<void> {
    // Config changed - recreate decoration type and refresh
    this.decorationType.dispose();
    this.decorationType = window.createTextEditorDecorationType({
      before: {
        color: new ThemeColor("editorCodeLens.foreground"),
        margin: "0 1.5em 0 0",
        fontStyle: "italic",
        fontWeight: "normal"
      },
      isWholeLine: false
    });

    // Refresh all editors
    if (window.activeTextEditor) {
      await this.updateDecorations(window.activeTextEditor);
    }
  }

  // ===== Helper Methods =====

  /**
   * Check if editor should show blame decorations
   */
  private shouldDecorate(editor: TextEditor): boolean {
    const uri = editor.document.uri;

    // Must be file scheme
    if (uri.scheme !== "file") {
      return false;
    }

    // Check configuration
    if (!blameConfiguration.isEnabled() || !blameConfiguration.isGutterEnabled()) {
      return false;
    }

    // Check state manager
    if (!blameStateManager.shouldShowBlame(uri)) {
      return false;
    }

    return true;
  }

  /**
   * Get blame data for URI (with caching)
   */
  private async getBlameData(uri: Uri): Promise<ISvnBlameLine[] | undefined> {
    const key = uri.toString();

    // Check cache
    const cached = this.blameCache.get(key);
    if (cached) {
      return cached.data;
    }

    // Fetch from repository
    try {
      const data = await this.repository.blame(uri.fsPath);

      // Cache with document version
      this.blameCache.set(key, { data, version: 0 });

      return data;
    } catch (err) {
      console.error("BlameProvider: Failed to fetch blame data", err);
      return undefined;
    }
  }

  /**
   * Create decoration options from blame data
   */
  private createDecorations(blameData: ISvnBlameLine[], editor: TextEditor): any[] {
    const decorations: any[] = [];
    const template = blameConfiguration.getGutterTemplate();
    const dateFormat = blameConfiguration.getDateFormat();

    for (const blameLine of blameData) {
      const lineIndex = blameLine.lineNumber - 1; // 1-indexed to 0-indexed

      // Skip if line doesn't exist in document
      if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
        continue;
      }

      const text = this.formatBlameText(blameLine, template, dateFormat);

      decorations.push({
        range: new Range(lineIndex, 0, lineIndex, 0),
        renderOptions: {
          before: {
            contentText: text
          }
        }
      });
    }

    return decorations;
  }

  /**
   * Format blame line using template
   */
  private formatBlameText(
    line: ISvnBlameLine,
    template: string,
    dateFormat: "relative" | "absolute"
  ): string {
    const revision = line.revision || "???";
    const author = line.author || "unknown";
    const date = this.formatDate(line.date, dateFormat);

    return template
      .replace(/\$\{revision\}/g, revision)
      .replace(/\$\{author\}/g, author)
      .replace(/\$\{date\}/g, date)
      .padEnd(30); // Ensure consistent spacing
  }

  /**
   * Format date (relative or absolute)
   */
  private formatDate(dateStr: string | undefined, format: "relative" | "absolute"): string {
    if (!dateStr) {
      return "unknown";
    }

    try {
      const date = new Date(dateStr);

      if (format === "relative") {
        return this.getRelativeTime(date);
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
        });
      }
    } catch {
      return dateStr; // Fallback to raw string
    }
  }

  /**
   * Get relative time string (e.g., "2 days ago")
   */
  private getRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
  }
}
