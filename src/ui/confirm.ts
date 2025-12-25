// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";

/**
 * Show modal confirmation for destructive operations.
 * @returns true if confirmed, false if cancelled
 */
export async function confirmDestructive(
  message: string,
  confirmLabel: string
): Promise<boolean> {
  const answer = await window.showWarningMessage(
    message,
    { modal: true },
    confirmLabel,
    "Cancel"
  );
  return answer === confirmLabel;
}

/**
 * Show modal confirmation with custom button labels.
 * @returns true if confirmed, false if cancelled
 */
export async function confirm(
  message: string,
  confirmLabel = "Yes",
  cancelLabel = "Cancel"
): Promise<boolean> {
  const answer = await window.showWarningMessage(
    message,
    { modal: true },
    confirmLabel,
    cancelLabel
  );
  return answer === confirmLabel;
}
