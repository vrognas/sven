import * as assert from "assert";
import { commands, Disposable, Uri, window } from "vscode";
import { vi } from "vitest";
import { Status } from "../../../common/types";
import { CheckActiveEditor } from "../../../contexts/checkActiveEditor";
import { HasBranch } from "../../../contexts/hasBranch";
import { IsSvn18orGreater } from "../../../contexts/isSvn18orGreater";
import { IsSvn19orGreater } from "../../../contexts/isSvn19orGreater";
import { OpenRepositoryCount } from "../../../contexts/openRepositoryCount";
import { createVersionContext } from "../../../contexts/svnVersionContext";
import { Resource } from "../../../resource";

type Listener = () => void;

function createMockScmManager(repositories: any[] = []) {
  const listeners: Record<string, Listener | undefined> = {};
  const addListener =
    (key: string) =>
    (cb: (...args: unknown[]) => void, thisArg?: unknown) => {
      listeners[key] = () => cb.call(thisArg);
      return new Disposable(() => {
        listeners[key] = undefined;
      });
    };

  return {
    manager: {
      repositories,
      onDidOpenRepository: addListener("open"),
      onDidCloseRepository: addListener("close"),
      onDidChangeRepository: addListener("changeRepo"),
      onDidChangeStatusRepository: addListener("status"),
      getRepository: vi.fn()
    } as any,
    emit: (key: keyof typeof listeners) => listeners[key]?.()
  };
}

suite("contexts", () => {
  setup(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    (window as any).activeTextEditor = undefined;
  });

  teardown(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test("createVersionContext sets setContext based on semver", () => {
    const execSpy = vi
      .spyOn(commands, "executeCommand")
      .mockResolvedValue(undefined);

    const disposable1 = createVersionContext("1.9.0", "1.8", "isNewer");
    const disposable2 = createVersionContext("1.7.9", "1.8", "isNewer");

    assert.strictEqual(execSpy.mock.calls.length, 2);
    assert.deepStrictEqual(execSpy.mock.calls[0], [
      "setContext",
      "isNewer",
      true
    ]);
    assert.deepStrictEqual(execSpy.mock.calls[1], [
      "setContext",
      "isNewer",
      false
    ]);
    assert.doesNotThrow(() => disposable1.dispose());
    assert.doesNotThrow(() => disposable2.dispose());
  });

  test("IsSvn18orGreater and IsSvn19orGreater delegate + dispose", () => {
    const execSpy = vi
      .spyOn(commands, "executeCommand")
      .mockResolvedValue(undefined);

    const v18 = new IsSvn18orGreater("1.8.0");
    const v19 = new IsSvn19orGreater("1.8.9");
    v18.dispose();
    v19.dispose();

    assert.deepStrictEqual(execSpy.mock.calls[0], [
      "setContext",
      "isSvn18orGreater",
      true
    ]);
    assert.deepStrictEqual(execSpy.mock.calls[1], [
      "setContext",
      "isSvn19orGreater",
      false
    ]);
  });

  test("HasBranch updates context after debounce", () => {
    const execSpy = vi
      .spyOn(commands, "executeCommand")
      .mockResolvedValue(undefined);
    const { manager, emit } = createMockScmManager([
      { currentBranch: "trunk" },
      { currentBranch: "branches/feature-x" }
    ]);

    const ctx = new HasBranch(manager);
    vi.advanceTimersByTime(120);
    emit("changeRepo");
    vi.advanceTimersByTime(120);

    const calls = execSpy.mock.calls.filter(c => c[1] === "sven.hasBranch");
    assert.ok(calls.length >= 1);
    assert.strictEqual(calls[calls.length - 1]?.[2], true);
    ctx.dispose();
  });

  test("OpenRepositoryCount sets repository count + reacts to editor changes", () => {
    const execSpy = vi
      .spyOn(commands, "executeCommand")
      .mockResolvedValue(undefined);
    const { manager, emit } = createMockScmManager([{}, {}]);

    const ctx = new OpenRepositoryCount(manager);
    vi.advanceTimersByTime(120);
    emit("open");
    vi.advanceTimersByTime(120);

    const calls = execSpy.mock.calls.filter(
      c => c[1] === "svnOpenRepositoryCount"
    );
    assert.ok(calls.length >= 1);
    assert.strictEqual(calls[calls.length - 1]?.[2], 2);
    ctx.dispose();
  });

  test("CheckActiveEditor resolves change state from active file resource", () => {
    const execSpy = vi
      .spyOn(commands, "executeCommand")
      .mockResolvedValue(undefined);
    const fileUri = Uri.file("/repo/file.ts");
    (window as any).activeTextEditor = { document: { uri: fileUri } };

    const resource = new Resource(fileUri, Status.MODIFIED);
    const repo = { getResourceFromFile: vi.fn(() => resource) } as any;
    const { manager, emit } = createMockScmManager();
    manager.getRepository = vi.fn(() => repo);

    const ctx = new CheckActiveEditor(manager);
    emit("status");
    vi.advanceTimersByTime(120);

    const calls = execSpy.mock.calls.filter(
      c => c[1] === "svnActiveEditorHasChanges"
    );
    assert.ok(calls.length >= 1);
    assert.strictEqual(calls[calls.length - 1]?.[2], true);

    // Added file should be treated as no changes in this context.
    repo.getResourceFromFile = vi.fn(() => new Resource(fileUri, Status.ADDED));
    emit("status");
    vi.advanceTimersByTime(120);
    assert.strictEqual(
      execSpy.mock.calls[execSpy.mock.calls.length - 1]?.[2],
      false
    );
    ctx.dispose();
  });
});
