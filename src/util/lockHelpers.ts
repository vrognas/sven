// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { LockStatus } from "../common/types";

/**
 * Get human-readable tooltip for lock status.
 * @param status Lock status code (K/O/B/T)
 * @param owner Lock owner name (optional)
 * @param defaultText Text to return for unknown status (default: "")
 */
export function getLockTooltip(
  status?: LockStatus | null,
  owner?: string | null,
  defaultText = ""
): string {
  switch (status) {
    case LockStatus.K:
      return "Locked by you";
    case LockStatus.O:
      return owner ? `Locked by ${owner}` : "Locked by others";
    case LockStatus.B:
      return "Lock broken";
    case LockStatus.T:
      return owner ? `Lock stolen by ${owner}` : "Lock stolen";
    default:
      return defaultText;
  }
}
