/**
 * E2E Integration Tests: Changelist Operations
 * Tests SVN changelist (staging) functionality with real repos.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestRepo,
  isSvnAvailable,
  createFile,
  modifyFile,
  TestRepo
} from "./helpers/svnTestRepo";
import { parseStatusXml } from "../../src/parser/statusParser";

describe("Integration: Changelist Operations", () => {
  let repo: TestRepo;
  let skipTests = false;

  beforeAll(async () => {
    if (!isSvnAvailable()) {
      skipTests = true;
      return;
    }

    repo = await createTestRepo("svn-changelist");

    // Setup: create files and commit
    await createFile(repo.wcDir, "file1.txt", "content1");
    await createFile(repo.wcDir, "file2.txt", "content2");
    await createFile(repo.wcDir, "file3.txt", "content3");
    repo.svn("add file1.txt file2.txt file3.txt");
    repo.svn('commit -m "Add files"');

    // Modify files for changelist tests
    await modifyFile(repo.wcDir, "file1.txt", "modified1");
    await modifyFile(repo.wcDir, "file2.txt", "modified2");
    await modifyFile(repo.wcDir, "file3.txt", "modified3");
  }, 30000);

  afterAll(async () => {
    if (repo) {
      await repo.cleanup();
    }
  });

  describe("changelist assignment", () => {
    it("adds file to changelist", async () => {
      if (skipTests) return;

      repo.svn("changelist staging file1.txt");

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      const file1 = statuses.find(s => s.path.includes("file1.txt"));
      expect(file1).toBeDefined();
      expect(file1?.changelist).toBe("staging");
    });

    it("removes file from changelist", async () => {
      if (skipTests) return;

      repo.svn("changelist --remove file1.txt");

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      const file1 = statuses.find(s => s.path.includes("file1.txt"));
      expect(file1).toBeDefined();
      expect(file1?.changelist).toBeUndefined();
    });

    it("supports multiple changelists", async () => {
      if (skipTests) return;

      repo.svn("changelist __staged__ file1.txt");
      repo.svn("changelist feature-work file2.txt");

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      const file1 = statuses.find(s => s.path.includes("file1.txt"));
      const file2 = statuses.find(s => s.path.includes("file2.txt"));
      const file3 = statuses.find(s => s.path.includes("file3.txt"));

      expect(file1?.changelist).toBe("__staged__");
      expect(file2?.changelist).toBe("feature-work");
      expect(file3?.changelist).toBeUndefined();

      // Cleanup
      repo.svn("changelist --remove file1.txt file2.txt");
    });
  });
});
