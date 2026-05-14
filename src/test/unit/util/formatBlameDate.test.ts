import * as assert from "assert";
import { formatBlameDate } from "../../../util/formatting";

suite("formatBlameDate caching", () => {
  test("returns the same string for repeated calls (absolute)", () => {
    const isoDate = "2025-08-15T12:34:56Z";
    const first = formatBlameDate(isoDate, "absolute");
    const second = formatBlameDate(isoDate, "absolute");
    assert.strictEqual(first, second);
    assert.ok(first.length > 0);
    assert.notStrictEqual(first, "unknown");
  });

  test("caches per format — absolute and relative do not collide", () => {
    // Use a date far in the past to make relative output stable for the
    // duration of the test ("Xy ago" is stable at year granularity).
    const oldDate = "2010-01-01T00:00:00Z";
    const abs = formatBlameDate(oldDate, "absolute");
    const rel = formatBlameDate(oldDate, "relative");
    assert.notStrictEqual(abs, rel);
    assert.match(rel, /ago$/);
  });

  test("returns 'unknown' for missing date and does not poison cache", () => {
    assert.strictEqual(formatBlameDate(undefined, "absolute"), "unknown");
    // Subsequent valid date still works.
    const result = formatBlameDate("2024-06-01T00:00:00Z", "absolute");
    assert.ok(result.length > 0);
    assert.notStrictEqual(result, "unknown");
  });
});
