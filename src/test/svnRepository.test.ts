import * as assert from "assert";
import * as fs from "original-fs";
import { ConstructorPolicy, ICpOptions, ISvnOptions } from "../common/types";
import { Svn } from "../svn";
import { Repository } from "../svnRepository";

suite("Svn Repository Tests", () => {
  let svn: Svn | null;
  const options = {
    svnPath: "svn",
    version: "1.9"
  } as ISvnOptions;

  suiteSetup(async () => {
    // svn = new Svn(options);
  });

  suiteTeardown(() => {
    svn = null;
  });

  test("Test getStatus", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.exec = async (_args: string[], _options?: ICpOptions) => {
      return {
        exitCode: 1,
        stderr: "",
        stdout: `<?xml version="1.0" encoding="UTF-8"?> <status> <target path="."> <entry path="test.php"> <wc-status item="modified" revision="19" props="none"> <commit revision="19"> <author>chris</author> <date>2018-09-06T17:26:59.815389Z</date> </commit> </wc-status> </entry> <entry path="newfiletester.php"> <wc-status item="modified" revision="19" props="none"> <commit revision="19"> <author>chris</author> <date>2018-09-06T17:26:59.815389Z</date> </commit> </wc-status> </entry> <entry path="added.php"> <wc-status item="unversioned" props="none"> </wc-status> </entry> <against revision="19"/> </target> </status>`
      };
    };

    const status = await repository.getStatus({});

    assert.equal(status[0].path, "test.php");
    assert.equal(status[1].path, "newfiletester.php");
    assert.equal(status[2].path, "added.php");
  });

  test("Test rename", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.exec = async (args: string[], _options?: ICpOptions) => {
      assert.equal(args[0].includes("rename"), true);
      assert.equal(args[1].includes("test.php"), true);
      assert.equal(args[2].includes("tester.php"), true);

      return {
        exitCode: 1,
        stderr: "",
        stdout: `
        A         test.php
        D         tester.php
        `
      };
    };

    await repository.rename("test.php", "tester.php");
  });

  test("Test addChangelist validation - invalid name", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    try {
      await repository.addChangelist(["test.php"], "invalid@name");
      assert.fail("Should throw on invalid changelist name");
    } catch (e: unknown) {
      assert.match((e as Error).message, /Invalid changelist name/);
    }
  });

  test("Test addChangelist validation - valid name", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.exec = async (args: string[]) => {
      assert.equal(args[0], "changelist");
      assert.equal(args[1], "valid_name-123");
      return { exitCode: 0, stderr: "", stdout: "" };
    };

    await repository.addChangelist(["test.php"], "valid_name-123");
  });

  test("Test merge validation - invalid accept action", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    try {
      await repository.merge("trunk", false, "invalid_action");
      assert.fail("Should throw on invalid accept action");
    } catch (e: unknown) {
      assert.match((e as Error).message, /Invalid accept action/);
    }
  });

  test("Test merge validation - valid accept action", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.getRepoUrl = async () => "http://repo/svn";
    repository.exec = async (args: string[]) => {
      assert.equal(args[0], "merge");
      assert.equal(args[1], "--accept");
      assert.equal(args[2], "postpone");
      return { exitCode: 0, stderr: "", stdout: "" };
    };

    await repository.merge("trunk", false, "postpone");
  });

  test("Test plainLogByText validation - invalid pattern", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    try {
      await repository.plainLogByText("pattern;rm -rf /");
      assert.fail("Should throw on invalid search pattern");
    } catch (e: unknown) {
      assert.match((e as Error).message, /Invalid search pattern/);
    }
  });

  test("Test plainLogByText validation - valid pattern", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.exec = async (args: string[]) => {
      assert.equal(args[0], "log");
      assert.equal(args[1], "--search");
      assert.equal(args[2], "bugfix");
      return { exitCode: 0, stderr: "", stdout: "" };
    };

    await repository.plainLogByText("bugfix");
  });

  test("Test show validation - invalid revision", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    try {
      await repository.show("/tmp/test.txt", "invalid;revision");
      assert.fail("Should throw on invalid revision");
    } catch (e: unknown) {
      assert.match((e as Error).message, /Invalid revision/);
    }
  });

  test("Test show validation - valid numeric revision", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.exec = async (args: string[]) => {
      assert.ok(args.includes("-r"));
      assert.ok(args.includes("123"));
      return { exitCode: 0, stderr: "", stdout: "file contents" };
    };

    await repository.show("/tmp/test.txt", "123");
  });

  test("Test show validation - valid keyword revision", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );
    repository.exec = async (args: string[]) => {
      assert.ok(args.includes("-r"));
      assert.ok(args.includes("HEAD"));
      return { exitCode: 0, stderr: "", stdout: "file contents" };
    };

    await repository.show("/tmp/test.txt", "HEAD");
  });

  test("Test commitFiles creates temp file with secure permissions (0600)", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    let tempFilePath: string | undefined;
    repository.exec = async (args: string[]) => {
      const fileIndex = args.indexOf("-F");
      if (fileIndex !== -1) {
        tempFilePath = args[fileIndex + 1];
        const stats = fs.statSync(tempFilePath);
        const mode = stats.mode & 0o777;
        assert.strictEqual(mode, 0o600, "Temp file should have 0600 permissions");
      }
      return {
        exitCode: 0,
        stderr: "",
        stdout: "Committed revision 123."
      };
    };

    await repository.commitFiles("Multiline\ncommit message", ["test.php"]);
  });

  test("Test commitFiles prevents symlink attacks", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    let tempFilePath: string | undefined;
    repository.exec = async (args: string[]) => {
      const fileIndex = args.indexOf("-F");
      if (fileIndex !== -1) {
        tempFilePath = args[fileIndex + 1];
        const stats = fs.lstatSync(tempFilePath);
        assert.ok(!stats.isSymbolicLink(), "Temp file should not be a symlink");
      }
      return {
        exitCode: 0,
        stderr: "",
        stdout: "Committed revision 123."
      };
    };

    await repository.commitFiles("Test\nmessage", ["test.php"]);
  });

  test("Test commitFiles with unicode creates secure temp file", async () => {
    svn = new Svn(options);
    const repository = await new Repository(
      svn,
      "/tmp",
      "/tpm",
      ConstructorPolicy.LateInit
    );

    let tempFilePath: string | undefined;
    repository.exec = async (args: string[]) => {
      const fileIndex = args.indexOf("-F");
      if (fileIndex !== -1) {
        tempFilePath = args[fileIndex + 1];
        const stats = fs.statSync(tempFilePath);
        const mode = stats.mode & 0o777;
        assert.strictEqual(mode, 0o600, "Temp file with unicode should have 0600 permissions");

        const content = fs.readFileSync(tempFilePath, "utf-8");
        assert.ok(content.includes("🔒"), "Temp file should contain unicode content");
      }
      return {
        exitCode: 0,
        stderr: "",
        stdout: "Committed revision 123."
      };
    };

    await repository.commitFiles("Secure commit 🔒", ["test.php"]);
  });
});
