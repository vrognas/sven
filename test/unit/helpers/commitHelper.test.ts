import { describe, it, expect, vi, Mock } from "vitest";
import { Uri } from "vscode";
import { Status } from "../../../src/common/types";
import { Resource } from "../../../src/resource";
import {
  buildCommitPaths,
  buildExpandedCommitPaths,
  expandCommitPaths
} from "../../../src/helpers/commitHelper";
import { Repository } from "../../../src/repository";

type MockRepository = Pick<Repository, "getResourceFromFile"> & {
  getResourceFromFile: Mock;
};

function createMockRepository(
  impl?: (path: string) => Resource | undefined
): MockRepository {
  return {
    getResourceFromFile: impl
      ? vi.fn().mockImplementation(impl)
      : vi.fn().mockReturnValue(undefined)
  };
}

describe("commitHelper", () => {
  describe("buildCommitPaths", () => {
    it("returns display paths for normal files", () => {
      const resources = [
        new Resource(Uri.file("/repo/file1.txt"), Status.MODIFIED),
        new Resource(Uri.file("/repo/file2.txt"), Status.MODIFIED)
      ];

      const mockRepository = createMockRepository();

      const result = buildCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toHaveLength(2);
      expect(result.displayPaths).toContain("/repo/file1.txt");
      expect(result.displayPaths).toContain("/repo/file2.txt");
      expect(result.renameMap.size).toBe(0);
    });

    it("tracks renamed files (ADDED + renameResourceUri)", () => {
      const newUri = Uri.file("/repo/new-name.txt");
      const oldUri = Uri.file("/repo/old-name.txt");
      const resources = [new Resource(newUri, Status.ADDED, oldUri)];

      const mockRepository = createMockRepository();

      const result = buildCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toHaveLength(1);
      expect(result.displayPaths).toContain("/repo/new-name.txt");
      expect(result.renameMap.get("/repo/new-name.txt")).toBe(
        "/repo/old-name.txt"
      );
    });

    it("includes ADDED parent directories", () => {
      const childFile = Uri.file("/repo/newdir/subdir/file.txt");
      const resources = [new Resource(childFile, Status.ADDED)];

      const mockRepository = createMockRepository((path: string) => {
        if (path === "/repo/newdir/subdir") {
          return new Resource(Uri.file(path), Status.ADDED);
        }
        if (path === "/repo/newdir") {
          return new Resource(Uri.file(path), Status.ADDED);
        }
        return undefined;
      });

      const result = buildCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toContain("/repo/newdir/subdir/file.txt");
      expect(result.displayPaths).toContain("/repo/newdir/subdir");
      expect(result.displayPaths).toContain("/repo/newdir");
      expect(result.displayPaths).toHaveLength(3);
    });

    it("does not include non-ADDED parent directories", () => {
      const childFile = Uri.file("/repo/existingdir/file.txt");
      const resources = [new Resource(childFile, Status.ADDED)];

      const mockRepository = createMockRepository((path: string) => {
        if (path === "/repo/existingdir") {
          // Parent exists but is NORMAL (already versioned)
          return new Resource(Uri.file(path), Status.NORMAL);
        }
        return undefined;
      });

      const result = buildCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toContain("/repo/existingdir/file.txt");
      expect(result.displayPaths).not.toContain("/repo/existingdir");
      expect(result.displayPaths).toHaveLength(1);
    });

    it("handles mixed files (renames + normal + added)", () => {
      const resources = [
        new Resource(Uri.file("/repo/modified.txt"), Status.MODIFIED),
        new Resource(
          Uri.file("/repo/renamed.txt"),
          Status.ADDED,
          Uri.file("/repo/original.txt")
        ),
        new Resource(Uri.file("/repo/newfile.txt"), Status.ADDED)
      ];

      const mockRepository = createMockRepository();

      const result = buildCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toHaveLength(3);
      expect(result.renameMap.size).toBe(1);
      expect(result.renameMap.get("/repo/renamed.txt")).toBe(
        "/repo/original.txt"
      );
    });

    it("deduplicates paths (multiple files in same dir)", () => {
      const resources = [
        new Resource(Uri.file("/repo/dir/file1.txt"), Status.ADDED),
        new Resource(Uri.file("/repo/dir/file2.txt"), Status.ADDED)
      ];

      const mockRepository = createMockRepository((path: string) => {
        if (path === "/repo/dir") {
          return new Resource(Uri.file(path), Status.ADDED);
        }
        return undefined;
      });

      const result = buildCommitPaths(resources, mockRepository);

      // Should have both files + parent dir (not duplicated)
      const dirCount = result.displayPaths.filter(
        p => p === "/repo/dir"
      ).length;
      expect(dirCount).toBe(1);
    });
  });

  describe("expandCommitPaths", () => {
    it("returns same paths when no renames", () => {
      const selectedPaths = ["/repo/file1.txt", "/repo/file2.txt"];
      const renameMap = new Map<string, string>();

      const result = expandCommitPaths(selectedPaths, renameMap);

      expect(result).toEqual(selectedPaths);
    });

    it("adds old paths for renamed files", () => {
      const selectedPaths = ["/repo/new-name.txt"];
      const renameMap = new Map([["/repo/new-name.txt", "/repo/old-name.txt"]]);

      const result = expandCommitPaths(selectedPaths, renameMap);

      expect(result).toContain("/repo/new-name.txt");
      expect(result).toContain("/repo/old-name.txt");
      expect(result).toHaveLength(2);
    });

    it("handles mixed selected paths", () => {
      const selectedPaths = ["/repo/new.txt", "/repo/normal.txt"];
      const renameMap = new Map([["/repo/new.txt", "/repo/old.txt"]]);

      const result = expandCommitPaths(selectedPaths, renameMap);

      expect(result).toHaveLength(3);
      expect(result).toContain("/repo/new.txt");
      expect(result).toContain("/repo/old.txt");
      expect(result).toContain("/repo/normal.txt");
    });
  });

  describe("buildExpandedCommitPaths", () => {
    it("includes old rename paths in commit paths", () => {
      const resources = [
        new Resource(
          Uri.file("/repo/new-name.txt"),
          Status.ADDED,
          Uri.file("/repo/old-name.txt")
        )
      ];
      const mockRepository = createMockRepository();

      const result = buildExpandedCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toEqual(["/repo/new-name.txt"]);
      expect(result.commitPaths).toContain("/repo/new-name.txt");
      expect(result.commitPaths).toContain("/repo/old-name.txt");
    });

    it("expands added parent directories for commit paths", () => {
      const resources = [
        new Resource(Uri.file("/repo/newdir/file.txt"), Status.ADDED)
      ];
      const mockRepository = createMockRepository((path: string) => {
        if (path === "/repo/newdir") {
          return new Resource(Uri.file(path), Status.ADDED);
        }
        return undefined;
      });

      const result = buildExpandedCommitPaths(resources, mockRepository);

      expect(result.displayPaths).toContain("/repo/newdir/file.txt");
      expect(result.displayPaths).toContain("/repo/newdir");
      expect(result.commitPaths).toContain("/repo/newdir/file.txt");
      expect(result.commitPaths).toContain("/repo/newdir");
    });
  });
});
