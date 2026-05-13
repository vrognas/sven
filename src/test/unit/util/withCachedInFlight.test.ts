import * as assert from "assert";
import { LRUCache } from "../../../util/lruCache";
import { withCachedInFlight } from "../../../util/withCachedInFlight";

suite("withCachedInFlight", () => {
  test("first call invokes factory, subsequent calls within TTL hit cache", async () => {
    const cache = new LRUCache<number>(10, 1000);
    const inFlight = new Map<string, Promise<number>>();
    let calls = 0;
    const factory = async () => {
      calls++;
      return 42;
    };

    const a = await withCachedInFlight("k", cache, inFlight, factory);
    const b = await withCachedInFlight("k", cache, inFlight, factory);

    assert.strictEqual(a, 42);
    assert.strictEqual(b, 42);
    assert.strictEqual(calls, 1);
  });

  test("concurrent calls share the in-flight promise", async () => {
    const cache = new LRUCache<number>(10, 1000);
    const inFlight = new Map<string, Promise<number>>();
    let calls = 0;
    const factory = async () => {
      calls++;
      await new Promise(r => setTimeout(r, 20));
      return 7;
    };

    const results = await Promise.all([
      withCachedInFlight("k", cache, inFlight, factory),
      withCachedInFlight("k", cache, inFlight, factory),
      withCachedInFlight("k", cache, inFlight, factory)
    ]);

    assert.deepStrictEqual(results, [7, 7, 7]);
    assert.strictEqual(calls, 1);
  });

  test("on factory rejection in-flight is cleared and value is not cached", async () => {
    const cache = new LRUCache<number>(10, 1000);
    const inFlight = new Map<string, Promise<number>>();
    let calls = 0;
    const factory = async () => {
      calls++;
      throw new Error("boom");
    };

    await assert.rejects(() =>
      withCachedInFlight("k", cache, inFlight, factory)
    );
    assert.strictEqual(inFlight.has("k"), false, "in-flight should be cleared");
    // Next call must retry (cache empty)
    await assert.rejects(() =>
      withCachedInFlight("k", cache, inFlight, factory)
    );
    assert.strictEqual(calls, 2);
  });

  test("different keys do not collide", async () => {
    const cache = new LRUCache<string>(10, 1000);
    const inFlight = new Map<string, Promise<string>>();
    const factory = async () => Math.random().toString();

    const a = await withCachedInFlight("k1", cache, inFlight, factory);
    const b = await withCachedInFlight("k2", cache, inFlight, factory);

    assert.notStrictEqual(a, b);
  });
});
