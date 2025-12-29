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

      // Line 1 and 3 should be from revision 1
      // Line 2 should be from revision 2
      // Line 4 should be from revision 3
      expect(lines[0].revision).toBe("1");
      expect(lines[1].revision).toBe("2");
      expect(lines[2].revision).toBe("1");
      expect(lines[3].revision).toBe("3");
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
