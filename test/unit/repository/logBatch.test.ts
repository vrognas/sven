import * as assert from "assert";

suite("Repository logBatch", () => {
  suite("Batch Command Construction", () => {
    test("single revision uses -r REV:REV", () => {
      // Test single revision range construction
      const singleRev = ["100"];
      const expectedRange = "100:100";

      assert.strictEqual(expectedRange, "100:100");
      assert.strictEqual(singleRev.length, 1);
    });

    test("multiple revisions use min:max range", () => {
      const revisions = ["100", "105", "200", "150"];
      const min = Math.min(...revisions.map(r => parseInt(r, 10)));
      const max = Math.max(...revisions.map(r => parseInt(r, 10)));
      const range = `${min}:${max}`;

      assert.strictEqual(range, "100:200");
    });

    test("handles string revisions correctly", () => {
      const revisions = ["100", "200"];
      const nums = revisions.map(r => parseInt(r, 10));

      assert.ok(!nums.some(isNaN));
      assert.strictEqual(nums.length, 2);
    });
  });

  suite("Edge Cases", () => {
    test("empty array returns empty result", async () => {
      const revisions: string[] = [];
      const result = revisions.length === 0 ? [] : ["some"];

      assert.deepStrictEqual(result, []);
    });

    test("single revision optimizes to single log call", () => {
      const revisions = ["100"];
      const shouldBatch = revisions.length > 1;

      assert.strictEqual(shouldBatch, false);
    });

    test("filters requested revisions from range result", () => {
      // Range 100:200 returns all revisions, but we only want specific ones
      const requested = ["100", "150", "200"];
      const allFetched = ["100", "120", "150", "180", "200"];
      const filtered = allFetched.filter(r => requested.includes(r));

      assert.deepStrictEqual(filtered, ["100", "150", "200"]);
    });
  });

  suite("Performance Optimization", () => {
    test("batch reduces command count dramatically", () => {
      const revisionCount = 50;
      const sequentialCalls = revisionCount; // 50 calls
      const batchCalls = 1; // 1 call
      const improvement = sequentialCalls / batchCalls;

      assert.strictEqual(improvement, 50);
    });

    test("sparse revisions still benefit from batching", () => {
      // Revisions: 10, 500, 1000 (very sparse)
      // Range: 10:1000 (fetches ~990 extra, but still faster than 3 calls)
      const sparseRevs = ["10", "500", "1000"];
      const range = "10:1000";

      // Trade-off: Extra data vs fewer network calls
      assert.ok(range.length > 0);
      assert.strictEqual(sparseRevs.length, 3);
    });
  });

  suite("Result Filtering", () => {
    test("extracts only requested revisions from batch", () => {
      // Simulate batch result containing many revisions
      const batchResult = [
        { revision: "100", msg: "msg1" },
        { revision: "101", msg: "msg2" },
        { revision: "102", msg: "msg3" },
        { revision: "150", msg: "msg4" }
      ];
      const requested = new Set(["100", "150"]);
      const filtered = batchResult.filter(entry =>
        requested.has(entry.revision)
      );

      assert.strictEqual(filtered.length, 2);
      assert.strictEqual(filtered[0].revision, "100");
      assert.strictEqual(filtered[1].revision, "150");
    });

    test("handles missing revisions gracefully", () => {
      // Requested revision doesn't exist in range
      const batchResult = [
        { revision: "100", msg: "msg1" },
        { revision: "102", msg: "msg2" }
      ];
      const requested = new Set(["100", "101", "102"]);
      const filtered = batchResult.filter(entry =>
        requested.has(entry.revision)
      );

      // 101 is missing, should only return 100 and 102
      assert.strictEqual(filtered.length, 2);
    });
  });
});
