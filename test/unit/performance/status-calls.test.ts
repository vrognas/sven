import { describe, it, expect } from "vitest";
import { shouldFetchLockStatus } from "../../../src/util";
import { Operation } from "../../../src/common/types";

describe("Status call optimization", () => {
  describe("shouldFetchLockStatus", () => {
    it("returns false for regular Status (file watcher path)", () => {
      expect(shouldFetchLockStatus(Operation.Status)).toBe(false);
    });

    it("returns false for Commit (no lock refresh needed)", () => {
      expect(shouldFetchLockStatus(Operation.Commit)).toBe(false);
    });

    it("returns true for StatusRemote (needs --show-updates)", () => {
      expect(shouldFetchLockStatus(Operation.StatusRemote)).toBe(true);
    });

    it("returns true for Lock/Unlock operations", () => {
      expect(shouldFetchLockStatus(Operation.Lock)).toBe(true);
      expect(shouldFetchLockStatus(Operation.Unlock)).toBe(true);
    });
  });
});
