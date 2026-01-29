// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";

/**
 * Show modal confirmation with custom button label.
 * VS Code modal dialogs automatically include a Cancel button.
 * @returns true if confirmed, false if cancelled
 */
export async function confirm(
  message: string,
  confirmLabel = "Yes"
): Promise<boolean> {
  const answer = await window.showWarningMessage(
    message,
    { modal: true },
    confirmLabel
  );
  return answer === confirmLabel;
}

/**
 * Show modal confirmation for destructive operations.
 * @returns true if confirmed, false if cancelled
 */
export async function confirmDestructive(
  message: string,
  confirmLabel: string
): Promise<boolean> {
  return confirm(message, confirmLabel);
}

/**
 * Confirm revert operation that will wipe local changes.
 */
export async function confirmRevert(): Promise<boolean> {
  return confirmDestructive(
    "Are you sure? This will wipe all local changes.",
    "Yes, revert"
  );
}

/**
 * Confirm rollback to a specific revision.
 */
export async function confirmRollback(revision: string): Promise<boolean> {
  return confirmDestructive(
    `Rollback file to revision ${revision}? This will modify your working copy.`,
    "Yes, rollback"
  );
}
