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

/**
 * Multiple rapid saves trigger several updateModelState passes; each one
 * checks `propertyCacheExpiry` and (pre-fix) fires its own
 * `svn proplist -R -v .` because the expiry isn't pushed forward until the
 * call completes. We need in-flight dedup so concurrent callers share one
 * proplist invocation.
 */
suite("Repository.refreshAllPropertyCaches in-flight dedup", () => {
  test("3 concurrent calls share one getAllProperties invocation", async () => {
    const { Repository } = await import("../../../repository");
    const proto = Repository.prototype;

    let invocations = 0;
    const repo: any = Object.create(proto);
    repo.repository = {
      getAllProperties: async () => {
        invocations++;
        // Simulate a slow proplist
        await new Promise(r => setTimeout(r, 30));
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

    const calls = [
      proto.refreshAllPropertyCaches.call(repo),
      proto.refreshAllPropertyCaches.call(repo),
      proto.refreshAllPropertyCaches.call(repo)
    ];
    await Promise.all(calls);

    assert.strictEqual(
      invocations,
      1,
      `expected 1 getAllProperties call, got ${invocations}`
    );
  });

  test("Sequential calls after settle do invoke a fresh proplist", async () => {
    const { Repository } = await import("../../../repository");
    const proto = Repository.prototype;

    let invocations = 0;
    const repo: any = Object.create(proto);
    repo.repository = {
      getAllProperties: async () => {
        invocations++;
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

    await proto.refreshAllPropertyCaches.call(repo);
    await proto.refreshAllPropertyCaches.call(repo);

    assert.strictEqual(invocations, 2);
  });
});

/**
 * Opening a diff produces two svn-scheme URIs (different rev params) that
 * both resolve to the same fsPath. svnFileSystemProvider's stat cache is
 * keyed by URI, so both produce cache misses and each fires its own
 * `svn list <URL>` remote call. svnRepository.list must dedupe at the URL
 * level since the result is independent of which URI triggered it.
 */
suite("svnRepository.list URL-keyed TTL cache", () => {
  test("Two sequential calls for the same folder share one exec", async () => {
    // Build a minimal SvnRepository-like object — only what list() touches
    const { Repository: SvnRepository } = await import(
      "../../../svnRepository"
    );
    const proto = SvnRepository.prototype;

    let execCount = 0;
    const repo: any = Object.create(proto);
    repo.getRepoUrl = async () => "https://svn.example.com/repo";
    repo.exec = async (_args: string[]) => {
      execCount++;
      return { stdout: "<lists><list><entry/></list></lists>" };
    };
    // Wire fresh cache + in-flight map (instance fields don't init under
    // Object.create(proto) since the constructor doesn't run)
    const { LRUCache } = await import("../../../util/lruCache");
    repo._listCache = new LRUCache(200, 30 * 1000);
    repo._listInFlight = new Map();

    await proto.list.call(repo, "path/to/file.txt");
    await proto.list.call(repo, "path/to/file.txt");

    assert.strictEqual(
      execCount,
      1,
      `expected 1 exec call (cached), got ${execCount}`
    );
  });

  test("Different folders bypass cache", async () => {
    const { Repository: SvnRepository } = await import(
      "../../../svnRepository"
    );
    const proto = SvnRepository.prototype;

    let execCount = 0;
    const repo: any = Object.create(proto);
    repo.getRepoUrl = async () => "https://svn.example.com/repo";
    repo.exec = async (_args: string[]) => {
      execCount++;
      return { stdout: "<lists><list><entry/></list></lists>" };
    };
    const { LRUCache } = await import("../../../util/lruCache");
    repo._listCache = new LRUCache(200, 30 * 1000);
    repo._listInFlight = new Map();

    await proto.list.call(repo, "file1.txt");
    await proto.list.call(repo, "file2.txt");

    assert.strictEqual(execCount, 2);
  });
});

/**
 * Diff-open invokes svn cat from two places sequentially:
 *   1. svnFileSystemProvider.readFile → showBuffer(fsPath) (no revision)
 *      → defaults to BASE for working-copy paths → args: ["cat", target]
 *   2. BlameProvider.computeLineMapping → show(fsPath, "BASE")
 *      → args: ["cat", "-r", "BASE", target]
 *
 * Both return identical BASE content but produce different args, so the
 * in-flight dedup doesn't unify them. Two issues to fix:
 *   - prepareCatArgs must normalize undefined → "BASE" for working-copy paths
 *   - sequential callers need a cache (in-flight only covers concurrent)
 */
suite("svnRepository.cat normalization + cache", () => {
  test("sequential cat with and without -r BASE shares one execBuffer", async () => {
    const { Repository: SvnRepository } = await import(
      "../../../svnRepository"
    );
    const proto = SvnRepository.prototype;

    let execCount = 0;
    const repo: any = Object.create(proto);
    repo.workspaceRoot = "C:/repo";
    repo.removeAbsolutePath = (p: string) =>
      p.startsWith("C:/repo/") ? p.slice("C:/repo/".length) : p;
    repo.buildPegPath = (target: string, _rev?: string) => target;
    repo.getInfo = async () => ({
      url: "https://svn.example.com/repo",
      repository: { uuid: "fake" }
    });
    repo.execBuffer = async (_args: string[]) => {
      execCount++;
      return { exitCode: 0, stdout: Buffer.from("base content"), stderr: "" };
    };
    const { LRUCache } = await import("../../../util/lruCache");
    repo._catInFlight = new Map();
    repo._catCache = new LRUCache(50, 30 * 1000);

    // Call 1: no revision (svnFileSystemProvider.readFile pattern)
    await proto.showBuffer.call(repo, "C:/repo/file.txt");
    // Call 2: explicit "BASE" (BlameProvider.computeLineMapping pattern)
    await proto.showBuffer.call(repo, "C:/repo/file.txt", "BASE");

    assert.strictEqual(
      execCount,
      1,
      `expected 1 execBuffer call after normalize+cache, got ${execCount}`
    );
  });
});
