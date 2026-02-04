// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Line mapping from BASE revision to working copy.
 * Key = 1-indexed BASE line number
 * Value = 1-indexed working copy line number (undefined if line deleted)
 */
export type LineMapping = Map<number, number | undefined>;

/**
 * Compute line mapping from BASE content to working copy content.
 * Uses LCS (Longest Common Subsequence) to find matching lines,
 * then builds a mapping from BASE line numbers to working copy line numbers.
 *
 * @param baseLines Lines from BASE revision (committed version)
 * @param workingLines Lines from working copy (current editor)
 * @returns Map from BASE line number (1-indexed) to working copy line number
 */
export function computeLineMapping(
  baseLines: string[],
  workingLines: string[]
): LineMapping {
  const mapping: LineMapping = new Map();

  if (baseLines.length === 0) {
    return mapping;
  }

  // Compute LCS to find matching lines
  const lcs = computeLCS(baseLines, workingLines);

  // Build mapping using LCS matches
  // For each BASE line, find where it appears in working copy
  let workingIdx = 0;

  for (let baseIdx = 0; baseIdx < baseLines.length; baseIdx++) {
    const baseLine = baseLines[baseIdx]!;
    const baseLineNum = baseIdx + 1; // 1-indexed

    // Check if this line is in LCS (unchanged)
    const lcsMatch = lcs.find(
      m => m.baseIdx === baseIdx && m.workingIdx >= workingIdx
    );

    if (lcsMatch) {
      // Line found in LCS - direct mapping
      mapping.set(baseLineNum, lcsMatch.workingIdx + 1);
      workingIdx = lcsMatch.workingIdx + 1;
    } else {
      // Line not in LCS - try to find modified version nearby
      // Look for the line in working copy starting from current position
      const foundIdx = findModifiedLine(
        baseLine,
        workingLines,
        workingIdx,
        baseIdx,
        baseLines,
        lcs
      );

      if (foundIdx !== -1) {
        mapping.set(baseLineNum, foundIdx + 1);
        workingIdx = foundIdx + 1;
      } else {
        // Line was deleted or completely changed
        mapping.set(baseLineNum, undefined);
      }
    }
  }

  return mapping;
}

/**
 * LCS match entry
 */
interface LCSMatch {
  baseIdx: number;
  workingIdx: number;
}

/**
 * Compute Longest Common Subsequence of lines.
 * Returns array of matching (baseIdx, workingIdx) pairs.
 */
function computeLCS(base: string[], working: string[]): LCSMatch[] {
  const m = base.length;
  const n = working.length;

  // DP table for LCS length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (base[i - 1] === working[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to find LCS matches
  const matches: LCSMatch[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (base[i - 1] === working[j - 1]) {
      matches.unshift({ baseIdx: i - 1, workingIdx: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  return matches;
}

/**
 * Try to find a modified version of a line in working copy.
 * Handles cases where line content changed but is still "the same line".
 * Uses heuristics: same position or nearby with similar content.
 */
function findModifiedLine(
  baseLine: string,
  working: string[],
  startIdx: number,
  baseIdx: number,
  base: string[],
  lcs: LCSMatch[]
): number {
  // Strategy 1: Check if line at same relative position exists and isn't in LCS
  // (meaning it's a modification, not an insertion)
  if (startIdx < working.length) {
    const workingLine = working[startIdx]!;

    // Check if this working line is claimed by LCS (is an exact match with some base line)
    const isInLCS = lcs.some(m => m.workingIdx === startIdx);

    if (!isInLCS) {
      // This working line isn't an exact match with any base line
      // Check similarity - if lines share significant content, treat as modified
      if (isSimilarLine(baseLine, workingLine)) {
        return startIdx;
      }

      // Strategy 2: Context anchoring - if surrounding lines match, this is likely a modification
      // Check if there are LCS matches before and after that bracket this position
      const prevMatch = lcs.find(
        m => m.baseIdx < baseIdx && m.workingIdx < startIdx
      );
      const nextMatch = lcs.find(
        m => m.baseIdx > baseIdx && m.workingIdx > startIdx
      );

      // If we're between two anchored matches, treat as modified line
      if (prevMatch && nextMatch) {
        return startIdx;
      }

      // Also handle edge cases: first/last line with context
      if (baseIdx === 0 && nextMatch && startIdx === 0) {
        return startIdx;
      }
      if (
        baseIdx === base.length - 1 &&
        prevMatch &&
        startIdx === working.length - 1
      ) {
        return startIdx;
      }
    }
  }

  return -1;
}

/**
 * Check if two lines are similar enough to be considered "the same line modified".
 * Uses simple heuristic: shared words or similar length with some overlap.
 */
function isSimilarLine(line1: string, line2: string): boolean {
  // Exact match (shouldn't happen if called correctly, but safety check)
  if (line1 === line2) return true;

  // Empty lines
  if (line1.trim() === "" || line2.trim() === "") {
    return line1.trim() === line2.trim();
  }

  // Check word overlap
  const words1 = new Set(line1.toLowerCase().split(/\s+/));
  const words2 = new Set(line2.toLowerCase().split(/\s+/));

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word) && word.length > 2) {
      overlap++;
    }
  }

  // Consider similar if >40% word overlap
  const minWords = Math.min(words1.size, words2.size);
  if (minWords > 0 && overlap / minWords > 0.4) {
    return true;
  }

  // Check if lines have similar structure (same prefix/suffix)
  const prefix = commonPrefix(line1, line2);
  const suffix = commonSuffix(line1, line2);
  const minLen = Math.min(line1.length, line2.length);

  if (minLen > 0 && (prefix.length + suffix.length) / minLen > 0.5) {
    return true;
  }

  return false;
}

function commonPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  return a.slice(0, i);
}

function commonSuffix(a: string, b: string): string {
  let i = 0;
  while (
    i < a.length &&
    i < b.length &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  ) {
    i++;
  }
  return a.slice(a.length - i);
}
