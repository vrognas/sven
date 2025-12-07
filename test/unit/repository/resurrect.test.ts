import { describe, it, expect } from "vitest";

/**
 * Repository Resurrect Tests
 *
 * Tests for resurrecting deleted items:
 * - getDeletedItems() - find deleted items in log
 * - resurrect() - copy file/dir from previous revision (preserves history)
 */
describe("Repository Resurrect", () => {
  describe("getDeletedItems() Logic", () => {
    /**
     * Simulates filtering log entries for deleted items
     */
    interface ISvnLogEntryPath {
      _: string;
      action: string;
      kind: string;
      copyfromPath?: string;
      copyfromRev?: string;
    }

    interface ISvnLogEntry {
      revision: string;
      author: string;
      date: string;
      msg: string;
      paths: ISvnLogEntryPath[];
    }

    function filterDeletedItems(entries: ISvnLogEntry[]): Array<{
      path: string;
      kind: string;
      revision: string;
      author: string;
      date: string;
      msg: string;
    }> {
      const deleted: Array<{
        path: string;
        kind: string;
        revision: string;
        author: string;
        date: string;
        msg: string;
      }> = [];

      for (const entry of entries) {
        for (const pathEntry of entry.paths) {
          if (pathEntry.action === "D") {
            deleted.push({
              path: pathEntry._,
              kind: pathEntry.kind,
              revision: entry.revision,
              author: entry.author,
              date: entry.date,
              msg: entry.msg
            });
          }
        }
      }

      return deleted;
    }

    it("should find deleted files from log entries", () => {
      const logEntries: ISvnLogEntry[] = [
        {
          revision: "400",
          author: "bill",
          date: "2023-02-19T20:55:08Z",
          msg: "Remove real.c, no longer used",
          paths: [
            { _: "/calc/trunk/src/main.c", action: "M", kind: "file" },
            { _: "/calc/trunk/src/real.c", action: "D", kind: "file" }
          ]
        },
        {
          revision: "399",
          author: "sally",
          date: "2023-02-19T20:05:14Z",
          msg: "Undo erroneous change",
          paths: [{ _: "/calc/trunk/src/button.c", action: "M", kind: "file" }]
        }
      ];

      const deleted = filterDeletedItems(logEntries);

      expect(deleted).toHaveLength(1);
      expect(deleted[0]!.path).toBe("/calc/trunk/src/real.c");
      expect(deleted[0]!.kind).toBe("file");
      expect(deleted[0]!.revision).toBe("400");
    });

    it("should find deleted directories", () => {
      const logEntries: ISvnLogEntry[] = [
        {
          revision: "500",
          author: "admin",
          date: "2023-03-01T10:00:00Z",
          msg: "Remove old tests",
          paths: [{ _: "/project/old-tests", action: "D", kind: "dir" }]
        }
      ];

      const deleted = filterDeletedItems(logEntries);

      expect(deleted).toHaveLength(1);
      expect(deleted[0]!.kind).toBe("dir");
    });

    it("should return empty when no deletions", () => {
      const logEntries: ISvnLogEntry[] = [
        {
          revision: "100",
          author: "dev",
          date: "2023-01-01T00:00:00Z",
          msg: "Add new file",
          paths: [{ _: "/src/new.c", action: "A", kind: "file" }]
        }
      ];

      const deleted = filterDeletedItems(logEntries);

      expect(deleted).toHaveLength(0);
    });

    it("should find multiple deleted items in same commit", () => {
      const logEntries: ISvnLogEntry[] = [
        {
          revision: "600",
          author: "cleanup",
          date: "2023-04-01T00:00:00Z",
          msg: "Mass cleanup",
          paths: [
            { _: "/src/a.c", action: "D", kind: "file" },
            { _: "/src/b.c", action: "D", kind: "file" },
            { _: "/src/c.c", action: "M", kind: "file" }
          ]
        }
      ];

      const deleted = filterDeletedItems(logEntries);

      expect(deleted).toHaveLength(2);
      expect(deleted.map(d => d.path)).toEqual(["/src/a.c", "/src/b.c"]);
    });
  });

  describe("resurrect() Command Building", () => {
    /**
     * Simulates building resurrect SVN command
     */
    function buildResurrectArgs(
      repoUrl: string,
      remotePath: string,
      pegRevision: string,
      localPath: string
    ): string[] {
      // Use svn copy with peg revision to restore from specific revision
      // ^/path@revision format tells SVN to look at path as it existed at that revision
      const sourceUrl = `${repoUrl}${remotePath}@${pegRevision}`;
      return ["copy", sourceUrl, localPath];
    }

    it("should build correct svn copy command with peg revision", () => {
      const args = buildResurrectArgs(
        "https://svn.example.com/repo",
        "/trunk/src/real.c",
        "399",
        "./real.c"
      );

      expect(args[0]).toBe("copy");
      expect(args[1]).toBe("https://svn.example.com/repo/trunk/src/real.c@399");
      expect(args[2]).toBe("./real.c");
    });

    it("should handle directory paths", () => {
      const args = buildResurrectArgs(
        "https://svn.example.com/repo",
        "/trunk/old-tests",
        "499",
        "./old-tests"
      );

      expect(args[1]).toBe("https://svn.example.com/repo/trunk/old-tests@499");
    });

    it("should handle paths with @ in name", () => {
      // File named "file@2024.txt" needs special handling
      // The peg revision should be appended after escaping existing @
      function buildResurrectArgsEscaped(
        repoUrl: string,
        remotePath: string,
        pegRevision: string,
        localPath: string
      ): string[] {
        // Escape @ in path by appending empty peg revision first
        const escapedPath = remotePath.includes("@")
          ? `${remotePath}@`
          : remotePath;
        const sourceUrl = `${repoUrl}${escapedPath}@${pegRevision}`;
        return ["copy", sourceUrl, localPath];
      }

      const args = buildResurrectArgsEscaped(
        "https://svn.example.com/repo",
        "/trunk/file@2024.txt",
        "100",
        "./file@2024.txt"
      );

      // Path with @ needs double @ to escape: file@2024.txt@@100
      expect(args[1]).toBe(
        "https://svn.example.com/repo/trunk/file@2024.txt@@100"
      );
    });
  });

  describe("resurrect() Collision Handling", () => {
    /**
     * Determines action when target path already exists
     */
    enum ResurrectCollisionAction {
      Overwrite = "overwrite",
      Rename = "rename",
      Cancel = "cancel"
    }

    interface ResurrectOptions {
      onCollision?: ResurrectCollisionAction;
      newName?: string;
    }

    function determineTargetPath(
      originalPath: string,
      targetExists: boolean,
      options?: ResurrectOptions
    ): string | null {
      if (!targetExists) {
        return originalPath;
      }

      const action = options?.onCollision ?? ResurrectCollisionAction.Cancel;

      switch (action) {
        case ResurrectCollisionAction.Overwrite:
          return originalPath;
        case ResurrectCollisionAction.Rename:
          if (options?.newName) {
            return options.newName;
          }
          // Auto-generate name: file.txt -> file_restored.txt
          // Handle paths like ./file.txt or ./Makefile
          const lastSlash = originalPath.lastIndexOf("/");
          const dir =
            lastSlash >= 0 ? originalPath.substring(0, lastSlash + 1) : "";
          const filename =
            lastSlash >= 0
              ? originalPath.substring(lastSlash + 1)
              : originalPath;

          const dotIndex = filename.lastIndexOf(".");
          const hasExt = dotIndex > 0; // Must be > 0, not >= 0 (to exclude .hidden files)
          const base = hasExt ? filename.substring(0, dotIndex) : filename;
          const ext = hasExt ? filename.substring(dotIndex) : "";
          return `${dir}${base}_restored${ext}`;
        case ResurrectCollisionAction.Cancel:
        default:
          return null;
      }
    }

    it("should return original path when target doesn't exist", () => {
      const result = determineTargetPath("./real.c", false);
      expect(result).toBe("./real.c");
    });

    it("should return null when collision and cancel action", () => {
      const result = determineTargetPath("./real.c", true, {
        onCollision: ResurrectCollisionAction.Cancel
      });
      expect(result).toBeNull();
    });

    it("should return original path when collision and overwrite action", () => {
      const result = determineTargetPath("./real.c", true, {
        onCollision: ResurrectCollisionAction.Overwrite
      });
      expect(result).toBe("./real.c");
    });

    it("should generate renamed path when collision and rename action", () => {
      const result = determineTargetPath("./real.c", true, {
        onCollision: ResurrectCollisionAction.Rename
      });
      expect(result).toBe("./real_restored.c");
    });

    it("should use custom name when provided with rename action", () => {
      const result = determineTargetPath("./real.c", true, {
        onCollision: ResurrectCollisionAction.Rename,
        newName: "./real_v2.c"
      });
      expect(result).toBe("./real_v2.c");
    });

    it("should handle files without extension", () => {
      const result = determineTargetPath("./Makefile", true, {
        onCollision: ResurrectCollisionAction.Rename
      });
      expect(result).toBe("./Makefile_restored");
    });
  });
});
