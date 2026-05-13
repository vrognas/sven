import * as assert from "assert";

/**
 * stageOptimistic / unstageOptimistic must set the grace period before
 * running SVN commands so the file watcher doesn't react to .svn/wc.db
 * changes with a reflex svn info / svn stat / proplist cascade.
 */
suite("Repository.stageOptimistic grace period", () => {
  test("stageOptimistic sets grace period before SVN call", async () => {
    const { Repository } = await import("../../../repository");
    const proto = Repository.prototype;

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
      actionButton: undefined,
      inputBox: { value: "" }
    };
    // `operations` is a getter on the real instance — shadow via defineProperty
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

/**
 * Multiple rapid saves trigger several updateModelState passes; each one
 * checks `propertyCacheExpiry` and (pre-fix) fired its own
 * `svn proplist -R -v .` because the expiry isn't pushed forward until the
 * call completes. In-flight dedup makes concurrent callers share one
 * proplist invocation.
 */
suite("Repository.refreshAllPropertyCaches in-flight dedup", () => {
  const makeRepo = (delayMs = 0) => {
    let invocations = 0;
    const repo: any = Object.create(null);
    repo.repository = {
      getAllProperties: async () => {
        invocations++;
        if (delayMs) await new Promise(r => setTimeout(r, delayMs));
        return {
          needsLock: new Set<string>(),
          eolStyle: new Map<string, string>(),
          mimeType: new Map<string, string>()
        };
      }
    };
    repo.needsLockFilesSet = new Set();
    repo.needsLockCacheExpiry = 0;
    repo.propertyCacheExpiry = 0;
    repo._onDidChangeNeedsLock = { fire: () => {} };
    return { repo, getCount: () => invocations };
  };

  test("3 concurrent calls share one getAllProperties invocation", async () => {
    const { Repository } = await import("../../../repository");
    const { repo, getCount } = makeRepo(30);
    Object.setPrototypeOf(repo, Repository.prototype);

    await Promise.all([
      Repository.prototype.refreshAllPropertyCaches.call(repo),
      Repository.prototype.refreshAllPropertyCaches.call(repo),
      Repository.prototype.refreshAllPropertyCaches.call(repo)
    ]);

    assert.strictEqual(getCount(), 1);
  });

  test("Sequential calls after settle do invoke a fresh proplist", async () => {
    const { Repository } = await import("../../../repository");
    const { repo, getCount } = makeRepo();
    Object.setPrototypeOf(repo, Repository.prototype);

    await Repository.prototype.refreshAllPropertyCaches.call(repo);
    await Repository.prototype.refreshAllPropertyCaches.call(repo);

    assert.strictEqual(getCount(), 2);
  });
});
