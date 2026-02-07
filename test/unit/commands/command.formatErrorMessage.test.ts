import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "../../../src/commands/command";

class TestCommand extends Command {
  constructor() {
    super("test.formatErrorMessage");
  }

  public execute(): void {
    // No-op for tests
  }

  public format(error: unknown, fallback: string): string {
    return (
      this as unknown as {
        formatErrorMessage(error: unknown, fallbackMsg: string): string;
      }
    ).formatErrorMessage(error, fallback);
  }
}

describe("Command formatErrorMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prioritizes authentication errors over network errors", () => {
    const command = new TestCommand();

    const message = command.format(
      {
        message: "svn: E170013: Unable to connect to a repository",
        stderr: "svn: E215004: No more credentials available"
      },
      "Operation failed"
    );

    expect(message).toBe(
      "Authentication failed (E215004). Check credentials and try again."
    );
  });

  it("formats cleanup guidance with default code when no code is present", () => {
    const command = new TestCommand();

    const message = command.format(
      {
        message: "sqlite: database is locked",
        stderr: "previous operation has not finished"
      },
      "Operation failed"
    );

    expect(message).toBe(
      "Working copy needs cleanup (E155004). Run cleanup to fix."
    );
  });

  it("uses fallback with extracted code for unknown errors", () => {
    const command = new TestCommand();

    const message = command.format(
      {
        stderr: "svn: E999999: Unknown failure"
      },
      "Operation failed"
    );

    expect(message).toBe("Operation failed (E999999)");
  });

  it("formats timeout errors from text patterns", () => {
    const command = new TestCommand();

    const message = command.format(
      {
        stderr: "Operation timed out while contacting server"
      },
      "Operation failed"
    );

    expect(message).toBe(
      "Network timeout (E175002). Try again or check network connection."
    );
  });

  it("formats timeout errors from E175002 code", () => {
    const command = new TestCommand();

    const message = command.format(
      {
        stderr: "svn: E175002: PROPFIND of '/repo': timed out"
      },
      "Operation failed"
    );

    expect(message).toBe(
      "Network timeout (E175002). Try again or check network connection."
    );
  });

  it("formats connection errors for host resolution failures", () => {
    const command = new TestCommand();

    const message = command.format(
      {
        stderr: "Could not resolve host name svn.example.invalid"
      },
      "Operation failed"
    );

    expect(message).toBe(
      "Unable to connect (E170013). Check network and repository URL."
    );
  });
});
