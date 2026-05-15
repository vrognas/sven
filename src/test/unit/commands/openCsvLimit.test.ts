import * as assert from "assert";
import { vi } from "vitest";
import { commands, Uri, window } from "vscode";
import { OpenChangeBase } from "../../../commands/openCommands";
import { Status } from "../../../common/types";
import { Resource } from "../../../resource";
import * as fs from "../../../fs";

interface WarnArgs {
  message: string;
  options: unknown;
  items: string[];
}

interface MockState {
  executeCommandCalls: Array<{ command: string; args: any[] }>;
  warnCalls: WarnArgs[];
  warnResponse: string | undefined;
  fileSize: number;
}

suite("Open* CSV diff size gate", () => {
  let state: MockState;
  let origExecuteCommand: typeof commands.executeCommand;
  let origShowWarning: typeof window.showWarningMessage;
  let existsSpy: ReturnType<typeof vi.spyOn>;
  let statSpy: ReturnType<typeof vi.spyOn>;
  let cmd: InstanceType<typeof OpenChangeBase>;

  setup(() => {
    state = {
      executeCommandCalls: [],
      warnCalls: [],
      warnResponse: undefined,
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

    origShowWarning = window.showWarningMessage;
    (window as any).showWarningMessage = async (
      message: string,
      options: unknown,
      ...items: string[]
    ) => {
      state.warnCalls.push({ message, options, items });
      return state.warnResponse;
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
    (window as any).showWarningMessage = origShowWarning;
    existsSpy.mockRestore();
    statSpy.mockRestore();
    cmd.dispose();
  });

  test("over-limit csv with 'Open Diff Anyway' shows warning then diffs", async () => {
    const fileUri = Uri.file("/test/big.csv");
    const resource = new Resource(fileUri, Status.MODIFIED);
    state.fileSize = 2 * 1024 * 1024; // 2 MB > 1 MB default
    state.warnResponse = "Open Diff Anyway";

    const leftStub = vi.fn(async () => Uri.parse("svn:/test/big.csv?rev=BASE"));
    (cmd as any).getLeftResource = leftStub;
    (cmd as any).getRightResource = () => fileUri;
    (cmd as any).getTitle = () => "big.csv";

    await cmd.execute(resource);

    assert.strictEqual(state.warnCalls.length, 1, "warning shown");
    assert.deepStrictEqual(
      state.warnCalls[0]!.options,
      { modal: true },
      "must be modal so the user has to decide before the diff loads"
    );
    assert.deepStrictEqual(
      state.warnCalls[0]!.items,
      ["Open Diff Anyway", "Open File"],
      "Open Diff Anyway listed first (default)"
    );
    assert.ok(
      state.executeCommandCalls.some(c => c.command === "vscode.diff"),
      "diff command executed"
    );
  });

  test("over-limit csv with 'Open File' opens file without triggering diff (no svn cat)", async () => {
    const fileUri = Uri.file("/test/big.csv");
    const resource = new Resource(fileUri, Status.MODIFIED);
    state.fileSize = 2 * 1024 * 1024;
    state.warnResponse = "Open File";

    (cmd as any).getLeftResource = async () =>
      Uri.parse("svn:/test/big.csv?rev=BASE");
    (cmd as any).getRightResource = () => fileUri;

    await cmd.execute(resource);

    assert.ok(
      !state.executeCommandCalls.some(c => c.command === "vscode.diff"),
      "diff not executed → svn cat not triggered for BASE side"
    );
    assert.ok(
      state.executeCommandCalls.some(c => c.command === "vscode.open"),
      "open executed"
    );
  });

  test("ADDED csv with no BASE side opens directly without prompting", async () => {
    const fileUri = Uri.file("/test/new.csv");
    const resource = new Resource(fileUri, Status.ADDED);
    state.fileSize = 2 * 1024 * 1024; // over limit

    (cmd as any).getLeftResource = async () => undefined; // no BASE
    (cmd as any).getRightResource = () => fileUri;

    await cmd.execute(resource);

    assert.strictEqual(
      state.warnCalls.length,
      0,
      "no prompt when there's no diff to show"
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

  test("under-limit csv diffs normally without prompt", async () => {
    const fileUri = Uri.file("/test/small.csv");
    const resource = new Resource(fileUri, Status.MODIFIED);
    state.fileSize = 100 * 1024; // 100 KB < 1 MB default

    (cmd as any).getLeftResource = async () =>
      Uri.parse("svn:/test/small.csv?rev=BASE");
    (cmd as any).getRightResource = () => fileUri;
    (cmd as any).getTitle = () => "small.csv";

    await cmd.execute(resource);

    assert.strictEqual(
      state.warnCalls.length,
      0,
      "no warning for under-limit file"
    );
    assert.ok(
      state.executeCommandCalls.some(c => c.command === "vscode.diff"),
      "diff executed normally"
    );
  });
});
