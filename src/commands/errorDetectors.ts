// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import {
  AUTH_ERROR_TOKENS,
  CLEANUP_ERROR_TOKENS,
  CONFLICT_ERROR_TOKENS,
  FORMAT_NETWORK_CONNECTION_TOKENS,
  FORMAT_NETWORK_TIMEOUT_TOKENS,
  FORMAT_CLEANUP_TOKENS,
  LOCK_CONFLICT_TOKENS,
  LOCK_EXPIRED_TOKENS,
  LOCK_NOT_LOCKED_TOKENS,
  NETWORK_ERROR_TOKENS,
  OUTPUT_ERROR_TOKENS,
  UPDATE_ERROR_TOKENS
} from "./errorPatterns";
import { includesAny } from "./errorUtils";

function hasBlockedWord(fullError: string): boolean {
  return /\blocked\b/.test(fullError);
}

function hasSqliteMarker(fullError: string): boolean {
  return /sqlite[:\[]/.test(fullError);
}

function hasUnresolvedConflictMarker(fullError: string): boolean {
  return fullError.includes("conflict") && !fullError.includes("resolved");
}

export function needsCleanupFromFullError(fullError: string): boolean {
  return (
    includesAny(fullError, CLEANUP_ERROR_TOKENS) ||
    hasBlockedWord(fullError) ||
    hasSqliteMarker(fullError)
  );
}

export function needsFormatCleanupFromFullError(fullError: string): boolean {
  return (
    includesAny(fullError, FORMAT_CLEANUP_TOKENS) ||
    hasBlockedWord(fullError) ||
    hasSqliteMarker(fullError)
  );
}

export function hasFormatConnectionErrorFromFullError(
  fullError: string
): boolean {
  return includesAny(fullError, FORMAT_NETWORK_CONNECTION_TOKENS);
}

export function hasFormatTimeoutErrorFromFullError(fullError: string): boolean {
  return includesAny(fullError, FORMAT_NETWORK_TIMEOUT_TOKENS);
}

export function needsUpdateFromFullError(fullError: string): boolean {
  return includesAny(fullError, UPDATE_ERROR_TOKENS);
}

export function needsConflictResolutionFromFullError(
  fullError: string
): boolean {
  return (
    includesAny(fullError, CONFLICT_ERROR_TOKENS) ||
    hasUnresolvedConflictMarker(fullError)
  );
}

export function needsAuthActionFromFullError(fullError: string): boolean {
  return includesAny(fullError, AUTH_ERROR_TOKENS);
}

export function needsNetworkRetryFromFullError(fullError: string): boolean {
  return includesAny(fullError, NETWORK_ERROR_TOKENS);
}

export type LockErrorType = "conflict" | "notLocked" | "expired";

export function getLockErrorTypeFromFullError(
  fullError: string
): LockErrorType | null {
  if (includesAny(fullError, LOCK_CONFLICT_TOKENS)) {
    return "conflict";
  }
  if (includesAny(fullError, LOCK_NOT_LOCKED_TOKENS)) {
    return "notLocked";
  }
  if (includesAny(fullError, LOCK_EXPIRED_TOKENS)) {
    return "expired";
  }

  return null;
}

export function needsOutputActionFromFullError(fullError: string): boolean {
  return includesAny(fullError, OUTPUT_ERROR_TOKENS);
}
