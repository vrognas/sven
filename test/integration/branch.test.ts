/**
 * E2E Integration Tests: Branch Operations
 * Tests branch creation, switch, and merge with real SVN.
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

describe("Integration: Branch Operations", () => {
  let repo: TestRepo;
  let skipTests = false;

  beforeAll(async () => {
    if (!isSvnAvailable()) {
      skipTests = true;
      return;
    }

    repo = await createTestRepo("svn-branch");

    // Setup: create trunk structure
    await createFile(repo.wcDir, "trunk.txt", "trunk content");
    repo.svn('add "trunk.txt"');
    repo.svn('commit -m "Initial trunk"');
  }, 30000);

  afterAll(async () => {
    if (repo) {
      await repo.cleanup();
    }
  });

  describe("branch operations", () => {
    it("copies to create branch", async () => {
      if (skipTests) return;

      // Create branches directory
      repo.svn(`mkdir "${repo.repoUrl}/branches" -m "Create branches dir"`);

      // Copy trunk to branch
      repo.svn(
        `copy "${repo.repoUrl}" "${repo.repoUrl}/branches/feature" -m "Create feature branch"`
      );

      // Verify branch exists via log (use -r HEAD for cross-platform compatibility)
      const output = repo.svn(
        `log "${repo.repoUrl}/branches/feature" --xml -r HEAD`
      );
      expect(output).toContain("feature branch");
    });

    it("switches to branch and back", async () => {
      if (skipTests) return;

      // Switch to feature branch
      repo.svn(`switch "${repo.repoUrl}/branches/feature"`);

      let xml = repo.svn("info --xml");
      let info = await parseInfoXml(xml);
      expect(info.url).toContain("branches/feature");

      // Make change on branch
      await modifyFile(repo.wcDir, "trunk.txt", "branch content");
      repo.svn('commit -m "Branch change"');

      // Switch back to trunk
      repo.svn(`switch "${repo.repoUrl}"`);

      xml = repo.svn("info --xml");
      info = await parseInfoXml(xml);
      expect(info.url).not.toContain("branches");
    });

    it("detects switched state in status", async () => {
      if (skipTests) return;

      // Create subdirectory structure
      await createFile(repo.wcDir, "subdir/file.txt", "subdir content");
      repo.svn("add subdir");
      repo.svn('commit -m "Add subdir"');

      // Copy subdir to branches
      repo.svn(
        `copy "${repo.repoUrl}/subdir" "${repo.repoUrl}/branches/subdir-branch" -m "Branch subdir"`
      );

      // Switch just the subdir
      repo.svn(`switch "${repo.repoUrl}/branches/subdir-branch" subdir`);

      const xml = repo.svn("status --xml");
      const statuses = await parseStatusXml(xml);

      // subdir should show as switched
      const switched = statuses.find(
        s => s.path.includes("subdir") && s.wcStatus.switched
      );
      expect(switched).toBeDefined();

      // Switch back
      repo.svn(`switch "${repo.repoUrl}/subdir" subdir`);
    });
  });
});
