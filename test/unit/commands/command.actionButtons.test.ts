import { beforeEach, describe, expect, it, vi } from "vitest";
import { commands, window } from "vscode";
import { Command } from "../../../src/commands/command";

class TestActionCommand extends Command {
  constructor() {
    super("test.actionButtons");
  }

  public execute(): void {
    // No-op for tests
  }

  public async invokeHandleRepositoryOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | undefined> {
    return (
      this as unknown as {
        handleRepositoryOperation(
          op: () => Promise<T>,
          msg: string
        ): Promise<T | undefined>;
      }
    ).handleRepositoryOperation(operation, errorMessage);
  }
}

describe("Command action button wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Clear Credentials' and executes sven.clearCredentials", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Clear Credentials" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E170001: Authorization failed");
    }, "Fallback");

    expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Clear Credentials"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith(
      "sven.clearCredentials"
    );
  });

  it("shows 'Run Cleanup' and executes sven.cleanup", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Run Cleanup" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E155004: Working copy locked");
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Run Cleanup"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.cleanup");
  });

  it("shows 'Resolve Conflicts' and executes sven.resolveAll", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Resolve Conflicts" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E155023: Conflict detected");
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Resolve Conflicts"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.resolveAll");
  });

  it("shows 'Steal Lock' and executes sven.stealLock", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Steal Lock" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error(
        "svn: E200035: Path is already locked; conflict on lock state"
      );
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Steal Lock"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.stealLock");
  });

  it("shows 'Lock File' for E200036 and executes sven.lock", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Lock File" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E200036: Path is not locked");
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Lock File"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.lock");
  });

  it("shows 'Lock File' for E200041 and executes sven.lock", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Lock File" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E200041: lock expired");
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Lock File"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.lock");
  });

  it("keeps cleanup action for working-copy lock errors", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Run Cleanup" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E155004: Working copy is locked");
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Run Cleanup"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.cleanup");
  });

  it("shows 'Show Output' and executes sven.showOutput", async () => {
    const command = new TestActionCommand();
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce(
      "Show Output" as never
    );

    await command.invokeHandleRepositoryOperation(async () => {
      throw new Error("svn: E261001: Item is not readable");
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe(
      "Show Output"
    );
    expect(commands.executeCommand).toHaveBeenCalledWith("sven.showOutput");
  });

  it("shows 'Retry' and retries operation without command execution", async () => {
    const command = new TestActionCommand();
    let attempts = 0;
    vi.mocked(window.showErrorMessage).mockResolvedValueOnce("Retry" as never);

    const result = await command.invokeHandleRepositoryOperation(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("svn: E170013: Unable to connect");
      }
      return "ok";
    }, "Fallback");

    expect(vi.mocked(window.showErrorMessage).mock.calls[0]?.[1]).toBe("Retry");
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
    expect(commands.executeCommand).not.toHaveBeenCalled();
  });
});
