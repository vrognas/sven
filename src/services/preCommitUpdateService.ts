// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { CancellationToken, ProgressLocation, window } from "vscode";
import { Repository } from "../repository";

/**
 * Result of pre-commit update operation
 */
export interface UpdateResult {
  success: boolean;
  revision?: number;
  hasConflicts?: boolean;
  cancelled?: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * User choice for conflict resolution
 */
export type ConflictChoice = "abort" | "continue";

/**
 * Service for running SVN update before commit.
 * Checks for remote changes first, only updates if needed.
 * Uses cached polling result when fresh enough to avoid redundant network call.
 */
export class PreCommitUpdateService {
  /**
   * Run SVN update with progress notification.
   * First checks if server has new commits - skips update if already at HEAD.
   * Reuses cached remote-check result from background polling when fresh.
   */
  async runUpdate(repository: Repository, files?: string[]): Promise<UpdateResult> {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Checking for updates...",
        cancellable: true
      },
      async (progress, token: CancellationToken) => {
        if (token.isCancellationRequested) {
          return { success: false, cancelled: true };
        }

        try {
          // Check if update is needed — reuse cached result if fresh
          progress.report({ message: "Checking server for new commits..." });
          let hasChanges: boolean;

          const cached = repository.getLastRemoteCheckResult();
          const frequencyMs = repository.getRemoteCheckFrequencyMs();
          if (
            cached &&
            frequencyMs > 0 &&
            Date.now() - cached.timestamp < frequencyMs
          ) {
            hasChanges = cached.hasChanges;
          } else {
            hasChanges = await repository.hasRemoteChanges();
          }

          if (!hasChanges) {
            // Already at HEAD, skip update
            return { success: true, skipped: true };
          }

          if (token.isCancellationRequested) {
            return { success: false, cancelled: true };
          }

          progress.report({ message: "Running svn update..." });
          const updateResult = await repository.updateRevision(false, { token, files });

          if (updateResult.conflicts.length > 0) {
            return {
              success: false,
              hasConflicts: true,
              revision: updateResult.revision ?? undefined
            };
          }

          return {
            success: true,
            revision: updateResult.revision ?? undefined
          };
        } catch (error: unknown) {
          const errorMsg = (error as Error)?.message || String(error);

          // Check for cancellation (exitCode 130 from killed SVN process)
          if ((error as { exitCode?: number }).exitCode === 130) {
            return { success: false, cancelled: true };
          }

          // Check for conflict error codes
          if (
            errorMsg.includes("E155015") ||
            errorMsg.includes("conflict") ||
            errorMsg.includes("E200024")
          ) {
            return {
              success: false,
              hasConflicts: true,
              error: errorMsg
            };
          }

          return {
            success: false,
            error: errorMsg
          };
        }
      }
    );
  }

  /**
   * Prompt user to choose action when conflicts detected
   */
  async promptConflictResolution(): Promise<ConflictChoice> {
    // Non-modal warning - less disruptive UX
    const choice = await window.showWarningMessage(
      "Conflicts detected during update. Resolve before committing?",
      "Resolve First",
      "Commit Anyway"
    );

    if (choice === "Commit Anyway") {
      return "continue";
    }

    return "abort";
  }
}
