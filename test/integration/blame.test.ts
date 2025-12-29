/**
 * E2E Integration Tests: Blame Operations
 * Tests blame parser with real SVN blame output.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestRepo,
  isSvnAvailable,
  createFile,
  modifyFile,
  TestRepo
} from "./helpers/svnTestRepo";
import { parseSvnBlame } from "../../src/parser/blameParser";

describe("Integration: Blame Operations", () => {
  let repo: TestRepo;
  let skipTests = false;

  beforeAll(async () => {
    if (!isSvnAvailable()) {
      skipTests = true;
      return;
    }

    repo = await createTestRepo("svn-blame");

    // Setup: create multi-line file with history
    await createFile(repo.wcDir, "blamed.txt", "line 1\nline 2\nline 3");
    repo.svn('add "blamed.txt"');
    repo.svn('commit -m "Initial commit"');

    // Modify some lines
    await modifyFile(
      repo.wcDir,
      "blamed.txt",
      "line 1\nline 2 modified\nline 3"
    );
    repo.svn('commit -m "Modify line 2"');

    // Add more lines
    await modifyFile(
      repo.wcDir,
      "blamed.txt",
      "line 1\nline 2 modified\nline 3\nline 4"
    );
    repo.svn('commit -m "Add line 4"');
  }, 30000);

  afterAll(async () => {
    if (repo) {
      await repo.cleanup();
    }
  });

  describe("blame parser", () => {
    it("parses blame output for committed file", async () => {
      if (skipTests) return;

      const xml = repo.svn('blame --xml "blamed.txt"');
      const lines = await parseSvnBlame(xml);

      expect(lines.length).toBe(4);
      expect(lines[0].lineNumber).toBe(1);
      expect(lines[0].revision).toBeDefined();
      expect(lines[0].author).toBeDefined();
    });

    it("shows different revisions for different lines", async () => {
      if (skipTests) return;

      const xml = repo.svn('blame --xml "blamed.txt"');
      const lines = await parseSvnBlame(xml);

      // Verify blame output has correct structure
      expect(lines.length).toBe(4);

      // All committed lines should have revisions
      for (const line of lines) {
        expect(line.revision).toBeDefined();
        expect(parseInt(line.revision!, 10)).toBeGreaterThan(0);
      }

      // Line 2 was modified in r2, so it should differ from r1
      expect(lines[1].revision).not.toBe("1");

      // Line 4 was added last (r3), should have highest revision
      const revisions = lines.map(l => parseInt(l.revision!, 10));
      expect(revisions[3]).toBe(Math.max(...revisions));
    });

    it("handles uncommitted changes", async () => {
      if (skipTests) return;

      // Modify without commit
      await modifyFile(
        repo.wcDir,
        "blamed.txt",
        "modified line 1\nline 2 modified\nline 3\nline 4"
      );

      const xml = repo.svn('blame --xml "blamed.txt"');
      const lines = await parseSvnBlame(xml);

      // First line should have no revision (uncommitted)
      expect(lines[0].lineNumber).toBe(1);
      expect(lines[0].revision).toBeUndefined();

      // Revert for cleanup
      repo.svn('revert "blamed.txt"');
    });
  });
});
