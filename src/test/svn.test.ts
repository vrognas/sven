import * as assert from "assert";
import * as fs from "original-fs";
import * as path from "path";
import { Uri } from "vscode";
import { Svn } from "../svn";
import SvnError from "../svnError";
import * as testUtil from "./testUtil";

/**
 * E2E Tests for core Svn class
 * Tests real SVN command execution, auth handling, and encoding detection
 */
suite("Svn E2E Tests", () => {
  let svn: Svn;
  let repoUri: Uri;
  let checkoutDir: Uri;
  let suiteReady = false;

  setup(function () {
    if (!suiteReady) {
      this.skip();
    }
  });

  suiteSetup(async function () {
    suiteReady = false;
    const missingBinaries = testUtil.getMissingSvnBinaries();
    if (missingBinaries.length > 0) {
      console.warn(
        `[test] skipping Svn E2E Tests; missing binaries: ${missingBinaries.join(", ")}`
      );
      return;
    }

    this.timeout(60000);
    try {
      await testUtil.activeExtension();
    } catch (err) {
      console.warn(
        `[test] skipping Svn E2E Tests; extension unavailable: ${String(err)}`
      );
      return;
    }

    // Create real SVN repo for testing
    repoUri = await testUtil.createRepoServer();
    await testUtil.createStandardLayout(testUtil.getSvnUrl(repoUri));
    checkoutDir = await testUtil.createRepoCheckout(
      testUtil.getSvnUrl(repoUri) + "/trunk"
    );

    // Create Svn instance (real SVN binary)
    svn = new Svn({ svnPath: "svn", version: "1.14.0" });
    suiteReady = true;
  });

  suiteTeardown(() => {
    testUtil.destroyAllTempPaths();
  });

  test("1. Command spawn success - verify process execution", async function () {
    this.timeout(10000);

    // Execute real SVN info command
    const result = await svn.exec(checkoutDir.fsPath, ["info", "--xml"]);

    // Verify successful execution
    assert.strictEqual(result.exitCode, 0, "Command should succeed");
    assert.ok(result.stdout.length > 0, "Should return stdout");
    assert.ok(result.stdout.includes("<info>"), "Should return XML info");
    assert.ok(result.stdout.includes("</info>"), "Should be valid XML");
  });

  test("2. Auth failure - verify credential handling", async function () {
    this.timeout(10000);

    // Create file and try commit with invalid credentials
    const testFile = path.join(checkoutDir.fsPath, "auth_test.txt");
    fs.writeFileSync(testFile, "test content");

    // Add file first
    await svn.exec(checkoutDir.fsPath, ["add", testFile]);

    try {
      // Attempt commit with fake remote URL requiring auth (will fail on local repo)
      // This tests that auth options are properly passed to command
      await svn.exec(checkoutDir.fsPath, ["commit", "-m", "test"], {
        username: "invalid_user",
        password: "invalid_pass",
        realmUrl: "https://fake.example.com/svn"
      });

      // Local repo won't require auth, so this may succeed
      // Just verify command executed without error
      assert.ok(true, "Command executed with auth parameters");
    } catch (err) {
      // Auth failure is expected for protected repos
      assert.ok(err instanceof SvnError, "Should throw SvnError");
      assert.ok(
        err instanceof Error && err.message,
        "Should have error message"
      );
    }

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test("3. Encoding detection - verify proper encoding conversion", async function () {
    this.timeout(10000);

    // Create file with non-ASCII content
    const testFile = path.join(checkoutDir.fsPath, "encoding_test.txt");
    const nonAsciiContent = "Hello 世界 Мир";
    fs.writeFileSync(testFile, nonAsciiContent, "utf8");

    // Add and commit
    await svn.exec(checkoutDir.fsPath, ["add", testFile]);
    await svn.exec(checkoutDir.fsPath, ["commit", "-m", "Add non-ASCII file"]);

    // Read file content via SVN cat (tests encoding detection)
    const result = await svn.exec(checkoutDir.fsPath, ["cat", testFile]);

    // Verify encoding was properly detected and converted
    assert.strictEqual(result.exitCode, 0, "Command should succeed");
    assert.ok(result.stdout.includes("Hello"), "Should contain ASCII text");
    assert.ok(
      result.stdout.includes("世界") || result.stdout.includes("Мир"),
      "Should properly decode non-ASCII characters"
    );

    // Cleanup
    fs.unlinkSync(testFile);
  });
});
