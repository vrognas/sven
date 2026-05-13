import * as assert from "assert";
import * as sinon from "sinon";
import { unstageWithRestoreOptimistic } from "../../../helpers/stageHelper";
import { Repository } from "../../../repository";

/**
 * TDD tests for stageHelper batching behaviour.
 *
 * Pre-refactor: unstageWithRestoreOptimistic invoked
 * `repository.unstageOptimistic` once per restore destination + once for
 * remove — N rounds of UI-notify churn.
 *
 * Post-refactor: ONE call, with a Map<string|null, string[]> of
 * destination → paths.
 */
suite("stageHelper.unstageWithRestoreOptimistic batching", () => {
  let unstageStub: sinon.SinonStub;
  let saveOriginal: Map<string, string>;
  let mockRepository: Partial<Repository>;

  const makeRepo = (originals: Record<string, string>): Partial<Repository> => {
    saveOriginal = new Map(Object.entries(originals));
    unstageStub = sinon.stub().resolves();
    const cleared: string[] = [];
    return {
      staging: {
        getOriginalChangelist: (p: string) => saveOriginal.get(p),
        clearOriginalChangelists: (paths: string[]) => {
          cleared.push(...paths);
        }
      } as any,
      unstageOptimistic: unstageStub as any,
      // Test hook
      // @ts-expect-error test-only field
      _cleared: cleared
    };
  };

  test("Mixed restore + remove → one call with grouped Map", async () => {
    mockRepository = makeRepo({
      "/r/a.txt": "feature",
      "/r/b.txt": "bugfix"
      // /r/c.txt has no original → goes to "remove"
    });

    await unstageWithRestoreOptimistic(mockRepository as Repository, [
      "/r/a.txt",
      "/r/b.txt",
      "/r/c.txt"
    ]);

    // Expect ONE call with a Map argument
    assert.strictEqual(
      unstageStub.callCount,
      1,
      `expected 1 batched unstageOptimistic call, got ${unstageStub.callCount}`
    );

    const arg = unstageStub.firstCall.args[0] as Map<string | null, string[]>;
    assert.ok(arg instanceof Map, "first argument should be a Map");
    assert.deepStrictEqual(arg.get("feature"), ["/r/a.txt"]);
    assert.deepStrictEqual(arg.get("bugfix"), ["/r/b.txt"]);
    assert.deepStrictEqual(arg.get(null), ["/r/c.txt"]);
  });

  test("All same destination still produces one batched call", async () => {
    mockRepository = makeRepo({
      "/r/a.txt": "feature",
      "/r/b.txt": "feature"
    });

    await unstageWithRestoreOptimistic(mockRepository as Repository, [
      "/r/a.txt",
      "/r/b.txt"
    ]);

    assert.strictEqual(unstageStub.callCount, 1);
    const arg = unstageStub.firstCall.args[0] as Map<string | null, string[]>;
    assert.deepStrictEqual(arg.get("feature"), ["/r/a.txt", "/r/b.txt"]);
    assert.strictEqual(arg.has(null), false);
  });

  test("All paths cleared from staging tracking after unstage", async () => {
    mockRepository = makeRepo({
      "/r/a.txt": "feature"
    });

    const paths = ["/r/a.txt", "/r/b.txt"];
    await unstageWithRestoreOptimistic(mockRepository as Repository, paths);

    const cleared = (mockRepository as any)._cleared as string[];
    assert.deepStrictEqual(cleared, paths);
  });
});

/**
 * stageOptimistic / unstageOptimistic must set the grace period before
 * running SVN commands so the file watcher doesn't react to .svn/wc.db
 * changes with a reflex svn info / svn stat / proplist cascade.
 */
suite("Repository.stageOptimistic grace period", () => {
  test("stageOptimistic sets grace period before SVN call", async () => {
    const { Repository } = await import("../../../repository");
    const proto = Repository.prototype;

    // Probe instance with just enough surface for stageOptimistic
    const calls: string[] = [];
    const repo: any = Object.create(proto);
    repo.repository = {
      addFiles: async () => {
        calls.push("addFiles");
      },
      addChangelist: async () => {
        calls.push(
          repo.lastForceRefresh > 0 ? "addChangelist[grace]" : "addChangelist"
        );
      }
    };
    repo.groupManager = {
      changes: { resourceStates: [] },
      staged: { resourceStates: [] },
      conflicts: { resourceStates: [] },
      getResourceFromFile: () => undefined,
      moveToStaged: () => []
    };
    repo.sourceControl = {
      // @ts-ignore - actionButton not in vscode types
      actionButton: undefined,
      inputBox: { value: "" }
    };
    // operations is a getter on the real instance; shadow it via Object.defineProperty
    Object.defineProperty(repo, "operations", {
      value: { isRunning: () => false },
      configurable: true
    });
    repo.lastForceRefresh = 0;

    await proto.stageOptimistic.call(repo, ["/r/foo.txt"]);

    assert.deepStrictEqual(calls, ["addChangelist[grace]"]);
    assert.ok(
      repo.lastForceRefresh > 0,
      "grace period should remain set after stageOptimistic"
    );
  });
});
