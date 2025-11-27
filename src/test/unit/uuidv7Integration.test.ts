// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * UUIDv7 Integration Tests
 *
 * Tests for UUIDv7-based improvements:
 * 1. LRU cache with UUIDv7 access tracking
 * 2. Global sequentialize with operation IDs
 * 3. In-flight request tracking
 * 4. Blame cache versioning
 * 5. Remote change polling deduplication
 */

import * as assert from "assert";
import {
  generateId,
  extractTimestamp,
  isOlderThan,
  compareIds
} from "../../util/uuidv7";

suite("UUIDv7 Integration", () => {
  suite("LRU Cache Access Tracking", () => {
    test("UUIDv7 provides chronological ordering for eviction", () => {
      // Simulate cache access order tracking with UUIDv7
      const accessOrder = new Map<string, string>();

      // Add entries at different "times"
      const key1 = "file1.txt";
      const key2 = "file2.txt";
      const key3 = "file3.txt";

      accessOrder.set(key1, generateId());
      accessOrder.set(key2, generateId());
      accessOrder.set(key3, generateId());

      // Find oldest entry via lexicographic sort
      const sorted = [...accessOrder.entries()].sort((a, b) =>
        compareIds(a[1], b[1])
      );

      assert.strictEqual(sorted[0][0], key1, "First added should be oldest");
      assert.strictEqual(sorted[2][0], key3, "Last added should be newest");
    });

    test("UUIDv7 update moves entry to newest position", () => {
      const accessOrder = new Map<string, string>();

      const key1 = "file1.txt";
      const key2 = "file2.txt";

      // Initial access
      accessOrder.set(key1, generateId());
      accessOrder.set(key2, generateId());

      // Re-access key1 (updates timestamp)
      accessOrder.set(key1, generateId());

      // key2 should now be oldest
      const sorted = [...accessOrder.entries()].sort((a, b) =>
        compareIds(a[1], b[1])
      );

      assert.strictEqual(
        sorted[0][0],
        key2,
        "key2 should be oldest after key1 re-accessed"
      );
    });
  });

  suite("Operation Tracking with UUIDv7", () => {
    test("can detect stale operations via ID timestamp", async () => {
      const opId = generateId();

      // Fresh operation should not be stale
      assert.strictEqual(
        isOlderThan(opId, 30000),
        false,
        "Fresh op should not be stale"
      );

      // After delay, should detect as old
      await new Promise(r => setTimeout(r, 60));
      assert.strictEqual(
        isOlderThan(opId, 50),
        true,
        "Op should be stale after 50ms"
      );
    });

    test("operation IDs can be used for queue ordering", () => {
      type QueuedOp = { id: string; name: string };
      const queue: QueuedOp[] = [];

      queue.push({ id: generateId(), name: "op1" });
      queue.push({ id: generateId(), name: "op2" });
      queue.push({ id: generateId(), name: "op3" });

      // Sort by ID = chronological order
      queue.sort((a, b) => compareIds(a.id, b.id));

      assert.strictEqual(queue[0].name, "op1");
      assert.strictEqual(queue[2].name, "op3");
    });
  });

  suite("In-Flight Request Tracking", () => {
    test("can track request timing via UUIDv7", async () => {
      type InFlightRequest = { id: string; promise: Promise<void> };
      const inFlight = new Map<string, InFlightRequest>();

      const key = "file.txt";
      const requestId = generateId();
      const startTime = extractTimestamp(requestId);

      inFlight.set(key, {
        id: requestId,
        promise: new Promise(r => setTimeout(r, 50))
      });

      // Wait for request to complete
      await inFlight.get(key)!.promise;
      const endTime = Date.now();

      // Duration can be calculated from ID
      const duration = endTime - startTime;
      assert.ok(duration >= 50, `Duration ${duration}ms should be >= 50ms`);
    });

    test("can detect slow requests via ID age", async () => {
      const requestId = generateId();

      // Wait 60ms
      await new Promise(r => setTimeout(r, 60));

      // Check if request is "slow" (>50ms)
      assert.strictEqual(
        isOlderThan(requestId, 50),
        true,
        "Request should be flagged as slow"
      );
    });
  });

  suite("Cache Versioning with UUIDv7", () => {
    test("cache entry includes creation timestamp in ID", () => {
      type CacheEntry<T> = { data: T; cacheId: string };

      const cache = new Map<string, CacheEntry<string>>();
      const key = "data.json";

      cache.set(key, {
        data: "test data",
        cacheId: generateId()
      });

      const entry = cache.get(key)!;
      const cachedAt = extractTimestamp(entry.cacheId);

      assert.ok(cachedAt > 0, "Should extract valid timestamp");
      assert.ok(Date.now() - cachedAt < 1000, "Timestamp should be recent");
    });

    test("can detect stale cache entries", async () => {
      type CacheEntry<T> = { data: T; cacheId: string };

      const cache = new Map<string, CacheEntry<string>>();
      const key = "data.json";

      cache.set(key, {
        data: "test data",
        cacheId: generateId()
      });

      // Wait 60ms
      await new Promise(r => setTimeout(r, 60));

      const entry = cache.get(key)!;
      const isStale = isOlderThan(entry.cacheId, 50);

      assert.strictEqual(
        isStale,
        true,
        "Cache entry should be stale after 50ms"
      );
    });
  });

  suite("Polling Deduplication with UUIDv7", () => {
    test("can skip poll if previous too recent", () => {
      let lastPollId: string | undefined;
      let pollCount = 0;

      function doPoll(): boolean {
        // Skip if last poll was within 100ms
        if (lastPollId && !isOlderThan(lastPollId, 100)) {
          return false; // Skipped
        }

        lastPollId = generateId();
        pollCount++;
        return true;
      }

      // First poll should succeed
      assert.strictEqual(doPoll(), true);
      assert.strictEqual(pollCount, 1);

      // Immediate second poll should be skipped
      assert.strictEqual(doPoll(), false);
      assert.strictEqual(pollCount, 1);
    });

    test("allows poll after threshold passed", async () => {
      let lastPollId: string | undefined;
      let pollCount = 0;

      function doPoll(): boolean {
        if (lastPollId && !isOlderThan(lastPollId, 50)) {
          return false;
        }
        lastPollId = generateId();
        pollCount++;
        return true;
      }

      doPoll(); // First poll

      // Wait for threshold
      await new Promise(r => setTimeout(r, 60));

      // Second poll should succeed
      assert.strictEqual(doPoll(), true);
      assert.strictEqual(pollCount, 2);
    });
  });
});
