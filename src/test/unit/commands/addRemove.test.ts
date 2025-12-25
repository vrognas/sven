import * as assert from "assert";
import { Uri, window } from "vscode";
import { Add } from "../../../commands/add";
import { Untrack } from "../../../commands/untrack";
import { Resource } from "../../../resource";
import { Repository } from "../../../repository";
import { Status, IExecutionResult } from "../../../common/types";

suite("Add Command Tests", () => {
  let addCmd: Add;
  let mockRepository: Partial<Repository>;
  let addFilesCalls: string[][];
  let showErrorCalls: string[];

  setup(() => {
    addCmd = new Add();
    addFilesCalls = [];
    showErrorCalls = [];

    // Mock Repository.addFiles()
    mockRepository = {
      addFiles: async (files: string[]): Promise<IExecutionResult> => {
        addFilesCalls.push(files);
        return { exitCode: 0, stdout: "", stderr: "" };
      }
    };

    // Mock window.showErrorMessage
    (window as any).showErrorMessage = (msg: string) => {
      showErrorCalls.push(msg);
      return Promise.resolve(undefined);
    };
  });

  teardown(() => {
    addCmd.dispose();
  });

  test("add single unversioned file", async () => {
    const fileUri = Uri.file("/workspace/newfile.txt");
    const resource = new Resource(fileUri, Status.UNVERSIONED);

    // Mock getResourceStates to return our resource
    const origGetResourceStates = (addCmd as any).getResourceStates;
    (addCmd as any).getResourceStates = async () => [resource];

    // Mock runByRepository to execute operation immediately
    const origRunByRepository = (addCmd as any).runByRepository;
    (addCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await addCmd.execute(resource);

    assert.strictEqual(addFilesCalls.length, 1);
    assert.deepStrictEqual(addFilesCalls[0]!, ["/workspace/newfile.txt"]);
    assert.strictEqual(showErrorCalls.length, 0);

    (addCmd as any).getResourceStates = origGetResourceStates;
    (addCmd as any).runByRepository = origRunByRepository;
  });

  test("add multiple unversioned files", async () => {
    const file1 = Uri.file("/workspace/file1.txt");
    const file2 = Uri.file("/workspace/file2.txt");
    const file3 = Uri.file("/workspace/file3.txt");

    const resource1 = new Resource(file1, Status.UNVERSIONED);
    const resource2 = new Resource(file2, Status.UNVERSIONED);
    const resource3 = new Resource(file3, Status.UNVERSIONED);

    (addCmd as any).getResourceStates = async () => [
      resource1,
      resource2,
      resource3
    ];
    (addCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await addCmd.execute(resource1, resource2, resource3);

    assert.strictEqual(addFilesCalls.length, 1);
    assert.deepStrictEqual(addFilesCalls[0]!, [
      "/workspace/file1.txt",
      "/workspace/file2.txt",
      "/workspace/file3.txt"
    ]);
  });

  test("add with UNVERSIONED status validation", async () => {
    const fileUri = Uri.file("/workspace/test.txt");
    const resource = new Resource(fileUri, Status.UNVERSIONED);

    assert.strictEqual(resource.type, Status.UNVERSIONED);

    (addCmd as any).getResourceStates = async () => [resource];
    (addCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await addCmd.execute(resource);

    assert.strictEqual(addFilesCalls.length, 1);
  });

  test("add with no resources returns early", async () => {
    (addCmd as any).getResourceStates = async () => [];
    (addCmd as any).runByRepository = async () => {
      throw new Error("Should not be called");
    };

    await addCmd.execute();

    assert.strictEqual(addFilesCalls.length, 0);
  });

  test("add with wrong status (MODIFIED) still attempts", async () => {
    const fileUri = Uri.file("/workspace/modified.txt");
    const resource = new Resource(fileUri, Status.MODIFIED);

    // executeOnResources doesn't validate status - it passes all resources
    (addCmd as any).getResourceStates = async () => [resource];
    (addCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await addCmd.execute(resource);

    assert.strictEqual(addFilesCalls.length, 1);
    assert.deepStrictEqual(addFilesCalls[0]!, ["/workspace/modified.txt"]);
  });

  test("add handles repository error", async () => {
    const fileUri = Uri.file("/workspace/error.txt");
    const resource = new Resource(fileUri, Status.UNVERSIONED);

    mockRepository.addFiles = async () => {
      throw new Error("SVN add failed");
    };

    (addCmd as any).getResourceStates = async () => [resource];
    (addCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await addCmd.execute(resource);

    assert.strictEqual(showErrorCalls.length, 1);
    assert.strictEqual(showErrorCalls[0], "Unable to add file");
    assert.strictEqual(addFilesCalls.length, 0);
  });

  test("add calls Repository.addFiles with correct paths", async () => {
    const files = [
      Uri.file("/repo/src/main.ts"),
      Uri.file("/repo/src/utils.ts")
    ];

    const resources = files.map(f => new Resource(f, Status.UNVERSIONED));

    (addCmd as any).getResourceStates = async () => resources;
    (addCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await addCmd.execute(...resources);

    assert.strictEqual(addFilesCalls.length, 1);
    assert.deepStrictEqual(addFilesCalls[0]!, [
      "/repo/src/main.ts",
      "/repo/src/utils.ts"
    ]);
  });
});

suite("Untrack Command Tests", () => {
  let untrackCmd: Untrack;
  let mockRepository: Partial<Repository>;
  let removeFilesCalls: Array<{ files: string[]; keepLocal: boolean }>;
  let windowWarningCalls: Array<{
    message: string;
    options: any;
    buttons: string[];
  }>;
  let warningResponses: (string | undefined)[];
  let infoResponses: (string | undefined)[];
  let showErrorCalls: string[];

  setup(() => {
    untrackCmd = new Untrack();
    removeFilesCalls = [];
    windowWarningCalls = [];
    warningResponses = [];
    infoResponses = [];
    showErrorCalls = [];

    // Mock Repository.removeFiles()
    mockRepository = {
      removeFiles: async (
        files: string[],
        keepLocal: boolean
      ): Promise<string> => {
        removeFilesCalls.push({ files, keepLocal });
        return "";
      }
    };

    // Mock window.showWarningMessage (for folder confirmation)
    (window as any).showWarningMessage = async (
      message: string,
      options: any,
      ...buttons: string[]
    ) => {
      windowWarningCalls.push({ message, options, buttons });
      return warningResponses.shift();
    };

    // Mock window.showInformationMessage (for ignore prompt)
    (window as any).showInformationMessage = async () => {
      return infoResponses.shift();
    };

    // Mock window.showErrorMessage
    (window as any).showErrorMessage = (msg: string) => {
      showErrorCalls.push(msg);
      return Promise.resolve(undefined);
    };
  });

  teardown(() => {
    untrackCmd.dispose();
  });

  test("untrack single file - always keeps local copy", async () => {
    infoResponses.push(undefined); // Decline ignore prompt

    const fileUri = Uri.file("/workspace/file.txt");
    const resource = new Resource(fileUri, Status.ADDED);

    (untrackCmd as any).getResourceStatesOrExit = async () => [resource];
    (untrackCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await untrackCmd.execute(resource);

    // No warning dialog for files (only folders get confirmation)
    assert.strictEqual(windowWarningCalls.length, 0);
    assert.strictEqual(removeFilesCalls.length, 1);
    assert.deepStrictEqual(removeFilesCalls[0]!.files, ["/workspace/file.txt"]);
    assert.strictEqual(removeFilesCalls[0]!.keepLocal, true);
  });

  test("untrack multiple files - always keeps local copy", async () => {
    infoResponses.push(undefined);

    const files = [
      Uri.file("/workspace/file1.txt"),
      Uri.file("/workspace/file2.txt"),
      Uri.file("/workspace/file3.txt")
    ];

    const resources = files.map(f => new Resource(f, Status.ADDED));

    (untrackCmd as any).getResourceStatesOrExit = async () => resources;
    (untrackCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await untrackCmd.execute(...resources);

    assert.strictEqual(removeFilesCalls.length, 1);
    assert.deepStrictEqual(removeFilesCalls[0]!.files, [
      "/workspace/file1.txt",
      "/workspace/file2.txt",
      "/workspace/file3.txt"
    ]);
    assert.strictEqual(removeFilesCalls[0]!.keepLocal, true);
  });

  test("untrack with no resources returns early", async () => {
    (untrackCmd as any).getResourceStatesOrExit = async () => null;
    (untrackCmd as any).runByRepository = async () => {
      throw new Error("Should not be called");
    };

    await untrackCmd.execute();

    assert.strictEqual(windowWarningCalls.length, 0);
    assert.strictEqual(removeFilesCalls.length, 0);
  });

  test("untrack handles repository error", async () => {
    const fileUri = Uri.file("/workspace/file.txt");
    const resource = new Resource(fileUri, Status.ADDED);

    mockRepository.removeFiles = async () => {
      throw new Error("SVN remove failed");
    };

    (untrackCmd as any).getResourceStatesOrExit = async () => [resource];
    (untrackCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await untrackCmd.execute(resource);

    assert.strictEqual(showErrorCalls.length, 1);
    assert.ok(showErrorCalls[0]!.includes("Unable to untrack"));
  });

  test("untrack preserves file order", async () => {
    infoResponses.push(undefined);

    const files = [
      Uri.file("/workspace/z_file.txt"),
      Uri.file("/workspace/a_file.txt"),
      Uri.file("/workspace/m_file.txt")
    ];

    const resources = files.map(f => new Resource(f, Status.ADDED));

    (untrackCmd as any).getResourceStatesOrExit = async () => resources;
    (untrackCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(
        mockRepository,
        uris.map((u: Uri) => u.fsPath)
      );
    };

    await untrackCmd.execute(...resources);

    // Verify file order is preserved (not sorted)
    assert.deepStrictEqual(removeFilesCalls[0]!.files, [
      "/workspace/z_file.txt",
      "/workspace/a_file.txt",
      "/workspace/m_file.txt"
    ]);
  });
});
