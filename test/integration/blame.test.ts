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

      // Line 2 was modified after line 1, so should have higher revision
      // Line 4 was added last, so should have highest revision
      const r1 = parseInt(lines[0].revision!, 10);
      const r2 = parseInt(lines[1].revision!, 10);
      const r4 = parseInt(lines[3].revision!, 10);

      expect(r2).toBeGreaterThan(r1); // line 2 modified after line 1
      expect(r4).toBeGreaterThan(r2); // line 4 added after line 2 modified
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
