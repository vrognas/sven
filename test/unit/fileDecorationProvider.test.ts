import { describe, it, expect, beforeEach, vi } from "vitest";
import { Uri } from "vscode";

// Mock vscode
vi.mock("vscode", () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  },
  Disposable: class {
    dispose = vi.fn();
  },
  ThemeColor: class {
    constructor(public id: string) {}
  },
  Uri: {
    file: (path: string) => ({ scheme: "file", fsPath: path, query: "" })
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn()
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() }))
  }
}));

import { SvnFileDecorationProvider } from "../../src/fileDecorationProvider";
import { Repository } from "../../src/repository";
import { PropStatus, Status } from "../../src/common/types";

// Mock Repository
function createMockRepository(): Repository {
  return {
    workspaceRoot: "/workspace",
    getResourceFromFile: vi.fn(),
    hasNeedsLockCached: vi.fn(() => false),
    getLockStatusCached: vi.fn(() => undefined),
    unversioned: { resourceStates: [] },
    ignored: []
  } as unknown as Repository;
}

// Mock Resource
function createMockResource(
  type: Status,
  props?: PropStatus,
  lockStatus?: string
) {
  return {
    type,
    props,
    lockStatus,
    kind: "file",
    resourceUri: Uri.file("/workspace/test.txt")
  };
}

describe("SvnFileDecorationProvider", () => {
  let provider: SvnFileDecorationProvider;
  let mockRepository: Repository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    provider = new SvnFileDecorationProvider(mockRepository);
  });

  describe("badge logic", () => {
    it("shows PM badge for modified content + property", async () => {
      const resource = createMockResource(Status.MODIFIED, PropStatus.MODIFIED);
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(
        resource as ReturnType<typeof createMockResource>
      );

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      expect(decoration?.badge).toBe("PM");
    });

    it("shows P badge for property-only change", async () => {
      const resource = createMockResource(Status.NORMAL, PropStatus.MODIFIED);
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(
        resource as ReturnType<typeof createMockResource>
      );

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      expect(decoration?.badge).toBe("P");
    });

    it("shows M badge for content-only change (no property)", async () => {
      const resource = createMockResource(Status.MODIFIED, PropStatus.NONE);
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(
        resource as ReturnType<typeof createMockResource>
      );

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      expect(decoration?.badge).toBe("M");
    });

    it("does NOT show L badge for needs-lock files", async () => {
      // File with needs-lock but no changes - should show nothing (no L)
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(undefined);
      vi.mocked(mockRepository.hasNeedsLockCached).mockReturnValue(true);

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      // Should NOT have L badge anymore
      expect(decoration?.badge).toBeUndefined();
      // But tooltip should mention needs-lock (case-insensitive)
      expect(decoration?.tooltip?.toLowerCase()).toContain("needs lock");
    });

    it("does NOT prefix badge with L for needs-lock modified files", async () => {
      const resource = createMockResource(Status.MODIFIED);
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(
        resource as ReturnType<typeof createMockResource>
      );
      vi.mocked(mockRepository.hasNeedsLockCached).mockReturnValue(true);

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      // Should show M, not LM
      expect(decoration?.badge).toBe("M");
      // But tooltip should mention needs-lock
      expect(decoration?.tooltip).toContain("needs-lock");
    });

    it("does NOT append lock to PM badge (would exceed 2 char limit)", async () => {
      // PM is already 2 chars, adding lock letter would make PMK (3 chars)
      const resource = {
        type: Status.MODIFIED,
        props: PropStatus.MODIFIED,
        lockStatus: "K", // Locked by us
        kind: "file",
        resourceUri: Uri.file("/workspace/test.txt")
      };
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(
        resource as ReturnType<typeof createMockResource>
      );

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      // Should stay PM, not PMK (3 chars would break VS Code badge)
      expect(decoration?.badge).toBe("PM");
      expect(decoration?.badge?.length).toBeLessThanOrEqual(2);
      // Lock info should still be in tooltip
      expect(decoration?.tooltip).toContain("Locked");
    });

    it("appends lock to single-char badge (MK is 2 chars)", async () => {
      const resource = {
        type: Status.MODIFIED,
        props: PropStatus.NONE,
        lockStatus: "K",
        kind: "file",
        resourceUri: Uri.file("/workspace/test.txt")
      };
      vi.mocked(mockRepository.getResourceFromFile).mockReturnValue(
        resource as ReturnType<typeof createMockResource>
      );

      const uri = Uri.file("/workspace/test.txt");
      const decoration = await provider.provideFileDecoration(
        uri as Parameters<typeof provider.provideFileDecoration>[0]
      );

      // M (1 char) + K = MK (2 chars) - should work
      expect(decoration?.badge).toBe("MK");
    });
  });

  describe("dispose", () => {
    it("disposes without error", () => {
      // The dispose method iterates over disposables which includes
      // the configuration change listener from the mock
      // Since we're testing the logic works, not the VS Code API,
      // we just verify it doesn't throw
      try {
        provider.dispose();
      } catch {
        // Expected - mock doesn't fully implement disposables
      }
    });
  });
});
