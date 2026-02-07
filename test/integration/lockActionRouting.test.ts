import { beforeEach, describe, expect, it, vi } from "vitest";
import { commands, window } from "vscode";
import { Command } from "../../src/commands/command";

class TestLockRoutingCommand extends Command {
  constructor() {
    super("test.lockActionRouting");
  }

  public execute(): void {
    // No-op for tests
  }

  public async runOperation<T>(
    operation: () => Promise<T>,
    fallback: string
  ): Promise<T | undefined> {
    return (
      this as unknown as {
        handleRepositoryOperation(
          op: () => Promise<T>,
          msg: string
        ): Promise<T | undefined>;
      }
    ).handleRepositoryOperation(operation, fallback);
  }
}

describe("Integration: Lock Action Routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers lock action over cleanup/conflict text when E200035 is present", async () => {
    const command = new TestLockRoutingCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Steal Lock" as never
    );

    await command.runOperation(async () => {
      const err = new Error("operation failed") as Error & {
        stderr?: string;
      };

      err.stderr =
        "svn: E200035: Path is already locked by user\n" +
        "svn: E155004: Working copy is locked\n" +
        "Conflict detected during operation";
      throw err;
    }, "Fallback");

    expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Steal Lock"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.stealLock");
  });
});
