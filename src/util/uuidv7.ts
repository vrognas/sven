// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * UUIDv7 Utilities
 *
 * Provides time-ordered unique identifiers for:
 * - LRU cache keys (sort by ID = chronological)
 * - Operation tracking (extract timestamp from ID)
 * - Request deduplication (detect stale operations)
 */

import { uuidv7 } from "uuidv7";

/**
 * Generate a new UUIDv7 identifier
 * Format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
 * First 48 bits encode millisecond timestamp
 */
export function generateId(): string {
  return uuidv7();
}

/**
 * Extract Unix timestamp (ms) from UUIDv7
 * Returns 0 for invalid UUIDs
 */
export function extractTimestamp(id: string): number {
  if (!id || id.length < 13) {
    return 0;
  }

  try {
    // UUIDv7 format: xxxxxxxx-xxxx-7xxx-...
    // First 48 bits (12 hex chars) = timestamp
    const hexTimestamp = id.slice(0, 8) + id.slice(9, 13);
    const timestamp = parseInt(hexTimestamp, 16);
    return isNaN(timestamp) ? 0 : timestamp;
  } catch {
    return 0;
  }
}

/**
 * Check if ID is older than specified milliseconds
 * Returns true for invalid IDs (fail-safe for stale detection)
 */
export function isOlderThan(id: string, ms: number): boolean {
  const timestamp = extractTimestamp(id);
  if (timestamp === 0) {
    return true; // Invalid ID treated as stale
  }
  return Date.now() - timestamp > ms;
}

/**
 * Compare two UUIDv7 IDs chronologically
 * Returns negative if a < b, positive if a > b, 0 if equal
 * Lexicographic comparison works due to UUIDv7 time-ordering
 */
export function compareIds(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Find oldest ID from a collection (for LRU eviction)
 * Returns undefined if collection is empty
 */
export function findOldestId<T>(
  entries: Iterable<[string, T]>,
  getIdFn: (value: T) => string
): string | undefined {
  let oldestKey: string | undefined;
  let oldestId: string | undefined;

  for (const [key, value] of entries) {
    const id = getIdFn(value);
    if (!oldestId || compareIds(id, oldestId) < 0) {
      oldestId = id;
      oldestKey = key;
    }
  }

  return oldestKey;
}
