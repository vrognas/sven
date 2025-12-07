// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnLogEntry } from "../common/types";

/**
 * Filter criteria for log entries.
 * - path: Server-side filter via SVN target argument
 * - author: Client-side filter (SVN --search is too broad)
 * - dateFrom/dateTo: Server-side via SVN -r {date}:{date}
 */
export interface ILogFilter {
  author?: string;
  dateFrom?: string; // ISO date string YYYY-MM-DD
  dateTo?: string; // ISO date string YYYY-MM-DD
  path?: string; // Path pattern (relative from repo root)
}

/**
 * Filter log entries client-side.
 * - Author filtering must be done client-side (SVN --search is too broad)
 * - Date/path filtering is done server-side but may need client verification
 */
export function filterLogEntries(
  entries: ISvnLogEntry[],
  filter: ILogFilter
): ISvnLogEntry[] {
  return entries.filter(entry => {
    // Author filter (case-insensitive)
    if (filter.author) {
      if (entry.author.toLowerCase() !== filter.author.toLowerCase()) {
        return false;
      }
    }

    // Date range filter (client-side verification after SVN fetch)
    if (filter.dateFrom) {
      const entryDate = new Date(entry.date);
      const fromDate = new Date(filter.dateFrom);
      if (entryDate < fromDate) {
        return false;
      }
    }
    if (filter.dateTo) {
      const entryDate = new Date(entry.date);
      // dateTo is inclusive - add 1 day to include full day
      const toDate = new Date(filter.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      if (entryDate >= toDate) {
        return false;
      }
    }

    // Path filter - check if any path in commit matches pattern
    if (filter.path) {
      const pathPattern = filter.path.toLowerCase();
      const hasMatchingPath = entry.paths.some(p =>
        p._.toLowerCase().includes(pathPattern)
      );
      if (!hasMatchingPath) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if any filter is active
 */
export function hasActiveFilter(filter?: ILogFilter): boolean {
  if (!filter) return false;
  return !!(filter.author || filter.dateFrom || filter.dateTo || filter.path);
}

/**
 * Get a human-readable summary of active filters
 */
export function getFilterSummary(filter?: ILogFilter): string {
  if (!filter || !hasActiveFilter(filter)) {
    return "";
  }

  const parts: string[] = [];
  if (filter.author) {
    parts.push(`author:${filter.author}`);
  }
  if (filter.dateFrom && filter.dateTo) {
    parts.push(`${filter.dateFrom} to ${filter.dateTo}`);
  } else if (filter.dateFrom) {
    parts.push(`from ${filter.dateFrom}`);
  } else if (filter.dateTo) {
    parts.push(`until ${filter.dateTo}`);
  }
  if (filter.path) {
    parts.push(`path:${filter.path}`);
  }
  return parts.join(" | ");
}
