import * as assert from "assert";
import { vi } from "vitest";
import { commands, Uri, window } from "vscode";
import { OpenChangeBase } from "../../../commands/openCommands";
import { Status } from "../../../common/types";
import { Resource } from "../../../resource";
import * as fs from "../../../fs";

interface InfoCall {
  message: string;
  items: string[];
}

interface MockState {
  executeCommandCalls: Array<{ command: string; args: any[] }>;
  infoCalls: InfoCall[];
  /** Resolves with this value when showInformationMessage is awaited. */
  infoResponse: string | undefined;
  fileSize: number;
}

suite("Open* CSV diff size gate", () => {
  let state: MockState;
  let origExecuteCommand: typeof commands.executeCommand;
  let origShowInfo: typeof window.showInformationMessage;
  let existsSpy: ReturnType<typeof vi.spyOn>;
  let statSpy: ReturnType<typeof vi.spyOn>;
  let cmd: InstanceType<typeof OpenChangeBase>;

  setup(() => {
    state = {
      executeCommandCalls: [],
      infoCalls: [],
      infoResponse: undefined,
      fileSize: 0
    };
    (window as any).activeTextEditor = undefined;

    origExecuteCommand = commands.executeCommand;
    (commands as any).executeCommand = async (
      command: string,
      ...args: any[]
    ) => {
      state.executeCommandCalls.push({ command, args });
      return Promise.resolve();
    };

    origShowInfo = window.showInformationMessage;
    (window as any).showInformationMessage = async (
      message: string,
      ...items: string[]
    ) => {
      state.infoCalls.push({ message, items });
      return state.infoResponse;
    };

    existsSpy = vi.spyOn(fs, "exists").mockResolvedValue(true);
    statSpy = vi.spyOn(fs, "stat").mockImplementation(async () => {
      return {
        isDirectory: () => false,
        size: state.fileSize
      } as any;
    });

    cmd = new OpenChangeBase();
  });

  teardown(() => {
    (commands as any).executeCommand = origExecuteCommand;
    (window as any).showInformationMessage = origShowInfo;
    existsSpy.mockRestore();
    statSpy.mockRestore();
    cmd.dispose();
  });

  test("over-limit csv: opens file immediately and shows non-modal toast (no diff yet)", async () => {
    const fileUri = Uri.file("/test/big.csv");
    const resource = new Resource(fileUri, Status.MODIFIED);
    state.fileSize = 2 * 1024 * 1024; // 2 MB > 1 MB default
    // Don't set infoResponse — user ignores toast

    (cmd as any).getLeftResource = async () =>
      Uri.parse("svn:/test/big.csv?rev=BASE");
    (cmd as any).getRightResource = () => fileUri;
    (cmd as any).getTitle = () => "big.csv";

    await cmd.execute(resource);

    assert.ok(
      state.executeCommandCalls.some(c => c.command === "vscode.open"),
      "file opens immediately (no modal blocking)"
    );
    assert.ok(
      !state.executeCommandCalls.some(c => c.command === "vscode.diff"),
      "diff not executed → no svn cat triggered for BASE side"
    );
    assert.strictEqual(state.infoCalls.length, 1, "info toast shown");
    assert.deepStrictEqual(
      state.infoCalls[0]!.items,
      ["Open Diff Anyway"],
      "single non-modal action button"
    );
  });

  test("over-limit csv: clicking 'Open Diff Anyway' on the toast triggers diff", async () => {
    const fileUri = Uri.file("/test/big.csv");
    const resource = new Resource(fileUri, Status.MODIFIED);
    state.fileSize = 2 * 1024 * 1024;
    state.infoResponse = "Open Diff Anyway"; // user clicks the button

    (cmd as any).getLeftResource = async () =>
      Uri.parse("svn:/test/big.csv?rev=BASE");
    (cmd as any).getRightResource = () => fileUri;
    (cmd as any).getTitle = () => "big.csv";

    await cmd.execute(resource);
    // Let the fire-and-forget toast callback resolve
    await new Promise(r => setImmediate(r));

    const diffCalls = state.executeCommandCalls.filter(
      c => c.command === "vscode.diff"
    );
    assert.strictEqual(
      diffCalls.length,
      1,
      "clicking 'Open Diff Anyway' triggers vscode.diff"
    );
  });

  test("under-limit csv diffs normally without any toast", async () => {
    const fileUri = Uri.file("/test/small.csv");
    const resource = new Resource(fileUri, Status.MODIFIED);
    state.fileSize = 100 * 1024;

    (cmd as any).getLeftResource = async () =>
      Uri.parse("svn:/test/small.csv?rev=BASE");
    (cmd as any).getRightResource = () => fileUri;
    (cmd as any).getTitle = () => "small.csv";

    await cmd.execute(resource);

    assert.strictEqual(state.infoCalls.length, 0, "no toast for small CSV");
    assert.ok(
      state.executeCommandCalls.some(c => c.command === "vscode.diff"),
      "diff executed normally"
    );
  });

  test("ADDED csv with no BASE side opens directly with no toast", async () => {
    const fileUri = Uri.file("/test/new.csv");
    const resource = new Resource(fileUri, Status.ADDED);
    state.fileSize = 2 * 1024 * 1024;

    (cmd as any).getLeftResource = async () => undefined;
    (cmd as any).getRightResource = () => fileUri;

    await cmd.execute(resource);

    assert.strictEqual(
      state.infoCalls.length,
      0,
      "no toast when there's no diff to show"
    );
    assert.ok(
      state.executeCommandCalls.some(c => c.command === "vscode.open"),
      "open executed directly"
    );
    assert.ok(
      !state.executeCommandCalls.some(c => c.command === "vscode.diff"),
      "no diff for ADDED-without-BASE"
    );
  });
});
