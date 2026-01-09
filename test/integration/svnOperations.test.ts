/**
 * E2E Integration Tests: Core SVN Operations
 * Tests parsers with real SVN XML output.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestRepo,
  isSvnAvailable,
  createFile,
  modifyFile,
  TestRepo
} from "./helpers/svnTestRepo";
import { parseInfoXml } from "../../src/parser/infoParser";
import { parseStatusXml } from "../../src/parser/statusParser";
import { parseSvnLog } from "../../src/parser/logParser";

describe("Integration: SVN Operations", () => {
  let repo: TestRepo;
  let skipTests = false;

  beforeAll(async () => {
    if (!isSvnAvailable()) {
      skipTests = true;
      return;
    }

    repo = await createTestRepo("svn-ops");

    // Setup: create initial file and commit
    await createFile(repo.wcDir, "file1.txt", "initial content");
    repo.svn('add "file1.txt"');
    repo.svn('commit -m "Initial commit"');
  }, 30000);

  afterAll(async () => {
    if (repo) {
      await repo.cleanup();
    }
  });

  describe("svn info parser", () => {
    it("parses working copy info correctly", async () => {
      if (skipTests) return;

      const xml = repo.svn("info --xml");
      const info = await parseInfoXml(xml);

      expect(info.kind).toBe("dir");
      expect(info.url).toContain("file://");
      expect(info.repository.root).toBeDefined();
      expect(info.wcInfo?.wcrootAbspath).toBeDefined();
    });

    it("parses file info with revision", async () => {
      if (skipTests) return;

      const xml = repo.svn('info --xml "file1.txt"');
      const info = await parseInfoXml(xml);

      expect(info.kind).toBe("file");
      expect(info.path).toBe("file1.txt");
      expect(info.commit.revision).toBeDefined();
      expect(info.commit.author).toBeDefined();
    });

    it("parses URL-based info", async () => {
      if (skipTests) return;

      const xml = repo.svn(`info --xml "${repo.repoUrl}"`);
      const info = await parseInfoXml(xml);

      expect(info.kind).toBe("dir");
      expect(info.url).toBe(repo.repoUrl);
    });
  });

  describe("svn status parser", () => {
    it("shows clean status for committed file", async () => {
      if (skipTests) return;

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      // No modified files = empty status or no entries
      const modified = statuses.filter(s => s.status !== "normal");
      expect(modified.length).toBe(0);
    });

    it("detects modified file", async () => {
      if (skipTests) return;

      await modifyFile(repo.wcDir, "file1.txt", "modified content");

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      const modified = statuses.find(s => s.path.includes("file1.txt"));
      expect(modified).toBeDefined();
      expect(modified?.status).toBe("modified");

      // Revert for next tests
      repo.svn("revert file1.txt");
    });

    it("detects added file", async () => {
      if (skipTests) return;

      await createFile(repo.wcDir, "newfile.txt", "new file");
      repo.svn('add "newfile.txt"');

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      const added = statuses.find(s => s.path.includes("newfile.txt"));
      expect(added).toBeDefined();
      expect(added?.status).toBe("added");

      // Commit for log tests
      repo.svn('commit -m "Add newfile"');
    });
  });

  describe("svn log parser", () => {
    it("parses commit history", async () => {
      if (skipTests) return;

      // Use -r HEAD:1 instead of -l for cross-platform compatibility
      const xml = repo.svn("log --xml -r HEAD:1");
      const entries = await parseSvnLog(xml);

      // At least the initial commit from beforeAll
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].revision).toBeDefined();
      expect(entries[0].msg).toBeDefined();
    });

    it("includes file paths in log entries", async () => {
      if (skipTests) return;

      const xml = repo.svn("log --xml -v -r HEAD");
      const entries = await parseSvnLog(xml);

      expect(entries.length).toBe(1);
      expect(entries[0].paths).toBeDefined();
      expect(entries[0].paths.length).toBeGreaterThan(0);
      expect(entries[0].paths[0].action).toBeDefined();
    });

    it("parses specific revision", async () => {
      if (skipTests) return;

      const xml = repo.svn("log --xml -r 1");
      const entries = await parseSvnLog(xml);

      expect(entries.length).toBe(1);
      expect(entries[0].revision).toBe("1");
      expect(entries[0].msg).toBe("Initial commit");
    });
  });
});
