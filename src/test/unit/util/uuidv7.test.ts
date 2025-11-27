// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as assert from "assert";
import {
  generateId,
  extractTimestamp,
  isOlderThan,
  compareIds
} from "../../../util/uuidv7";

suite("UUIDv7 Utilities", () => {
  suite("generateId", () => {
    test("should generate valid UUIDv7 format", () => {
      const id = generateId();
      // UUIDv7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      assert.match(
        id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    test("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      assert.strictEqual(ids.size, 100);
    });

    test("should generate time-ordered IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      // Lexicographic comparison should work for time ordering
      assert.ok(id1 <= id2, "IDs should be time-ordered");
    });
  });

  suite("extractTimestamp", () => {
    test("should extract timestamp from UUIDv7", () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();

      const timestamp = extractTimestamp(id);
      assert.ok(
        timestamp >= before,
        `timestamp ${timestamp} should be >= ${before}`
      );
      assert.ok(
        timestamp <= after,
        `timestamp ${timestamp} should be <= ${after}`
      );
    });

    test("should return 0 for invalid UUID", () => {
      assert.strictEqual(extractTimestamp("invalid"), 0);
      assert.strictEqual(extractTimestamp(""), 0);
    });
  });

  suite("isOlderThan", () => {
    test("should return false for fresh ID", () => {
      const id = generateId();
      assert.strictEqual(isOlderThan(id, 1000), false);
    });

    test("should return true for old ID", async () => {
      const id = generateId();
      // Wait 50ms
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.strictEqual(isOlderThan(id, 25), true);
    });

    test("should handle invalid IDs gracefully", () => {
      assert.strictEqual(isOlderThan("invalid", 1000), true);
    });
  });

  suite("compareIds", () => {
    test("should compare IDs chronologically", () => {
      const id1 = generateId();
      const id2 = generateId();
      assert.ok(compareIds(id1, id2) <= 0, "Earlier ID should be <= later ID");
      assert.ok(compareIds(id2, id1) >= 0, "Later ID should be >= earlier ID");
    });

    test("should return 0 for same ID", () => {
      const id = generateId();
      assert.strictEqual(compareIds(id, id), 0);
    });
  });
});
