import { describe, it, expect, vi, beforeEach } from "vitest";
import { PreCommitUpdateService } from "../../../src/services/preCommitUpdateService";

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    withProgress: vi.fn(),
    showWarningMessage: vi.fn()
  },
  ProgressLocation: { Notification: 15 },
  commands: { executeCommand: vi.fn() }
}));

describe("Commit workflow performance", () => {
  let mockWindow: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const vscode = await import("vscode");
    mockWindow = vscode.window;
    mockWindow.withProgress.mockImplementation(
      async (
        _opts: unknown,
        task: (p: unknown, t: unknown) => Promise<unknown>
      ) => {
        return task({ report: vi.fn() }, { isCancellationRequested: false });
      }
    );
  });

  describe("PreCommitUpdateService cached remote check", () => {
    it("skips hasRemoteChanges call when fresh cached result is false", async () => {
      const service = new PreCommitUpdateService();
      const mockRepo = {
        hasRemoteChanges: vi.fn().mockResolvedValue(true),
        updateRevision: vi.fn().mockResolvedValue({
          revision: 100,
          conflicts: [],
          message: "Updated"
        }),
        getLastRemoteCheckResult: vi.fn().mockReturnValue({
          hasChanges: false,
          timestamp: Date.now() // fresh
        }),
        getRemoteCheckFrequencyMs: vi.fn().mockReturnValue(300_000)
      };

      const result = await service.runUpdate(mockRepo);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(mockRepo.hasRemoteChanges).not.toHaveBeenCalled();
    });

    it("calls hasRemoteChanges when cached result is stale", async () => {
      const service = new PreCommitUpdateService();
      const mockRepo = {
        hasRemoteChanges: vi.fn().mockResolvedValue(false),
        updateRevision: vi.fn(),
        getLastRemoteCheckResult: vi.fn().mockReturnValue({
          hasChanges: false,
          timestamp: Date.now() - 600_000 // 10 min ago, stale
        }),
        getRemoteCheckFrequencyMs: vi.fn().mockReturnValue(300_000)
      };

      await service.runUpdate(mockRepo);

      expect(mockRepo.hasRemoteChanges).toHaveBeenCalled();
    });

    it("falls back to hasRemoteChanges when no cached result", async () => {
      const service = new PreCommitUpdateService();
      const mockRepo = {
        hasRemoteChanges: vi.fn().mockResolvedValue(true),
        updateRevision: vi.fn().mockResolvedValue({
          revision: 50,
          conflicts: [],
          message: "Updated"
        }),
        getLastRemoteCheckResult: vi.fn().mockReturnValue(undefined),
        getRemoteCheckFrequencyMs: vi.fn().mockReturnValue(300_000)
      };

      await service.runUpdate(mockRepo);

      expect(mockRepo.hasRemoteChanges).toHaveBeenCalled();
      expect(mockRepo.updateRevision).toHaveBeenCalled();
    });
  });
});
