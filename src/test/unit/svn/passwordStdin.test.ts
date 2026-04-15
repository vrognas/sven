import * as assert from "assert";
const cp = require("child_process") as typeof import("child_process");
import * as sinon from "sinon";
import { Svn } from "../../../svn";
import { SvnAuthCache } from "../../../services/svnAuthCache";

/**
 * Tests for --password-from-stdin support (SVN 1.10+)
 * Verifies password is sent via stdin instead of process args
 */
suite("SVN --password-from-stdin", () => {
  let svn: Svn;
  let spawnStub: sinon.SinonStub;
  let mockProcess: any;
  let authCacheStub: sinon.SinonStubbedInstance<SvnAuthCache>;
  let stdinWriteStub: sinon.SinonStub;
  let stdinEndStub: sinon.SinonStub;

  setup(() => {
    stdinWriteStub = sinon.stub();
    stdinEndStub = sinon.stub();

    mockProcess = {
      stdout: { on: sinon.stub(), once: sinon.stub() },
      stderr: { on: sinon.stub(), once: sinon.stub() },
      stdin: { write: stdinWriteStub, end: stdinEndStub },
      on: sinon.stub(),
      once: sinon.stub()
    };

    spawnStub = sinon.stub(cp, "spawn").returns(mockProcess as any);
    mockProcess.once.withArgs("exit").callsArgWith(1, 0);
    mockProcess.stdout.once.withArgs("close").callsArgWith(1);
    mockProcess.stderr.once.withArgs("close").callsArgWith(1);
  });

  teardown(() => {
    spawnStub.restore();
  });

  test("SVN >=1.10 non-legacy sends password via stdin", async () => {
    svn = new Svn({ svnPath: "/usr/bin/svn", version: "1.14.0" });
    authCacheStub = sinon.createStubInstance(SvnAuthCache);
    authCacheStub.writeCredential.resolves();
    (svn as any).authCache = authCacheStub;

    await svn.exec("/repo", ["update"], {
      username: "alice",
      password: "secret123"
    });

    const args = spawnStub.firstCall.args[1] as string[];
    assert.ok(
      args.includes("--password-from-stdin"),
      "Should include --password-from-stdin for SVN 1.14"
    );
    assert.ok(
      !args.includes("--password"),
      "Should NOT include --password flag"
    );
    assert.ok(
      stdinWriteStub.calledOnce,
      "Should write password to stdin"
    );
    assert.strictEqual(
      stdinWriteStub.firstCall.args[0],
      "secret123",
      "Stdin should receive the password"
    );
    assert.ok(stdinEndStub.calledOnce, "Should close stdin after write");
  });

  test("SVN <1.10 does NOT send password via stdin or args", async () => {
    svn = new Svn({ svnPath: "/usr/bin/svn", version: "1.9.7" });
    authCacheStub = sinon.createStubInstance(SvnAuthCache);
    authCacheStub.writeCredential.resolves();
    (svn as any).authCache = authCacheStub;

    await svn.exec("/repo", ["update"], {
      username: "alice",
      password: "secret123"
    });

    const args = spawnStub.firstCall.args[1] as string[];
    assert.ok(
      !args.includes("--password-from-stdin"),
      "Should NOT include --password-from-stdin for SVN 1.9"
    );
    assert.ok(
      !args.includes("--password"),
      "Should NOT include --password for non-legacy SVN 1.9"
    );
    assert.ok(
      stdinWriteStub.notCalled,
      "Should NOT write to stdin for SVN <1.10"
    );
  });

  test("legacy auth sends password via --password arg, not stdin", async () => {
    svn = new Svn({ svnPath: "/usr/bin/svn", version: "1.14.0" });
    (svn as any).useLegacyAuth = true;
    authCacheStub = sinon.createStubInstance(SvnAuthCache);
    (svn as any).authCache = authCacheStub;

    await svn.exec("/repo", ["update"], {
      username: "alice",
      password: "secret123"
    });

    const args = spawnStub.firstCall.args[1] as string[];
    assert.ok(
      args.includes("--password"),
      "Legacy auth should include --password"
    );
    assert.ok(
      args.includes("secret123"),
      "Legacy auth should include password value in args"
    );
    assert.ok(
      !args.includes("--password-from-stdin"),
      "Legacy auth should NOT use stdin"
    );
    assert.ok(stdinWriteStub.notCalled, "Legacy should NOT write stdin");
  });
});
