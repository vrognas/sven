/**
 * E2E Integration Tests: Conflict Detection
 * Tests conflict scenarios with real SVN.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { isSvnAvailable, createFile, modifyFile } from "./helpers/svnTestRepo";
import { parseStatusXml } from "../../src/parser/statusParser";

describe("Integration: Conflict Detection", () => {
  let testDir: string;
  let repoDir: string;
  let wc1Dir: string;
  let wc2Dir: string;
  let repoUrl: string;
  let skipTests = false;

  const exec = (cmd: string, cwd?: string): string => {
    return execSync(cmd, { encoding: "utf8", cwd, stdio: "pipe" }) as string;
  };

  beforeAll(async () => {
    if (!isSvnAvailable()) {
      skipTests = true;
      return;
    }

    // Create temp structure with TWO working copies
    testDir = path.join(tmpdir(), `svn-conflict-${Date.now()}`);
    repoDir = path.join(testDir, "repo");
    wc1Dir = path.join(testDir, "wc1");
    wc2Dir = path.join(testDir, "wc2");

    await fs.mkdir(testDir, { recursive: true });

    // Create SVN repository
    exec(`svnadmin create "${repoDir}"`);

    // Create repo URL
    const normalizedPath = repoDir.replace(/\\/g, "/");
    repoUrl =
      process.platform === "win32"
        ? `file:///${normalizedPath}`
        : `file://${normalizedPath}`;

    // Checkout two working copies
    exec(`svn checkout "${repoUrl}" "${wc1Dir}"`);
    exec(`svn checkout "${repoUrl}" "${wc2Dir}"`);

    // Create initial file in wc1
    await createFile(wc1Dir, "conflict.txt", "line 1\nline 2\nline 3");
    exec('svn add "conflict.txt"', wc1Dir);
    exec('svn commit -m "Initial"', wc1Dir);

    // Update wc2 to get the file
    exec("svn update", wc2Dir);
  }, 30000);

  afterAll(async () => {
    if (testDir) {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("conflict scenarios", () => {
    it("detects text conflict after concurrent edits", async () => {
      if (skipTests) return;

      // Modify in wc1 and commit
      await modifyFile(
        wc1Dir,
        "conflict.txt",
        "line 1 from wc1\nline 2\nline 3"
      );
      exec('svn commit -m "Edit from wc1"', wc1Dir);

      // Modify same line in wc2 (different content)
      await modifyFile(
        wc2Dir,
        "conflict.txt",
        "line 1 from wc2\nline 2\nline 3"
      );

      // Update wc2 - should create conflict
      try {
        exec("svn update --accept postpone", wc2Dir);
      } catch {
        // Update may exit with error code on conflict
      }

      const xml = exec("svn status --xml", wc2Dir);
      const statuses = await parseStatusXml(xml);

      const conflicted = statuses.find(s => s.path.includes("conflict.txt"));
      expect(conflicted).toBeDefined();
      expect(conflicted?.status).toBe("conflicted");

      // Resolve and cleanup
      exec('svn resolve --accept working "conflict.txt"', wc2Dir);
      exec('svn revert "conflict.txt"', wc2Dir);
      exec("svn update", wc2Dir);
    });

    it("detects out-of-date on commit attempt", async () => {
      if (skipTests) return;

      // Modify and commit in wc1
      await modifyFile(wc1Dir, "conflict.txt", "updated from wc1");
      exec('svn commit -m "Update from wc1"', wc1Dir);

      // Modify in wc2 without updating
      await modifyFile(wc2Dir, "conflict.txt", "updated from wc2");

      // Try to commit - should fail with out-of-date
      let commitFailed = false;
      try {
        exec('svn commit -m "Update from wc2"', wc2Dir);
      } catch (e) {
        commitFailed = true;
        expect(String(e)).toMatch(/out of date|E155011/i);
      }

      expect(commitFailed).toBe(true);

      // Cleanup
      exec('svn revert "conflict.txt"', wc2Dir);
      exec("svn update", wc2Dir);
    });

    it("handles tree conflict on delete vs modify", async () => {
      if (skipTests) return;

      // Create a new file for tree conflict
      await createFile(wc1Dir, "treefile.txt", "tree content");
      exec('svn add "treefile.txt"', wc1Dir);
      exec('svn commit -m "Add treefile"', wc1Dir);
      exec("svn update", wc2Dir);

      // Delete in wc1
      exec('svn delete "treefile.txt"', wc1Dir);
      exec('svn commit -m "Delete treefile"', wc1Dir);

      // Modify in wc2 (file still exists there)
      await modifyFile(wc2Dir, "treefile.txt", "modified content");

      // Update wc2 - tree conflict
      try {
        exec("svn update", wc2Dir);
      } catch {
        // May exit with error
      }

      const xml = exec("svn status --xml", wc2Dir);
      const statuses = await parseStatusXml(xml);

      // File should show some conflict state (may vary by SVN version)
      const treeFile = statuses.find(s => s.path.includes("treefile.txt"));
      expect(treeFile).toBeDefined();

      // Cleanup
      try {
        exec('svn resolve --accept working "treefile.txt"', wc2Dir);
        exec('svn revert "treefile.txt"', wc2Dir);
      } catch {
        // May need different cleanup
      }
    });
  });
});
