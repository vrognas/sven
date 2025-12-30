/**
 * E2E Integration Tests: File Lifecycle
 * Tests add, delete, revert, rename operations with real SVN.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestRepo,
  isSvnAvailable,
  createFile,
  modifyFile,
  deleteFile,
  TestRepo
} from "./helpers/svnTestRepo";
import { parseStatusXml } from "../../src/parser/statusParser";
import { parseSvnLog } from "../../src/parser/logParser";

describe("Integration: File Lifecycle", () => {
  let repo: TestRepo;
  let skipTests = false;

  beforeAll(async () => {
    if (!isSvnAvailable()) {
      skipTests = true;
      return;
    }

    repo = await createTestRepo("svn-lifecycle");

    // Setup: create initial file
    await createFile(repo.wcDir, "original.txt", "original content");
    repo.svn('add "original.txt"');
    repo.svn('commit -m "Initial file"');
  }, 30000);

  afterAll(async () => {
    if (repo) {
      await repo.cleanup();
    }
  });

  describe("file operations", () => {
    it("adds and commits new file", async () => {
      if (skipTests) return;

      await createFile(repo.wcDir, "added.txt", "added content");
      repo.svn('add "added.txt"');

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);
      expect(statuses.find(s => s.path.includes("added.txt"))?.status).toBe(
        "added"
      );

      repo.svn('commit -m "Add file"');

      // Verify in log (use -r HEAD for cross-platform compatibility)
      const logXml = repo.svn("log --xml -r HEAD -v");
      const entries = await parseSvnLog(logXml);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].paths).toBeDefined();
      expect(
        entries[0].paths.some(
          p => p._ && p._.includes("added.txt") && p.action === "A"
        )
      ).toBe(true);
    });

    it("deletes file and shows in status", async () => {
      if (skipTests) return;

      repo.svn('delete "added.txt"');

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);
      expect(statuses.find(s => s.path.includes("added.txt"))?.status).toBe(
        "deleted"
      );

      repo.svn('commit -m "Delete file"');
    });

    it("reverts modified file", async () => {
      if (skipTests) return;

      await modifyFile(repo.wcDir, "original.txt", "modified content");

      let xml = repo.svn("status --xml");
      let statuses = await parseStatusXml(xml);
      expect(statuses.find(s => s.path.includes("original.txt"))?.status).toBe(
        "modified"
      );

      repo.svn('revert "original.txt"');

      xml = repo.svn("status --xml");
      statuses = await parseStatusXml(xml);
      const original = statuses.find(s => s.path.includes("original.txt"));
      // After revert, file should not appear in status (or be "normal")
      expect(original === undefined || original.status === "normal").toBe(true);
    });
  });

  describe("missing file handling", () => {
    it("detects missing file (deleted outside SVN)", async () => {
      if (skipTests) return;

      // Create and commit a file first
      await createFile(repo.wcDir, "todelete.txt", "will be deleted");
      repo.svn('add "todelete.txt"');
      repo.svn('commit -m "Add file to delete"');

      // Delete file directly (not via svn delete)
      await deleteFile(repo.wcDir, "todelete.txt");

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);
      expect(statuses.find(s => s.path.includes("todelete.txt"))?.status).toBe(
        "missing"
      );

      // Restore via revert
      repo.svn('revert "todelete.txt"');
    });
  });
});
