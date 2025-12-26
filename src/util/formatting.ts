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
