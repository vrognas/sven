import { describe, it, expect } from "vitest";

/**
 * Repository Update Tests
 *
 * Tests for update functionality:
 * - Conflict detection from SVN output
 * - Update result parsing
 * - Status refresh after update
 */
describe("Repository Update", () => {
  describe("parseUpdateOutput()", () => {
    /**
     * Parse SVN update output to extract:
     * - Final revision
     * - Conflicted files (lines starting with 'C ')
     * - Updated files count
     */
    interface UpdateResult {
      revision: number | null;
      conflicts: string[];
      updatedCount: number;
      message: string;
    }

    function parseUpdateOutput(stdout: string): UpdateResult {
      const lines = stdout.trim().split(/\r?\n/);
      const conflicts: string[] = [];
      let updatedCount = 0;
      let revision: number | null = null;

      for (const line of lines) {
        // Conflict: "C    path/to/file.txt"
        if (line.startsWith("C ") || line.startsWith("C\t")) {
          const path = line.substring(2).trim();
          if (path) conflicts.push(path);
        }
        // Updated/Added/Deleted/Merged: "U/A/D/G    path"
        if (/^[UADG]\s/.test(line)) {
          updatedCount++;
        }
        // Final line: "Updated to revision 123." or "At revision 123."
        const revMatch = line.match(/(?:Updated to|At) revision (\d+)/i);
        if (revMatch) {
          revision = parseInt(revMatch[1], 10);
        }
      }

      // Last non-empty line as message
      const message = lines.filter(l => l.trim()).pop() || "";

      return { revision, conflicts, updatedCount, message };
    }

    it("parses simple update output", () => {
      const output = `Updating '.':
U    src/file.ts
Updated to revision 123.`;

      const result = parseUpdateOutput(output);
      expect(result.revision).toBe(123);
      expect(result.conflicts).toEqual([]);
      expect(result.updatedCount).toBe(1);
      expect(result.message).toBe("Updated to revision 123.");
    });

    it("detects conflicts in update output", () => {
      const output = `Updating '.':
U    src/file1.ts
C    src/conflicted.ts
U    src/file2.ts
Updated to revision 456.`;

      const result = parseUpdateOutput(output);
      expect(result.revision).toBe(456);
      expect(result.conflicts).toEqual(["src/conflicted.ts"]);
      expect(result.updatedCount).toBe(2);
    });

    it("detects multiple conflicts", () => {
      const output = `Updating '.':
C    src/a.ts
C    src/b.ts
C    src/c.ts
Updated to revision 789.`;

      const result = parseUpdateOutput(output);
      expect(result.conflicts).toHaveLength(3);
      expect(result.conflicts).toContain("src/a.ts");
      expect(result.conflicts).toContain("src/b.ts");
      expect(result.conflicts).toContain("src/c.ts");
    });

    it("handles 'At revision' for already up-to-date", () => {
      const output = `Updating '.':
At revision 100.`;

      const result = parseUpdateOutput(output);
      expect(result.revision).toBe(100);
      expect(result.updatedCount).toBe(0);
      expect(result.conflicts).toEqual([]);
    });

    it("counts all update statuses (U, A, D, G)", () => {
      const output = `Updating '.':
U    modified.ts
A    added.ts
D    deleted.ts
G    merged.ts
Updated to revision 200.`;

      const result = parseUpdateOutput(output);
      expect(result.updatedCount).toBe(4);
    });

    it("handles empty output gracefully", () => {
      const result = parseUpdateOutput("");
      expect(result.revision).toBeNull();
      expect(result.conflicts).toEqual([]);
      expect(result.updatedCount).toBe(0);
    });

    it("handles tab-separated output", () => {
      const output = `Updating '.':
C\tsrc/file.ts
Updated to revision 50.`;

      const result = parseUpdateOutput(output);
      expect(result.conflicts).toEqual(["src/file.ts"]);
    });
  });

  describe("hasConflicts()", () => {
    function hasConflicts(stdout: string): boolean {
      return /^C\s/m.test(stdout);
    }

    it("returns true when conflicts present", () => {
      const output = `U    file1.ts
C    conflicted.ts
Updated to revision 100.`;
      expect(hasConflicts(output)).toBe(true);
    });

    it("returns false when no conflicts", () => {
      const output = `U    file1.ts
U    file2.ts
Updated to revision 100.`;
      expect(hasConflicts(output)).toBe(false);
    });

    it("returns false for empty output", () => {
      expect(hasConflicts("")).toBe(false);
    });
  });

  describe("getUpdateRevision()", () => {
    function getUpdateRevision(stdout: string): number | null {
      const match = stdout.match(/(?:Updated to|At) revision (\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    }

    it("extracts revision from 'Updated to'", () => {
      expect(getUpdateRevision("Updated to revision 123.")).toBe(123);
    });

    it("extracts revision from 'At revision'", () => {
      expect(getUpdateRevision("At revision 456.")).toBe(456);
    });

    it("returns null for invalid output", () => {
      expect(getUpdateRevision("Some error occurred")).toBeNull();
    });

    it("handles large revision numbers", () => {
      expect(getUpdateRevision("Updated to revision 1234567.")).toBe(1234567);
    });
  });

  describe("Update Command Args", () => {
    function buildUpdateArgs(ignoreExternals: boolean): string[] {
      const args = ["update"];
      if (ignoreExternals) {
        args.push("--ignore-externals");
      }
      return args;
    }

    it("basic update has no extra flags", () => {
      expect(buildUpdateArgs(false)).toEqual(["update"]);
    });

    it("ignoreExternals adds --ignore-externals", () => {
      const args = buildUpdateArgs(true);
      expect(args).toContain("--ignore-externals");
    });
  });

  describe("Conflict Notification Message", () => {
    function buildConflictMessage(conflicts: string[]): string {
      if (conflicts.length === 0) return "";
      if (conflicts.length === 1) {
        return `Update created 1 conflict: ${conflicts[0]}`;
      }
      return `Update created ${conflicts.length} conflicts`;
    }

    it("returns empty for no conflicts", () => {
      expect(buildConflictMessage([])).toBe("");
    });

    it("shows single conflict with path", () => {
      expect(buildConflictMessage(["src/file.ts"])).toBe(
        "Update created 1 conflict: src/file.ts"
      );
    });

    it("shows count for multiple conflicts", () => {
      expect(buildConflictMessage(["a.ts", "b.ts", "c.ts"])).toBe(
        "Update created 3 conflicts"
      );
    });
  });
});
