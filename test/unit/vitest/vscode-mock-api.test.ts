import * as assert from "assert";
import {
  commands,
  window,
  workspace,
  Disposable,
  Uri,
  EventEmitter
} from "vscode";

suite("VSCode Mock API Harness", () => {
  test("command registry executes registered callback", async () => {
    let calledWith: unknown[] = [];
    const disposable = commands.registerCommand(
      "sven.testCommand",
      (...args: unknown[]) => {
        calledWith = args;
        return "ok";
      }
    );

    const result = await commands.executeCommand("sven.testCommand", 1, "x");

    assert.strictEqual(result, "ok");
    assert.deepStrictEqual(calledWith, [1, "x"]);
    disposable.dispose();
  });

  test("command registry honors thisArg binding", async () => {
    const context = { value: "bound" };
    const disposable = commands.registerCommand(
      "sven.testCommand.bound",
      function (this: { value: string }) {
        return this.value;
      },
      context
    );

    const result = await commands.executeCommand("sven.testCommand.bound");

    assert.strictEqual(result, "bound");
    disposable.dispose();
  });

  test("tree registration APIs return disposables/views", () => {
    const provider = { getTreeItem: () => ({}), getChildren: () => [] };

    assert.strictEqual(
      typeof (window as any).registerTreeDataProvider,
      "function"
    );
    assert.strictEqual(typeof (window as any).createTreeView, "function");

    const reg = (window as any).registerTreeDataProvider(
      "sven.tree",
      provider
    ) as Disposable;
    const view = (window as any).createTreeView("sven.tree", {
      treeDataProvider: provider
    });

    assert.ok(reg);
    assert.strictEqual(typeof reg.dispose, "function");
    assert.ok(view);
    assert.strictEqual(typeof view.dispose, "function");
    reg.dispose();
    view.dispose();
  });

  test("file system provider registration API returns disposable", () => {
    const provider = {
      stat: async () => ({ type: 1, ctime: 0, mtime: 0, size: 0 }),
      readDirectory: async () => [] as [string, number][],
      readFile: async () => new Uint8Array(),
      writeFile: async () => undefined,
      delete: async () => undefined,
      rename: async () => undefined,
      createDirectory: async () => undefined,
      watch: () => new Disposable(() => {})
    };

    assert.strictEqual(
      typeof (workspace as any).registerFileSystemProvider,
      "function"
    );
    const disposable = (workspace as any).registerFileSystemProvider(
      "svn",
      provider,
      { isCaseSensitive: true, isReadonly: false }
    ) as Disposable;

    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, "function");
    disposable.dispose();
    void Uri.file("/tmp/test");
  });

  test("workspace open-text event API exists", () => {
    assert.strictEqual(
      typeof (workspace as any).onDidOpenTextDocument,
      "function"
    );
    const disposable = (workspace as any).onDidOpenTextDocument(() => {});
    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, "function");
    disposable.dispose();
  });

  test("workspace tracks opened text documents", async () => {
    const doc = await workspace.openTextDocument(Uri.file("/tmp/file.txt"));
    const docs = (workspace as any).textDocuments as unknown[];
    assert.ok(Array.isArray(docs));
    assert.ok(docs.includes(doc));
  });

  test("workspace configuration returns extension defaults", () => {
    const config = workspace.getConfiguration("sven") as any;
    assert.deepStrictEqual(config.get("sourceControl.ignoreOnCommit"), [
      "ignore-on-commit"
    ]);
    assert.strictEqual(config.get("layout.trunkRegex"), "(trunk)(/.*)?");
    assert.strictEqual(config.get("layout.showFullName"), true);
  });

  test("workspace configuration update persists override values", async () => {
    const config = workspace.getConfiguration("sven") as any;
    await config.update("sourceControl.ignoreOnCommit", ["ci-ignore"]);

    assert.deepStrictEqual(config.get("sourceControl.ignoreOnCommit"), [
      "ci-ignore"
    ]);
  });

  test("event emitter fire works when called detached", () => {
    const emitter = new EventEmitter<number>();
    let seen = 0;
    emitter.event(v => {
      seen = v;
    });
    const fire = emitter.fire;
    fire(42);
    assert.strictEqual(seen, 42);
  });

  test("event emitter honors thisArgs binding", () => {
    const emitter = new EventEmitter<number>();
    const ctx = { sum: 0 };
    emitter.event(function (this: { sum: number }, value: number) {
      this.sum += value;
    }, ctx);
    emitter.fire(7);
    assert.strictEqual(ctx.sum, 7);
  });
});
