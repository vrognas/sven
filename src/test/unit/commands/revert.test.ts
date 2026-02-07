import * as assert from "assert";
import * as path from "path";
import { Uri } from "vscode";
import { vi } from "vitest";
import { Status } from "../../../common/types";
import { Revert } from "../../../commands/revert";
import { Repository } from "../../../repository";
import { Resource } from "../../../resource";
import * as confirmModule from "../../../ui/confirm";

suite("Revert Command Tests", () => {
  let revert: Revert;
  let mockRepository: Partial<Repository>;
  let selection: Resource[] | null;
  let confirmResult: boolean;
  let runBySelectionPathsCalled: boolean;
  let revertCalls: Array<{ paths: string[]; depth: string }> = [];
  let refreshedNeedsLock: boolean;
  let refreshedExplorer: boolean;
  let workspaceRoot: string;

  setup(() => {
    revert = new Revert();
    selection = [];
    confirmResult = true;
    runBySelectionPathsCalled = false;
    revertCalls = [];
    refreshedNeedsLock = false;
    refreshedExplorer = false;
    workspaceRoot = path.join(path.sep, "workspace");

    mockRepository = {
      workspaceRoot,
      revert: async (paths: string[], depth: string) => {
        revertCalls.push({ paths, depth });
      },
      refreshNeedsLockCache: async () => {
        refreshedNeedsLock = true;
      },
      refreshExplorerDecorations: () => {
        refreshedExplorer = true;
      },
      staging: {
        clearOriginalChangelists: () => {}
      } as any
    };

    vi.spyOn(confirmModule, "confirmRevert").mockImplementation(async () => {
      return confirmResult;
    });

    (revert as any).getResourceStatesOrExit = async () => selection;
    (revert as any).runBySelectionPaths = async (_selection: any, op: any) => {
      runBySelectionPathsCalled = true;
      const paths = (_selection as Resource[]).map(r => r.resourceUri.fsPath);
      await op(mockRepository, paths);
    };
    (revert as any).handleRepositoryOperation = async (op: any) => {
      return op();
    };
  });

  teardown(() => {
    vi.restoreAllMocks();
  });

  test("reverts selected paths with infinity depth", async () => {
    const filePath = path.join(workspaceRoot, "file.txt");
    const resource = new Resource(Uri.file(filePath), Status.MODIFIED);
    selection = [resource];

    await revert.execute(resource);

    assert.ok(runBySelectionPathsCalled);
    assert.strictEqual(revertCalls.length, 1);
    assert.strictEqual(revertCalls[0]!.depth, "infinity");
    assert.strictEqual(revertCalls[0]!.paths[0], filePath);
    assert.ok(refreshedNeedsLock);
    assert.ok(refreshedExplorer);
  });

  test("includes original path for renamed file", async () => {
    const renamedFrom = Uri.file(path.join(workspaceRoot, "old-name.txt"));
    const renamedTo = Uri.file(path.join(workspaceRoot, "new-name.txt"));
    const renamed = new Resource(renamedTo, Status.ADDED, renamedFrom);
    selection = [renamed];

    await revert.execute(renamed);

    assert.strictEqual(revertCalls.length, 1);
    assert.deepStrictEqual(revertCalls[0]!.paths, [
      renamedTo.fsPath,
      renamedFrom.fsPath
    ]);
  });

  test("does nothing when user cancels confirm", async () => {
    const resource = new Resource(
      Uri.file(path.join(workspaceRoot, "file.txt")),
      Status.MODIFIED
    );
    selection = [resource];
    confirmResult = false;

    await revert.execute(resource);

    assert.ok(!runBySelectionPathsCalled);
    assert.strictEqual(revertCalls.length, 0);
  });

  test("exits when no resources are selected", async () => {
    selection = null;

    await revert.execute();

    assert.strictEqual((confirmModule.confirmRevert as any).mock.calls.length, 0);
    assert.ok(!runBySelectionPathsCalled);
    assert.strictEqual(revertCalls.length, 0);
  });
});
