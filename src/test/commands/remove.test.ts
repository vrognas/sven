import * as assert from "assert";
import * as sinon from "sinon";
import { Uri, window } from "vscode";
import { Remove } from "../../commands/remove";
import { Repository } from "../../svnRepository";
import { Svn } from "../../svn";
import { ConstructorPolicy, ISvnOptions } from "../../common/types";
import { Resource } from "../../resource";
import { Status } from "../../common/types";

suite("Remove Command E2E Tests", () => {
  let removeCmd: Remove;
  let repository: Repository;
  let execStub: sinon.SinonStub;
  let warningStub: sinon.SinonStub;
  const svnOptions: ISvnOptions = {
    svnPath: "svn",
    version: "1.9"
  };

  setup(async () => {
    removeCmd = new Remove();
    const svn = new Svn(svnOptions);
    repository = await new Repository(
      svn,
      "/test/workspace",
      "/test/workspace",
      ConstructorPolicy.LateInit
    );
    execStub = sinon.stub(repository, "exec" as any);
    warningStub = sinon.stub(window, "showWarningMessage" as any);
  });

  teardown(() => {
    removeCmd.dispose();
    sinon.restore();
  });

  test("Remove single file - verify file removed from SVN", async () => {
    warningStub.resolves("Yes");
    execStub.resolves({ exitCode: 0, stdout: "D    oldfile.txt", stderr: "" });

    const fileUri = Uri.file("/test/workspace/oldfile.txt");
    const resource = new Resource(fileUri, Status.ADDED);

    (removeCmd as any).getResourceStatesOrExit = async () => [resource];
    (removeCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(repository, uris.map((u: Uri) => u.fsPath));
    };

    await removeCmd.execute(resource);

    assert.ok(warningStub.calledOnce, "Warning dialog should be shown");
    assert.ok(execStub.calledOnce, "exec should be called once");
    const args = execStub.firstCall.args[0];
    assert.ok(args.includes("remove"), "Command should be 'remove'");
    assert.ok(args.includes("--keep-local"), "Should keep local copy");
    assert.ok(args.includes("oldfile.txt"), "Should remove oldfile.txt");
  });

  test("Remove multiple files - verify batch remove", async () => {
    warningStub.resolves("No");
    execStub.resolves({ exitCode: 0, stdout: "D    file1.txt\nD    file2.txt", stderr: "" });

    const files = [
      Uri.file("/test/workspace/file1.txt"),
      Uri.file("/test/workspace/file2.txt")
    ];
    const resources = files.map(f => new Resource(f, Status.MODIFIED));

    (removeCmd as any).getResourceStatesOrExit = async () => resources;
    (removeCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(repository, uris.map((u: Uri) => u.fsPath));
    };

    await removeCmd.execute(...resources);

    assert.ok(warningStub.calledOnce, "Warning dialog should be shown");
    assert.ok(execStub.calledOnce, "exec should be called once for batch");
    const args = execStub.firstCall.args[0];
    assert.ok(args.includes("remove"), "Command should be 'remove'");
    assert.ok(!args.includes("--keep-local"), "Should not keep local copy (No selected)");
    assert.ok(args.includes("file1.txt"), "Should remove file1.txt");
    assert.ok(args.includes("file2.txt"), "Should remove file2.txt");
  });

  test("Remove error - verify error handling", async () => {
    warningStub.resolves("Yes");
    execStub.rejects(new Error("svn: E155010: File not under version control"));

    const fileUri = Uri.file("/test/workspace/error.txt");
    const resource = new Resource(fileUri, Status.MODIFIED);

    const errorStub = sinon.stub();
    (removeCmd as any).showErrorMessage = errorStub;

    (removeCmd as any).getResourceStatesOrExit = async () => [resource];
    (removeCmd as any).runByRepository = async (uris: any, fn: any) => {
      await fn(repository, uris.map((u: Uri) => u.fsPath));
    };

    await removeCmd.execute(resource);

    assert.ok(warningStub.calledOnce, "Warning dialog should be shown");
    assert.ok(execStub.calledOnce, "exec should be called");
    assert.ok(errorStub.calledOnce, "Error message should be shown");
    assert.ok(errorStub.firstCall.args[0].includes("Unable to remove files"), "Error message should mention remove failure");
  });
});
