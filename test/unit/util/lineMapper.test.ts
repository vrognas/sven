import { describe, it, expect } from "vitest";
import { computeLineMapping } from "../../../src/util/lineMapper";

describe("computeLineMapping", () => {
  it("returns identity mapping for identical content", () => {
    const base = ["line1", "line2", "line3"];
    const working = ["line1", "line2", "line3"];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBe(1);
    expect(mapping.get(2)).toBe(2);
    expect(mapping.get(3)).toBe(3);
  });

  it("handles line added at beginning", () => {
    const base = ["original1", "original2"];
    const working = ["new line", "original1", "original2"];

    const mapping = computeLineMapping(base, working);

    // base line 1 -> working line 2
    // base line 2 -> working line 3
    expect(mapping.get(1)).toBe(2);
    expect(mapping.get(2)).toBe(3);
  });

  it("handles line added in middle", () => {
    const base = ["line1", "line2", "line3"];
    const working = ["line1", "inserted", "line2", "line3"];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBe(1);
    expect(mapping.get(2)).toBe(3);
    expect(mapping.get(3)).toBe(4);
  });

  it("handles line deleted", () => {
    const base = ["line1", "line2", "line3"];
    const working = ["line1", "line3"];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBe(1);
    expect(mapping.get(2)).toBeUndefined(); // deleted
    expect(mapping.get(3)).toBe(2);
  });

  it("handles line modified (content changed)", () => {
    const base = ["line1", "original", "line3"];
    const working = ["line1", "modified", "line3"];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBe(1);
    expect(mapping.get(2)).toBe(2); // modified line still maps
    expect(mapping.get(3)).toBe(3);
  });

  it("handles multiple insertions", () => {
    const base = ["A", "B", "C"];
    const working = ["X", "A", "Y", "B", "Z", "C"];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBe(2); // A
    expect(mapping.get(2)).toBe(4); // B
    expect(mapping.get(3)).toBe(6); // C
  });

  it("handles empty base", () => {
    const base: string[] = [];
    const working = ["new line"];

    const mapping = computeLineMapping(base, working);

    expect(mapping.size).toBe(0);
  });

  it("handles empty working copy", () => {
    const base = ["line1", "line2"];
    const working: string[] = [];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBeUndefined();
    expect(mapping.get(2)).toBeUndefined();
  });

  it("handles complex edit scenario", () => {
    // Simulates real editing: some lines unchanged, some modified, some added
    const base = ["# Header", "line A", "line B", "line C", "# Footer"];
    const working = [
      "# Header",
      "new line 1",
      "line A",
      "line B modified",
      "new line 2",
      "line C",
      "# Footer"
    ];

    const mapping = computeLineMapping(base, working);

    expect(mapping.get(1)).toBe(1); // # Header unchanged
    expect(mapping.get(2)).toBe(3); // line A shifted
    expect(mapping.get(3)).toBe(4); // line B -> line B modified (same position)
    expect(mapping.get(4)).toBe(6); // line C shifted
    expect(mapping.get(5)).toBe(7); // # Footer shifted
  });
});
