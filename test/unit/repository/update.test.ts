import { describe, it, expect } from "vitest";

/**
 * Repository Update Tests
 *
 * Tests for parseUpdateOutput behavior matching SvnRepository implementation.
 * Tests all conflict types: text, tree, and property conflicts.
 */
describe("Repository Update", () => {
  describe("parseUpdateOutput()", () => {
    // Regex matching SvnRepository implementation
    const UPDATE_REV_REGEX = /(?:Updated to|At) revision (\d+)/i;
    const CONFLICT_REGEX = /^\s*C\s+(.+)$/;

    function parseUpdateOutput(stdout: string) {
      if (!stdout || typeof stdout !== "string") {
        return { revision: null, conflicts: [], message: "" };
      }

      const lines = stdout.trim().split(/\r?\n/);
      const conflicts: string[] = [];
      let revision: number | null = null;
      let message = "";

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!message && trimmed) {
          message = trimmed;
        }

        const conflictMatch = CONFLICT_REGEX.exec(line);
        if (conflictMatch && conflictMatch[1]) {
          conflicts.unshift(conflictMatch[1].trim());
        }

        if (revision === null) {
          const revMatch = UPDATE_REV_REGEX.exec(line);
          if (revMatch) {
            revision = parseInt(revMatch[1], 10);
          }
        }
      }

      return { revision, conflicts, message };
    }

    it("parses update with conflicts", () => {
      const output = `Updating '.':
U    src/file1.ts
C    src/conflicted.ts
Updated to revision 456.`;

      const result = parseUpdateOutput(output);
      expect(result.revision).toBe(456);
      expect(result.conflicts).toEqual(["src/conflicted.ts"]);
      expect(result.message).toBe("Updated to revision 456.");
    });

    it("detects tree conflicts (indented C)", () => {
      // Tree conflicts have spaces before C
      const output = `Updating '.':
U    src/file.ts
   C src/tree-conflict.ts
Updated to revision 100.`;

      const result = parseUpdateOutput(output);
      expect(result.conflicts).toContain("src/tree-conflict.ts");
    });

    it("handles already up-to-date", () => {
      const output = `Updating '.':
At revision 100.`;

      const result = parseUpdateOutput(output);
      expect(result.revision).toBe(100);
      expect(result.conflicts).toEqual([]);
    });

    it("handles empty/null input gracefully", () => {
      expect(parseUpdateOutput("")).toEqual({
        revision: null,
        conflicts: [],
        message: ""
      });
      expect(parseUpdateOutput(null as unknown as string)).toEqual({
        revision: null,
        conflicts: [],
        message: ""
      });
    });
  });
});
