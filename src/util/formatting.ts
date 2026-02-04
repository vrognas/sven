// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Shared formatting utilities for human-readable display.
 */

/**
 * Format bytes into human-readable size (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format seconds into human-readable duration (s, m, h).
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format speed in bytes/sec to human-readable form.
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024)
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024)
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
}

/**
 * Format file size (accepts string or number).
 * Returns empty string for invalid/missing input.
 */
export function formatSize(bytes?: string | number): string {
  if (bytes === undefined || bytes === null || bytes === "") return "";
  const n = typeof bytes === "number" ? bytes : parseInt(bytes, 10);
  if (isNaN(n)) return typeof bytes === "string" ? bytes : "";
  return formatBytes(n);
}

/**
 * Parse size string to bytes.
 */
export function parseSizeToBytes(size?: string): number {
  if (!size) return 0;
  const n = parseInt(size, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Format ISO 8601 date to YYYY-MM-DD HH:MM:SS.
 */
export function formatDate(isoDate?: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return isoDate.slice(0, 19).replace("T", " ");
  }
}

/**
 * Truncate string with ellipsis if exceeds max length.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Capitalize first letter of string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get relative time string (e.g., "2 days ago").
 * Used by blame annotations.
 */
export function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

/**
 * Format date for blame annotations (relative or absolute).
 * Used by BlameProvider and BlameStatusBar.
 */
export function formatBlameDate(
  dateStr: string | undefined,
  format: "relative" | "absolute"
): string {
  if (!dateStr) {
    return "unknown";
  }

  try {
    const date = new Date(dateStr);

    if (format === "relative") {
      return getRelativeTime(date);
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined
      });
    }
  } catch {
    return dateStr; // Fallback to raw string
  }
}
