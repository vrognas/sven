import * as assert from "assert";
import { Disposable, EventEmitter, window } from "vscode";
import { vi } from "vitest";
import { BranchChangesProvider } from "../../../historyView/branchChangesProvider";
import { ISvnPathChange } from "../../../common/types";

type Listener<T> = (e: T) => unknown;

function createMockScmManager(repositories: any[] = []) {
  const repoListeners: Listener<unknown>[] = [];
  return {
    manager: {
      repositories,
      onDidChangeRepository: (cb: Listener<unknown>) => {
        repoListeners.push(cb);
        return new Disposable(() => {
          const idx = repoListeners.indexOf(cb);
          if (idx >= 0) repoListeners.splice(idx, 1);
        });
      }
    } as any,
    emitChange: () => repoListeners.forEach(cb => cb(undefined))
  };
}

function setupFakeTreeView() {
  const visEmitter = new EventEmitter<{ visible: boolean }>();
  const treeView: any = {
    visible: false,
    onDidChangeVisibility: visEmitter.event,
    dispose: vi.fn()
  };
  vi.spyOn(window, "createTreeView").mockImplementation(() => treeView);
  return { treeView, visEmitter };
}

suite("BranchChangesProvider visibility gating", () => {
  let provider: BranchChangesProvider;

  setup(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  teardown(() => {
    if (provider) provider.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("does not fire tree-data refresh when view is hidden", () => {
    const { treeView } = setupFakeTreeView();
    treeView.visible = false;

    const repo = {
      getChanges: vi.fn().mockResolvedValue([] as ISvnPathChange[])
    };
    const { manager, emitChange } = createMockScmManager([repo]);

    provider = new BranchChangesProvider(manager);

    const fireSpy = vi.fn();
    provider.onDidChangeTreeData(fireSpy);

    emitChange();
    vi.advanceTimersByTime(5000);

    assert.strictEqual(fireSpy.mock.calls.length, 0);
  });

  test("fires tree-data refresh (debounced) when view is visible", () => {
    const { treeView } = setupFakeTreeView();
    treeView.visible = true;

    const repo = {
      getChanges: vi.fn().mockResolvedValue([] as ISvnPathChange[])
    };
    const { manager, emitChange } = createMockScmManager([repo]);

    provider = new BranchChangesProvider(manager);
    const fireSpy = vi.fn();
    provider.onDidChangeTreeData(fireSpy);

    emitChange();
    emitChange();
    emitChange();

    // Debounce window — multiple rapid emits should collapse to one fire
    vi.advanceTimersByTime(2000);

    assert.strictEqual(fireSpy.mock.calls.length, 1);
  });

  test("fires single refresh when transitioning hidden→visible", () => {
    const { treeView, visEmitter } = setupFakeTreeView();
    treeView.visible = false;

    const repo = {
      getChanges: vi.fn().mockResolvedValue([] as ISvnPathChange[])
    };
    const { manager, emitChange } = createMockScmManager([repo]);

    provider = new BranchChangesProvider(manager);
    const fireSpy = vi.fn();
    provider.onDidChangeTreeData(fireSpy);

    // Hidden: change events suppressed
    emitChange();
    vi.advanceTimersByTime(2000);
    assert.strictEqual(fireSpy.mock.calls.length, 0);

    // Become visible
    treeView.visible = true;
    visEmitter.fire({ visible: true });

    assert.strictEqual(fireSpy.mock.calls.length, 1);
  });
});
