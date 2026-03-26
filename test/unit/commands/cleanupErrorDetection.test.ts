import { describe, it, expect } from "vitest";
import {
  needsCleanupFromFullError,
  needsConflictResolutionFromFullError
} from "../../../src/commands/errorDetectors";

/**
 * Cleanup Error Detection Tests
 *
 * Tests real production detectors from errorDetectors.ts.
 * No mirror functions — tests import and call production code directly.
 */

describe("Cleanup Error Detection", () => {
  describe("Error Code Detection", () => {
    it("detects E155004 (working copy locked)", () => {
      expect(needsCleanupFromFullError("svn: e155004: working copy is locked")).toBe(true);
    });

    it("detects E155037 (previous operation interrupted)", () => {
      expect(
        needsCleanupFromFullError(
          "svn: e155037: previous operation has not finished; run 'cleanup' if it was interrupted"
        )
      ).toBe(true);
    });

    it("detects E200030 (sqlite database issue)", () => {
      expect(needsCleanupFromFullError("svn: e200030: sqlite: database is locked")).toBe(true);
    });

    it("detects E155032 (working copy database problem)", () => {
      expect(needsCleanupFromFullError("svn: e155032: the working copy database is corrupted")).toBe(true);
    });

    it("detects E155009 (failed to run WC DB work queue)", () => {
      expect(
        needsCleanupFromFullError("svn: e155009: failed to run the wc db work queue associated with '/path'")
      ).toBe(true);
    });

    it("detects E200033 (sqlite database busy)", () => {
      expect(needsCleanupFromFullError("svn: e200033: sqlite[s5]: database is busy")).toBe(true);
    });

    it("detects E155016 (working copy corrupt)", () => {
      expect(needsCleanupFromFullError("svn: e155016: working copy is corrupt")).toBe(true);
    });

    it("detects E200034 (sqlite rollback reset)", () => {
      expect(
        needsCleanupFromFullError("svn: e200034: sqlite busy at transaction rollback; resetting all statements")
      ).toBe(true);
    });

    it("detects E155031 (unexpected status)", () => {
      expect(needsCleanupFromFullError("svn: e155031: path has unexpected status")).toBe(true);
    });
  });

  describe("Text Pattern Detection", () => {
    it("detects 'previous operation' text", () => {
      expect(needsCleanupFromFullError("previous operation has not finished")).toBe(true);
    });

    it("detects 'run cleanup' instruction", () => {
      expect(needsCleanupFromFullError("run 'cleanup' if it was interrupted")).toBe(true);
    });

    it("detects 'sqlite:' errors", () => {
      expect(needsCleanupFromFullError("sqlite: database is locked")).toBe(true);
    });

    it("detects 'sqlite[S5]' errors", () => {
      expect(needsCleanupFromFullError("sqlite[s5]: database is locked")).toBe(true);
    });

    it("detects 'work queue' text", () => {
      expect(needsCleanupFromFullError("failed to run the wc db work queue")).toBe(true);
    });

    it("detects 'is corrupt' text", () => {
      expect(needsCleanupFromFullError("working copy is corrupt")).toBe(true);
    });

    it("detects 'disk image is malformed' text", () => {
      expect(needsCleanupFromFullError("sqlite: disk image is malformed")).toBe(true);
    });

    it("detects 'blocked' text", () => {
      expect(needsCleanupFromFullError("operation blocked by lock")).toBe(true);
    });

    it("works with lowercased input (as produced by buildErrorContext)", () => {
      // Production lowercases via buildErrorContext before calling detectors
      expect(needsCleanupFromFullError("svn: e155004: locked")).toBe(true);
      expect(needsCleanupFromFullError("sqlite: database locked")).toBe(true);
    });
  });

  describe("Non-Cleanup Errors", () => {
    it("does not flag auth errors", () => {
      expect(needsCleanupFromFullError("svn: e170001: authorization failed")).toBe(false);
    });

    it("does not flag network errors", () => {
      expect(needsCleanupFromFullError("svn: e170013: unable to connect")).toBe(false);
    });

    it("does not flag conflict errors (E155015)", () => {
      expect(needsCleanupFromFullError("svn: e155015: remains in conflict")).toBe(false);
    });

    it("does not flag random errors", () => {
      expect(needsCleanupFromFullError("file not found")).toBe(false);
    });

    it("does not flag 'unlocked' (false positive guard)", () => {
      expect(needsCleanupFromFullError("'file.txt' unlocked.")).toBe(false);
    });

    it("does not flag successful unlock operation", () => {
      expect(needsCleanupFromFullError("unlocked file successfully")).toBe(false);
    });

    it("does not flag 'sqlite' in file paths", () => {
      expect(needsCleanupFromFullError("error in /path/to/sqlite_backup/")).toBe(false);
    });

    it("does not flag 'sqlite' as substring", () => {
      expect(needsCleanupFromFullError("mysqlite.db not found")).toBe(false);
    });

    it("plain 'locked' without error code does NOT trigger cleanup", () => {
      expect(needsCleanupFromFullError("the working copy is locked")).toBe(false);
    });
  });

  describe("Conflict Error Detection", () => {
    it("E155015 triggers conflict resolution, not cleanup", () => {
      const error = "svn: e155015: aborting commit: remains in conflict";
      expect(needsCleanupFromFullError(error)).toBe(false);
      expect(needsConflictResolutionFromFullError(error)).toBe(true);
    });
  });
});
