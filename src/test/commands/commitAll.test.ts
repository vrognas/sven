import * as assert from "assert";
import * as sinon from "sinon";
import { SourceControlInputBox, Uri, window } from "vscode";
import { CommitAll } from "../../commands/commitAll";
import { Repository } from "../../repository";
import { Status } from "../../common/types";
import { Resource } from "../../resource";
import * as messages from "../../messages";

suite("CommitAll Command E2E Tests", () => {
  let commitAllCmd: CommitAll;
  let mockRepository: Partial<Repository>;
  let mockInputBox: Partial<SourceControlInputBox>;
  let inputCommitMessageStub: sinon.SinonStub;
  let showInfoStub: sinon.SinonStub;
  let commitFilesCalls: any[] = [];

  setup(() => {
    commitAllCmd = new CommitAll();

    mockInputBox = {
      value: ""
    };

    mockRepository = {
      root: "/test/workspace",
      workspaceRoot: "/test/workspace",
      inputBox: mockInputBox as SourceControlInputBox,
      getResourceFromFile: (_path: string) => undefined,
      commitFiles: async (message: string, paths: string[]) => {
        commitFilesCalls.push({ message, paths });
        return "Revision 42: commit successful";
      }
    };

    inputCommitMessageStub = sinon.stub(messages, "inputCommitMessage");
    showInfoStub = sinon.stub(window, "showInformationMessage");
    commitFilesCalls = [];
  });

  teardown(() => {
    commitAllCmd.dispose();
    sinon.restore();
  });

  test("Commit all success - add files, commit all via command", async () => {
    // Setup: changes with 3 files
    const file1 = new Resource(Uri.file("/test/workspace/file1.txt"), Status.MODIFIED);
    const file2 = new Resource(Uri.file("/test/workspace/file2.txt"), Status.ADDED);
    const file3 = new Resource(Uri.file("/test/workspace/file3.txt"), Status.DELETED);

    (mockRepository as any).changes = {
      resourceStates: [file1, file2, file3]
    };

    inputCommitMessageStub.resolves("Commit all changes");
    mockRepository.commitFiles = async (message: string, paths: string[]) => {
      commitFilesCalls.push({ message, paths });
      return "Revision 42: 3 files committed";
    };

    await commitAllCmd.execute(mockRepository as Repository);

    assert.ok(inputCommitMessageStub.calledOnce, "Should prompt for commit message");
    assert.strictEqual(commitFilesCalls.length, 1, "Should call commitFiles");

    const commitCall = commitFilesCalls[0];
    assert.strictEqual(commitCall.message, "Commit all changes", "Should use provided message");
    assert.strictEqual(commitCall.paths.length, 3, "Should commit 3 files");
    assert.ok(commitCall.paths.includes("/test/workspace/file1.txt"), "Should include file1");
    assert.ok(commitCall.paths.includes("/test/workspace/file2.txt"), "Should include file2");
    assert.ok(commitCall.paths.includes("/test/workspace/file3.txt"), "Should include file3");

    assert.ok(showInfoStub.calledWith("Revision 42: 3 files committed"), "Should show success message");
  });

  test("Commit empty - verify no-op when no changes", async () => {
    // Setup: no changes
    (mockRepository as any).changes = {
      resourceStates: []
    };

    await commitAllCmd.execute(mockRepository as Repository);

    assert.ok(showInfoStub.calledWith("No changes to commit"), "Should show info message");
    assert.ok(inputCommitMessageStub.notCalled, "Should not prompt for message");
    assert.strictEqual(commitFilesCalls.length, 0, "Should not call commitFiles");
  });

  test("Commit error - verify error handling", async () => {
    // Setup: changes exist
    const file = new Resource(Uri.file("/test/workspace/error.txt"), Status.MODIFIED);
    (mockRepository as any).changes = {
      resourceStates: [file]
    };

    inputCommitMessageStub.resolves("Commit message");
    mockRepository.commitFiles = async () => {
      throw new Error("svn: E155015: Commit failed");
    };

    const errorStub = sinon.stub();
    (commitAllCmd as any).showErrorMessage = errorStub;

    await commitAllCmd.execute(mockRepository as Repository);

    assert.ok(inputCommitMessageStub.calledOnce, "Should prompt for message");
    assert.ok(errorStub.calledOnce, "Should show error message");
    assert.ok(errorStub.firstCall.args[0].includes("Unable to commit"), "Error message should mention commit failure");
  });
});
