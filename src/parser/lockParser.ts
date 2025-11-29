// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnLockInfo } from "../common/types";
import { XmlParserAdapter } from "./xmlParserAdapter";
import { logError } from "../util/errorLogger";

interface ParsedLock {
  token?: string;
  owner?: string;
  comment?: string;
  created?: string;
}

interface ParsedEntry {
  lock?: ParsedLock;
}

interface ParsedInfo {
  entry?: ParsedEntry;
}

/**
 * Parse lock information from svn info --xml output.
 * Returns lock info if file is locked, null otherwise.
 */
export function parseLockInfo(content: string): ISvnLockInfo | null {
  if (!content || content.trim() === "") {
    throw new Error("Cannot parse lock info: empty XML content");
  }

  try {
    const result = XmlParserAdapter.parse(content, {
      mergeAttrs: true,
      explicitRoot: false,
      explicitArray: false,
      camelcase: true
    }) as ParsedInfo;

    if (!result.entry) {
      throw new Error("Invalid info XML: missing entry element");
    }

    const lock = result.entry.lock;
    if (!lock) {
      // File is not locked
      return null;
    }

    // Validate required lock fields
    if (!lock.owner || !lock.token || !lock.created) {
      throw new Error("Incomplete lock data: missing required fields");
    }

    return {
      owner: lock.owner,
      token: lock.token,
      comment: lock.comment,
      created: lock.created
    };
  } catch (err) {
    logError("parseLockInfo error", err);
    throw err instanceof Error
      ? err
      : new Error(`Failed to parse lock XML: Unknown error`);
  }
}
