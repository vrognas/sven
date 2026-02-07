import * as assert from "assert";
import {
  commands,
  window,
  workspace,
  Disposable,
  Uri,
  EventEmitter
} from "vscode";

type TreeWindowMock = {
  registerTreeDataProvider: (viewId: string, provider: unknown) => Disposable;
  createTreeView: (
    viewId: string,
    options?: { treeDataProvider?: unknown }
  ) => { dispose: () => void };
};

type WorkspaceMock = {
  registerFileSystemProvider: (
    scheme: string,
    provider: unknown,
    options?: { isCaseSensitive?: boolean; isReadonly?: boolean }
  ) => Disposable;
  onDidOpenTextDocument: (
    listener: (...args: unknown[]) => unknown
  ) => Disposable;
  textDocuments: unknown[];
};

type ConfigMock = {
  get: (setting: string) => unknown;
  update: (setting: string, value: unknown) => Promise<void>;
};

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
    const treeWindow = window as unknown as TreeWindowMock;

    assert.strictEqual(typeof treeWindow.registerTreeDataProvider, "function");
    assert.strictEqual(typeof treeWindow.createTreeView, "function");

    const reg = treeWindow.registerTreeDataProvider("sven.tree", provider);
    const view = treeWindow.createTreeView("sven.tree", {
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
    const workspaceMock = workspace as unknown as WorkspaceMock;
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
      typeof workspaceMock.registerFileSystemProvider,
      "function"
    );
    const disposable = workspaceMock.registerFileSystemProvider(
      "svn",
      provider,
      { isCaseSensitive: true, isReadonly: false }
    );

    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, "function");
    disposable.dispose();
    void Uri.file("/tmp/test");
  });

  test("workspace open-text event API exists", () => {
    const workspaceMock = workspace as unknown as WorkspaceMock;
    assert.strictEqual(typeof workspaceMock.onDidOpenTextDocument, "function");
    const disposable = workspaceMock.onDidOpenTextDocument(() => {});
    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, "function");
    disposable.dispose();
  });

  test("workspace tracks opened text documents", async () => {
    const workspaceMock = workspace as unknown as WorkspaceMock;
    const doc = await workspace.openTextDocument(Uri.file("/tmp/file.txt"));
    const docs = workspaceMock.textDocuments;
    assert.ok(Array.isArray(docs));
    assert.ok(docs.includes(doc));
  });

  test("workspace configuration returns extension defaults", () => {
    const config = workspace.getConfiguration("sven") as unknown as ConfigMock;
    assert.deepStrictEqual(config.get("sourceControl.ignoreOnCommit"), [
      "ignore-on-commit"
    ]);
    assert.strictEqual(config.get("layout.trunkRegex"), "(trunk)(/.*)?");
    assert.strictEqual(config.get("layout.showFullName"), true);
  });

  test("workspace configuration update persists override values", async () => {
    const config = workspace.getConfiguration("sven") as unknown as ConfigMock;
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
