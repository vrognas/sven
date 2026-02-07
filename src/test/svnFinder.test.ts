import * as assert from "assert";
import * as sinon from "sinon";
import { SvnFinder, ISvn } from "../svnFinder";

suite("SvnFinder E2E Tests", () => {
  let finder: SvnFinder;
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    finder = new SvnFinder();
  });

  teardown(() => {
    sandbox.restore();
  });

  test("SVN binary found - verify detection works", async function () {
    this.timeout(10000);

    // When: Find SVN without hint (uses system SVN)
    const result: ISvn = await finder.findSvn();

    // Then: Returns valid ISvn with path and version
    assert.ok(result.path, "SVN path should be defined");
    assert.ok(result.version, "SVN version should be defined");
    assert.ok(
      result.version.match(/^\d+\.\d+\.\d+/),
      "Version should match semver format"
    );
  });

  test("SVN not found - verify error handling", async function () {
    this.timeout(5000);

    // Given: Stub platform-specific discovery to always fail
    if (process.platform === "darwin") {
      sandbox.stub(finder, "findSvnDarwin").rejects(new Error("Not found"));
    } else if (process.platform === "win32") {
      sandbox.stub(finder, "findSvnWin32").rejects(new Error("Not found"));
    } else {
      sandbox.stub(finder, "findSpecificSvn").rejects(new Error("Not found"));
    }

    // When/Then: findSvn should reject with expected error
    await assert.rejects(
      () => finder.findSvn(),
      (err: Error) => {
        assert.strictEqual(err.message, "Svn installation not found.");
        return true;
      }
    );
  });

  test("Version check - verify version parsing", async function () {
    // Test 1: Valid version >= 1.6.0
    const validSvn: ISvn = { path: "/usr/bin/svn", version: "1.8.10" };
    const result = await finder.checkSvnVersion(validSvn);
    assert.strictEqual(result.path, validSvn.path);
    assert.strictEqual(result.version, validSvn.version);

    // Test 2: Invalid version < 1.6.0
    const oldSvn: ISvn = { path: "/usr/bin/svn", version: "1.5.0" };
    await assert.rejects(
      () => finder.checkSvnVersion(oldSvn),
      (err: Error) => {
        assert.strictEqual(err.message, "Required svn version must be >= 1.6");
        return true;
      }
    );

    // Test 3: SlickSVN-style version string (compatibility check)
    const slickSvn: ISvn = {
      path: "/usr/bin/svn",
      version: "1.6.17-SlikSvn-tag-1.6.17@1130898-X64"
    };
    const slickResult = await finder.checkSvnVersion(slickSvn);
    assert.strictEqual(slickResult.path, slickSvn.path);
  });
});
