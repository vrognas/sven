// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { generateId, isOlderThan } from "../util/uuidv7";

// Minimum poll interval (ms) to prevent rapid-fire polling
const MIN_POLL_INTERVAL_MS = 1000;

/**
 * Configuration for remote change polling
 */
export type RemoteChangeConfig = {
  /** Check frequency in seconds. 0 = disabled */
  readonly checkFrequencySeconds: number;
};

/**
 * Service for polling remote SVN changes at configurable intervals.
 * Extracted from Repository (lines 275-318, 387-401).
 *
 * Responsibilities:
 * - Manage polling interval lifecycle
 * - Trigger status checks at configured frequency
 * - Handle config changes (restart with new frequency)
 * - Safe cleanup on dispose (no timer leaks)
 *
 * Does NOT:
 * - Execute SVN commands (Repository concern)
 * - Parse status (StatusService concern)
 * - Update UI (Repository concern)
 */
export interface IRemoteChangeService {
  /**
   * Start polling for remote changes.
   * Creates interval based on config.checkFrequencySeconds.
   * Does nothing if frequency is 0 (disabled).
   */
  start(): void;

  /**
   * Stop polling and clear interval.
   * Safe to call multiple times.
   */
  stop(): void;

  /**
   * Restart polling with current config.
   * Equivalent to stop() then start().
   * Useful when config changes.
   */
  restart(): void;

  /**
   * Check if polling is currently active.
   */
  readonly isRunning: boolean;

  /**
   * Dispose service and cleanup all resources.
   * After disposal, service cannot be restarted.
   */
  dispose(): void;
}

/**
 * Implementation of remote change polling service
 * Uses UUIDv7 for poll deduplication (prevents rapid-fire polling)
 */
export class RemoteChangeService implements IRemoteChangeService {
  private interval?: NodeJS.Timeout;
  private disposed: boolean = false;
  private lastPollId?: string; // UUIDv7 for poll timing (deduplication)

  /**
   * @param onPoll Callback invoked at each poll interval
   * @param getConfig Function to retrieve current config (allows dynamic updates)
   */
  constructor(
    private readonly onPoll: () => Promise<void> | void,
    private readonly getConfig: () => RemoteChangeConfig
  ) {}

  start(): void {
    if (this.disposed) {
      throw new Error("Cannot start disposed RemoteChangeService");
    }

    // Clear any existing interval
    this.stop();

    const config = this.getConfig();
    const frequencyMs = config.checkFrequencySeconds * 1000;

    // Don't create interval if disabled
    if (frequencyMs === 0) {
      return;
    }

    this.interval = setInterval(() => {
      // Deduplication: Skip if last poll was too recent (prevents overlapping polls)
      if (
        this.lastPollId &&
        !isOlderThan(this.lastPollId, MIN_POLL_INTERVAL_MS)
      ) {
        return; // Skip this poll cycle
      }

      // Record poll start time via UUIDv7
      this.lastPollId = generateId();

      void Promise.resolve(this.onPoll()).catch((err: any) => {
        console.error("[RemoteChangeService] Polling failed:", err);
        // Continue polling despite errors
      });
    }, frequencyMs);
  }

  stop(): void {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.lastPollId = undefined; // Reset poll tracking
  }

  restart(): void {
    this.start();
  }

  get isRunning(): boolean {
    return this.interval !== undefined;
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
  }
}
