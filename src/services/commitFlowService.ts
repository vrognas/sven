// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { QuickPickItem, QuickPickItemKind, window } from "vscode";
import { Repository } from "../repository";
import {
  ConventionalCommitService,
  ConventionalCommit
} from "./conventionalCommitService";
import { PreCommitUpdateService } from "./preCommitUpdateService";

/**
 * Result of the commit flow
 */
export interface CommitFlowResult {
  message?: string;
  cancelled: boolean;
}

/**
 * Options for commit flow
 */
export interface CommitFlowOptions {
  updateBeforeCommit?: boolean;
  conventionalCommits?: boolean;
}

interface TypePickItem extends QuickPickItem {
  type?: string;
  isPreviousMessage?: boolean;
  message?: string;
}

interface ConfirmPickItem extends QuickPickItem {
  action?: "commit" | "edit";
}

/**
 * Service orchestrating the multi-step commit QuickPick flow.
 * Implements VS Code UX guidelines for multi-step Quick Picks.
 */
export class CommitFlowService {
  private conventionalService: ConventionalCommitService;
  private updateService: PreCommitUpdateService;

  constructor(conventionalService?: ConventionalCommitService) {
    this.conventionalService =
      conventionalService || new ConventionalCommitService();
    this.updateService = new PreCommitUpdateService();
  }

  /**
   * Run the complete commit flow
   */
  async runCommitFlow(
    repository: Repository,
    filePaths: string[],
    options: CommitFlowOptions = {}
  ): Promise<CommitFlowResult> {
    const { updateBeforeCommit = false, conventionalCommits = true } = options;

    // Run pre-commit update if enabled
    if (updateBeforeCommit) {
      const updateResult = await this.updateService.runUpdate(repository);

      if (updateResult.cancelled) {
        return { cancelled: true };
      }

      if (updateResult.hasConflicts) {
        const choice = await this.updateService.promptConflictResolution();
        if (choice === "abort") {
          return { cancelled: true };
        }
      }

      if (!updateResult.success && !updateResult.hasConflicts) {
        window.showErrorMessage(`Update failed: ${updateResult.error}`);
        return { cancelled: true };
      }
    }

    // Build commit message
    let message: string | undefined;

    if (conventionalCommits) {
      message = await this.runConventionalFlow(repository, filePaths);
    } else {
      message = await this.runSimpleFlow(repository);
    }

    if (message === undefined) {
      return { cancelled: true };
    }

    return { message, cancelled: false };
  }

  /**
   * Run conventional commit flow with type selection
   */
  private async runConventionalFlow(
    repository: Repository,
    filePaths: string[]
  ): Promise<string | undefined> {
    // Step 1: Select commit type
    const typeResult = await this.showTypeStep(repository);
    if (!typeResult) {
      return undefined;
    }

    // Handle previous message selection
    if (typeResult.isPreviousMessage && typeResult.message) {
      return typeResult.message;
    }

    // Handle custom message
    if (typeResult.type === "custom") {
      return this.showCustomMessageStep(repository);
    }

    // Step 2: Enter scope (optional)
    const scope = await this.showScopeStep(repository);
    if (scope === undefined) {
      return undefined; // Cancelled
    }

    // Step 3: Enter description
    let description: string | undefined;
    let confirmed = false;

    while (!confirmed) {
      description = await this.showDescriptionStep(typeResult.type!, scope);
      if (description === undefined) {
        return undefined;
      }

      // Build message
      const commit: ConventionalCommit = {
        type: typeResult.type!,
        scope: scope || undefined,
        description
      };
      const message = this.conventionalService.format(commit);

      // Step 4: Confirm
      const confirmResult = await this.showConfirmStep(message, filePaths);
      if (confirmResult === undefined) {
        return undefined;
      }

      if (confirmResult === "commit") {
        confirmed = true;
        return message;
      }
      // confirmResult === "edit" -> loop again
    }

    return undefined;
  }

  /**
   * Show commit type selection (Step 1)
   */
  private async showTypeStep(
    repository: Repository
  ): Promise<TypePickItem | undefined> {
    const types = this.conventionalService.getCommitTypes();
    const items: TypePickItem[] = [];

    // Add previous message if available
    const prevMessage = repository.inputBox.value;
    if (prevMessage && prevMessage.trim()) {
      items.push({
        label: "$(history) Use previous message",
        description: this.truncate(prevMessage, 40),
        isPreviousMessage: true,
        message: prevMessage
      });
      items.push({
        label: "",
        kind: QuickPickItemKind.Separator
      });
    }

    // Add commit types
    for (const t of types) {
      items.push({
        label: `${t.icon} ${t.label}`,
        description: t.description,
        type: t.type
      });
    }

    const selected = await window.showQuickPick(items, {
      title: "Commit (1/3): Select type",
      placeHolder: "Choose commit type"
    });

    return selected;
  }

  /**
   * Show scope input (Step 2)
   */
  private async showScopeStep(
    repository: Repository
  ): Promise<string | undefined> {
    // Get recent scopes from repository if available
    const recentScopes = this.getRecentScopes(repository);
    const placeholder =
      recentScopes.length > 0
        ? `Optional scope (recent: ${recentScopes.join(", ")})`
        : "Optional scope (e.g., ui, api, core)";

    const scope = await window.showInputBox({
      title: "Commit (2/3): Enter scope",
      prompt: placeholder,
      placeHolder: "Leave empty to skip"
    });

    // undefined means cancelled, empty string means skipped
    return scope;
  }

  /**
   * Show description input (Step 3)
   */
  private async showDescriptionStep(
    type: string,
    scope: string
  ): Promise<string | undefined> {
    const prefix = scope ? `${type}(${scope}): ` : `${type}: `;
    const maxLen = this.conventionalService.getMaxLength() - prefix.length;

    const description = await window.showInputBox({
      title: "Commit (3/3): Enter description",
      prompt: `Max ${maxLen} chars`,
      placeHolder: "Brief description of changes",
      validateInput: value => {
        if (!value || value.trim() === "") {
          return "Description required";
        }
        if (value.length > maxLen) {
          return `Max ${maxLen} chars (${value.length})`;
        }
        return undefined;
      }
    });

    return description;
  }

  /**
   * Show confirmation step with file list
   */
  private async showConfirmStep(
    message: string,
    filePaths: string[]
  ): Promise<"commit" | "edit" | undefined> {
    const items: ConfirmPickItem[] = [
      {
        label: `$(check) Commit ${filePaths.length} file(s)`,
        description: message,
        action: "commit"
      },
      {
        label: "$(edit) Edit message",
        description: "Go back and change description",
        action: "edit"
      },
      {
        label: "",
        kind: QuickPickItemKind.Separator
      }
    ];

    // Add file list preview (max 5)
    const previewFiles = filePaths.slice(0, 5);
    for (const file of previewFiles) {
      items.push({
        label: `  $(file) ${this.getFileName(file)}`,
        description: this.getRelativePath(file)
      });
    }

    if (filePaths.length > 5) {
      items.push({
        label: `  ... and ${filePaths.length - 5} more`
      });
    }

    const selected = await window.showQuickPick(items, {
      title: "Confirm commit",
      placeHolder: message
    });

    if (!selected) {
      return undefined;
    }

    return selected.action;
  }

  /**
   * Show custom message input (skip conventional format)
   */
  private async showCustomMessageStep(
    repository: Repository
  ): Promise<string | undefined> {
    const maxLen = this.conventionalService.getMaxLength();

    return window.showInputBox({
      title: "Enter commit message",
      prompt: `Max ${maxLen} chars`,
      value: repository.inputBox.value,
      placeHolder: "Your commit message",
      validateInput: value => {
        if (!value || value.trim() === "") {
          return "Message required";
        }
        if (value.length > maxLen) {
          return `Max ${maxLen} chars (${value.length})`;
        }
        return undefined;
      }
    });
  }

  /**
   * Simple flow without conventional commits
   */
  private async runSimpleFlow(
    repository: Repository
  ): Promise<string | undefined> {
    return this.showCustomMessageStep(repository);
  }

  /**
   * Get recent scopes from repository (auto-detect from directory names)
   */
  private getRecentScopes(repository: Repository): string[] {
    // If repository has getRecentScopes method, use it
    const repoWithScopes = repository as Repository & {
      getRecentScopes?: () => string[];
    };
    if (typeof repoWithScopes.getRecentScopes === "function") {
      return repoWithScopes.getRecentScopes();
    }
    return [];
  }

  /**
   * Truncate string with ellipsis
   */
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) {
      return str;
    }
    return str.slice(0, maxLen - 3) + "...";
  }

  /**
   * Get file name from path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Get relative path (simplified)
   */
  private getRelativePath(filePath: string): string {
    const parts = filePath.replace(/\\/g, "/").split("/");
    if (parts.length <= 2) {
      return "";
    }
    return parts.slice(0, -1).join("/");
  }
}
