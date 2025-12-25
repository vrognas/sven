import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Walkthrough Prompt Tests (P0.3)
 *
 * Tests auto-onboarding prompt on first repository open.
 * Design decision: prompt on first repo open, not activation.
 */

// Mock VS Code window and commands
const mockWindow = {
  showInformationMessage: vi.fn()
};

const mockCommands = {
  executeCommand: vi.fn()
};

// Mock global state
const mockGlobalState = {
  get: vi.fn(),
  update: vi.fn()
};

/**
 * Prompt walkthrough on first repository open.
 * Returns true if prompt was shown, false if skipped.
 */
async function promptWalkthrough(globalState: {
  get: (key: string) => boolean | undefined;
  update: (key: string, value: boolean) => Promise<void>;
}): Promise<boolean> {
  const hasCompletedSetup = globalState.get("sven.setupComplete");
  if (hasCompletedSetup) {
    return false; // Skip - already completed
  }

  const action = await mockWindow.showInformationMessage(
    "SVN repository detected. Need help getting started?",
    "Quick Tour",
    "Dismiss"
  );

  if (action === "Quick Tour") {
    await mockCommands.executeCommand(
      "workbench.action.openWalkthrough",
      "vrognas.sven#sven.gettingStarted"
    );
  }

  // Mark as complete regardless of choice (don't ask again)
  await globalState.update("sven.setupComplete", true);
  return true;
}

describe("Walkthrough Prompt (P0.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGlobalState.get.mockReturnValue(undefined);
    mockGlobalState.update.mockResolvedValue(undefined);
  });

  describe("First Repository Open", () => {
    it("shows prompt when setupComplete is not set", async () => {
      mockGlobalState.get.mockReturnValue(undefined);
      mockWindow.showInformationMessage.mockResolvedValue("Dismiss");

      const shown = await promptWalkthrough(mockGlobalState);

      expect(shown).toBe(true);
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining("SVN repository"),
        "Quick Tour",
        "Dismiss"
      );
    });

    it("opens walkthrough when user clicks Quick Tour", async () => {
      mockWindow.showInformationMessage.mockResolvedValue("Quick Tour");

      await promptWalkthrough(mockGlobalState);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        "workbench.action.openWalkthrough",
        expect.stringContaining("sven.gettingStarted")
      );
    });

    it("does not open walkthrough when user dismisses", async () => {
      mockWindow.showInformationMessage.mockResolvedValue("Dismiss");

      await promptWalkthrough(mockGlobalState);

      expect(mockCommands.executeCommand).not.toHaveBeenCalled();
    });

    it("marks setup complete after showing prompt", async () => {
      mockWindow.showInformationMessage.mockResolvedValue("Dismiss");

      await promptWalkthrough(mockGlobalState);

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        "sven.setupComplete",
        true
      );
    });

    it("marks setup complete even when user clicks Quick Tour", async () => {
      mockWindow.showInformationMessage.mockResolvedValue("Quick Tour");

      await promptWalkthrough(mockGlobalState);

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        "sven.setupComplete",
        true
      );
    });
  });

  describe("Subsequent Repository Opens", () => {
    it("skips prompt when setupComplete is true", async () => {
      mockGlobalState.get.mockReturnValue(true);

      const shown = await promptWalkthrough(mockGlobalState);

      expect(shown).toBe(false);
      expect(mockWindow.showInformationMessage).not.toHaveBeenCalled();
    });

    it("does not update globalState when skipped", async () => {
      mockGlobalState.get.mockReturnValue(true);

      await promptWalkthrough(mockGlobalState);

      expect(mockGlobalState.update).not.toHaveBeenCalled();
    });
  });
});
