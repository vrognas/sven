import * as assert from "assert";
import { window } from "vscode";
import { vi } from "vitest";
import { Resolve } from "../../../commands/resolve";
import { Status } from "../../../common/types";
import { Repository } from "../../../repository";
import { Resource } from "../../../resource";

suite("Resolve Command Tests", () => {
  let mockRepository: Partial<Repository>;
  let showQuickPickSpy: ReturnType<typeof vi.spyOn>;
  let quickPickResult: any;
  let resolveCalls: any[] = [];

  setup(() => {
    mockRepository = {
      resolve: async (paths: string[], action: string) => {
        resolveCalls.push({ paths, action });
        return "Resolved";
      }
    };

    showQuickPickSpy = vi
      .spyOn(window, "showQuickPick")
      .mockImplementation(async () => quickPickResult);

    resolveCalls = [];
    quickPickResult = null;
  });

  teardown(() => {
    vi.restoreAllMocks();
  });

  const createResource = (path: string, status: Status): Resource => {
    return new Resource(
      { fsPath: `/workspace/${path}`, path } as any,
      status,
      undefined,
      Status.NONE
    );
  };

  test("Resolve with 'postpone' action", async () => {
    quickPickResult = { label: "postpone" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    // Mock getResourceStatesOrExit
    (command as any).getResourceStatesOrExit = async () => [resource];

    // Mock executeOnResources
    (command as any).executeOnResources = async (
      _resources: any,
      operation: any
    ) => {
      await operation(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.strictEqual(resolveCalls.length, 1);
    assert.strictEqual(resolveCalls[0].action, "postpone");
  });

  test("Resolve with 'base' action", async () => {
    quickPickResult = { label: "base" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.strictEqual(resolveCalls.length, 1);
    assert.strictEqual(resolveCalls[0].action, "base");
  });

  test("Resolve with 'mine-full' action", async () => {
    quickPickResult = { label: "mine-full" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.strictEqual(resolveCalls[0].action, "mine-full");
  });

  test("Resolve with 'theirs-full' action", async () => {
    quickPickResult = { label: "theirs-full" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.strictEqual(resolveCalls[0].action, "theirs-full");
  });

  test("Resolve with 'working' action", async () => {
    quickPickResult = { label: "working" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.strictEqual(resolveCalls[0].action, "working");
  });

  test("User cancels action selection", async () => {
    quickPickResult = undefined; // User cancelled
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource];

    await command.execute(resource);

    // Should not call resolve when user cancels
    assert.strictEqual(resolveCalls.length, 0);
  });

  test("Multiple conflicted files resolved", async () => {
    quickPickResult = { label: "mine-full" };
    const resource1 = createResource("conflict1.txt", Status.CONFLICTED);
    const resource2 = createResource("conflict2.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource1, resource2];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, [
        "/workspace/conflict1.txt",
        "/workspace/conflict2.txt"
      ]);
    };

    await command.execute(resource1, resource2);

    assert.strictEqual(resolveCalls.length, 1);
    assert.strictEqual(resolveCalls[0].paths.length, 2);
    assert.strictEqual(resolveCalls[0].action, "mine-full");
  });

  test("No resources selected returns early", async () => {
    const command = new Resolve();
    (command as any).getResourceStatesOrExit = async () => null;

    await command.execute();

    // Should not show quick pick or call resolve
    assert.strictEqual(resolveCalls.length, 0);
  });

  test("quick pick receives conflict options", async () => {
    quickPickResult = { label: "postpone" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    (command as any).getResourceStatesOrExit = async () => [resource];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.ok(showQuickPickSpy.mock.calls.length > 0);
    const firstCallItems = showQuickPickSpy.mock.calls[0]?.[0] as any[];
    assert.ok(Array.isArray(firstCallItems));
    assert.ok(firstCallItems.length > 0);
  });

  test("QuickPick shown with correct placeholder", async () => {
    quickPickResult = { label: "base" };
    const resource = createResource("conflict.txt", Status.CONFLICTED);
    const command = new Resolve();

    let quickPickPlaceholder: string | undefined;
    showQuickPickSpy.mockImplementation(async (_items: any, options: any) => {
      quickPickPlaceholder = options?.placeHolder;
      return { label: "base" };
    });

    (command as any).getResourceStatesOrExit = async () => [resource];
    (command as any).executeOnResources = async (_r: any, op: any) => {
      await op(mockRepository, ["/workspace/conflict.txt"]);
    };

    await command.execute(resource);

    assert.strictEqual(quickPickPlaceholder, "Select conflict option");
  });
});
