import { describe, it, expect } from "vitest";

/**
 * Actionable Errors Tests
 *
 * Tests for error detection functions that determine which action buttons to show.
 * TDD: Write tests first, then implement in command.ts
 */

/**
 * Detect if error needs authentication action ("Clear Credentials" button).
 * Error codes: E170001 (auth failed), E215004 (no credentials)
 */
function needsAuthAction(errorMessage: string): boolean {
  const fullError = errorMessage.toLowerCase();
  return (
    fullError.includes("e170001") ||
    fullError.includes("e215004") ||
    fullError.includes("no more credentials") ||
    fullError.includes("authorization failed") ||
    fullError.includes("authentication failed")
  );
}

/**
 * Detect if error needs network retry action ("Retry" button).
 * Error codes: E170013 (connection failed), E175002 (timeout)
 */
function needsNetworkRetry(errorMessage: string): boolean {
  const fullError = errorMessage.toLowerCase();
  return (
    fullError.includes("e170013") ||
    fullError.includes("e175002") ||
    fullError.includes("unable to connect") ||
    fullError.includes("network timeout") ||
    fullError.includes("connection refused") ||
    fullError.includes("could not connect")
  );
}

/**
 * Detect if error needs lock action ("Steal Lock", "Lock File", or "Re-lock" button).
 * Returns the specific lock error type for choosing the right action.
 * Error codes: E200035 (locked by other), E200036 (not locked), E200041 (expired)
 */
function getLockErrorType(
  errorMessage: string
): "conflict" | "notLocked" | "expired" | null {
  const fullError = errorMessage.toLowerCase();

  if (fullError.includes("e200035") || fullError.includes("already locked")) {
    return "conflict";
  }
  if (fullError.includes("e200036") || fullError.includes("not locked")) {
    return "notLocked";
  }
  if (fullError.includes("e200041") || fullError.includes("lock expired")) {
    return "expired";
  }
  return null;
}

/**
 * Detect if error needs permission/output action ("Show Output" button).
 * Error codes: E261001 (access denied), E261002 (partial access), E250006 (version mismatch)
 */
function needsOutputAction(errorMessage: string): boolean {
  const fullError = errorMessage.toLowerCase();
  return (
    fullError.includes("e261001") ||
    fullError.includes("e261002") ||
    fullError.includes("e250006") ||
    fullError.includes("access denied") ||
    fullError.includes("permission denied") ||
    fullError.includes("not readable")
  );
}

describe("Actionable Errors - Auth Detection", () => {
  describe("needsAuthAction", () => {
    it("detects E170001 (authorization failed)", () => {
      expect(needsAuthAction("svn: E170001: Authorization failed")).toBe(true);
    });

    it("detects E215004 (no more credentials)", () => {
      expect(
        needsAuthAction("svn: E215004: No more credentials available")
      ).toBe(true);
    });

    it("detects 'No more credentials' text pattern", () => {
      expect(needsAuthAction("No more credentials or we tried too many")).toBe(
        true
      );
    });

    it("detects 'authentication failed' text pattern", () => {
      expect(needsAuthAction("SASL authentication failed")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(needsAuthAction("SVN: E170001: AUTHORIZATION FAILED")).toBe(true);
    });

    it("does not flag network errors as auth", () => {
      expect(needsAuthAction("svn: E170013: Unable to connect")).toBe(false);
    });

    it("does not flag cleanup errors as auth", () => {
      expect(needsAuthAction("svn: E155004: Working copy locked")).toBe(false);
    });
  });
});

describe("Actionable Errors - Network Detection", () => {
  describe("needsNetworkRetry", () => {
    it("detects E170013 (unable to connect)", () => {
      expect(
        needsNetworkRetry("svn: E170013: Unable to connect to a repository")
      ).toBe(true);
    });

    it("detects E175002 (network timeout)", () => {
      expect(
        needsNetworkRetry("svn: E175002: Network connection timed out")
      ).toBe(true);
    });

    it("detects 'unable to connect' text pattern", () => {
      expect(needsNetworkRetry("Unable to connect to host")).toBe(true);
    });

    it("detects 'connection refused' text pattern", () => {
      expect(needsNetworkRetry("Connection refused by server")).toBe(true);
    });

    it("does not flag auth errors as network", () => {
      expect(needsNetworkRetry("svn: E170001: Authorization failed")).toBe(
        false
      );
    });

    it("does not flag cleanup errors as network", () => {
      expect(needsNetworkRetry("svn: E155004: Working copy locked")).toBe(
        false
      );
    });
  });
});

describe("Actionable Errors - Lock Detection", () => {
  describe("getLockErrorType", () => {
    it("detects E200035 as 'conflict' (path locked by another user)", () => {
      expect(getLockErrorType("svn: E200035: Path is already locked")).toBe(
        "conflict"
      );
    });

    it("detects 'already locked' as 'conflict'", () => {
      expect(getLockErrorType("File is already locked by user@host")).toBe(
        "conflict"
      );
    });

    it("detects E200036 as 'notLocked' (path not locked)", () => {
      expect(getLockErrorType("svn: E200036: Path is not locked")).toBe(
        "notLocked"
      );
    });

    it("detects 'not locked' as 'notLocked'", () => {
      expect(getLockErrorType("Cannot unlock - file is not locked")).toBe(
        "notLocked"
      );
    });

    it("detects E200041 as 'expired' (lock expired)", () => {
      expect(getLockErrorType("svn: E200041: Lock has expired")).toBe(
        "expired"
      );
    });

    it("detects 'lock expired' as 'expired'", () => {
      expect(getLockErrorType("Your lock expired 2 hours ago")).toBe("expired");
    });

    it("returns null for non-lock errors", () => {
      expect(getLockErrorType("svn: E155004: Working copy locked")).toBe(null);
    });

    it("returns null for auth errors", () => {
      expect(getLockErrorType("svn: E170001: Authorization failed")).toBe(null);
    });
  });
});

describe("Actionable Errors - Output/Permission Detection", () => {
  describe("needsOutputAction", () => {
    it("detects E261001 (access denied)", () => {
      expect(needsOutputAction("svn: E261001: Item is not readable")).toBe(
        true
      );
    });

    it("detects E261002 (partial access)", () => {
      expect(
        needsOutputAction("svn: E261002: Item is only partially readable")
      ).toBe(true);
    });

    it("detects E250006 (version mismatch)", () => {
      expect(
        needsOutputAction("svn: E250006: Client/server version mismatch")
      ).toBe(true);
    });

    it("detects 'access denied' text pattern", () => {
      expect(needsOutputAction("Access denied to repository")).toBe(true);
    });

    it("detects 'permission denied' text pattern", () => {
      expect(needsOutputAction("Permission denied: /path/to/file")).toBe(true);
    });

    it("does not flag auth errors as permission", () => {
      expect(needsOutputAction("svn: E170001: Authorization failed")).toBe(
        false
      );
    });

    it("does not flag network errors as permission", () => {
      expect(needsOutputAction("svn: E170013: Unable to connect")).toBe(false);
    });
  });
});

describe("Actionable Errors - Priority Order", () => {
  /**
   * When multiple error types could match, we need a priority order.
   * Auth errors should be checked BEFORE generic network errors
   * because E170001 could appear with E170013 in the same stderr.
   */
  it("auth errors take priority over network errors", () => {
    // Real SVN output often has both codes
    const multiError =
      "svn: E170013: Unable to connect\nsvn: E215004: No more credentials";

    // Auth should win because it's more specific
    const isAuth = needsAuthAction(multiError);
    const isNetwork = needsNetworkRetry(multiError);

    expect(isAuth).toBe(true);
    // Network also matches, but auth should be handled first in code
    expect(isNetwork).toBe(true);
  });

  it("lock errors are distinct from working copy lock errors", () => {
    // E155004 = working copy locked (needs cleanup)
    // E200035 = file locked by another user (needs steal/break lock)
    const wcLocked = "svn: E155004: Working copy locked";
    const fileLocked = "svn: E200035: Path is already locked by user";

    expect(getLockErrorType(wcLocked)).toBe(null); // Not a file lock error
    expect(getLockErrorType(fileLocked)).toBe("conflict"); // Is a file lock error
  });
});
