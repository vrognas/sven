import * as assert from "assert";

suite("Mocha Compat Harness", () => {
  test("supports done callback", function (done: (err?: unknown) => void) {
    done();
  });

  test("supports timeout context api", function () {
    this.timeout(1);
    assert.ok(true);
  });

  test("supports skip context api", function () {
    let reachedAfterSkip = false;
    try {
      this.skip();
      reachedAfterSkip = true;
    } finally {
      assert.strictEqual(reachedAfterSkip, false);
    }
  });

  test("supports async skip context api", async function () {
    await Promise.resolve();
    this.skip();
  });
});
