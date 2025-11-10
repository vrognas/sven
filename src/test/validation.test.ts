import * as assert from "assert";
import { validateUrl, validateRevision, validateFilePath } from "../validation";

suite("Revision Validation Tests - Command Injection Prevention", () => {
  suite("Valid Revisions", () => {
    test("allows numeric revisions", () => {
      assert.strictEqual(validateRevision("0"), true);
      assert.strictEqual(validateRevision("1"), true);
      assert.strictEqual(validateRevision("123"), true);
      assert.strictEqual(validateRevision("999999"), true);
    });

    test("allows revisions with + prefix", () => {
      assert.strictEqual(validateRevision("+123"), true);
      assert.strictEqual(validateRevision("+1"), true);
    });

    test("allows SVN keywords", () => {
      assert.strictEqual(validateRevision("HEAD"), true);
      assert.strictEqual(validateRevision("PREV"), true);
      assert.strictEqual(validateRevision("BASE"), true);
      assert.strictEqual(validateRevision("COMMITTED"), true);
    });
  });

  suite("Command Injection Prevention", () => {
    test("rejects shell metacharacters", () => {
      assert.strictEqual(validateRevision("123;rm -rf /"), false);
      assert.strictEqual(validateRevision("123|cat /etc/passwd"), false);
      assert.strictEqual(validateRevision("123&whoami"), false);
      assert.strictEqual(validateRevision("123`id`"), false);
      assert.strictEqual(validateRevision("123$(whoami)"), false);
    });

    test("rejects negative revisions", () => {
      assert.strictEqual(validateRevision("-1"), false);
      assert.strictEqual(validateRevision("-123"), false);
    });

    test("rejects invalid keywords", () => {
      assert.strictEqual(validateRevision("INVALID"), false);
      assert.strictEqual(validateRevision("head"), false); // lowercase not allowed
      assert.strictEqual(validateRevision("base123"), false);
    });

    test("rejects empty/whitespace", () => {
      assert.strictEqual(validateRevision(""), false);
      assert.strictEqual(validateRevision(" "), false);
      assert.strictEqual(validateRevision("  123  "), false);
    });
  });
});

suite("File Path Validation Tests - Path Traversal Prevention", () => {
  suite("Valid Paths", () => {
    test("allows simple filenames", () => {
      assert.strictEqual(validateFilePath("file.txt"), true);
      assert.strictEqual(validateFilePath("test.php"), true);
    });

    test("allows relative paths", () => {
      assert.strictEqual(validateFilePath("src/file.txt"), true);
      assert.strictEqual(validateFilePath("dir/subdir/file.js"), true);
    });
  });

  suite("Path Traversal Prevention", () => {
    test("rejects parent directory traversal", () => {
      assert.strictEqual(validateFilePath("../etc/passwd"), false);
      assert.strictEqual(validateFilePath("dir/../../../etc/passwd"), false);
      assert.strictEqual(validateFilePath("..\\windows\\system32"), false);
    });

    test("rejects absolute paths (Unix)", () => {
      assert.strictEqual(validateFilePath("/etc/passwd"), false);
      assert.strictEqual(validateFilePath("/var/log/system.log"), false);
    });

    test("rejects absolute paths (Windows)", () => {
      assert.strictEqual(validateFilePath("C:\\windows\\system32"), false);
      assert.strictEqual(validateFilePath("\\\\share\\file"), false);
    });

    test("rejects hidden traversal attempts", () => {
      assert.strictEqual(validateFilePath("dir/..\\../file"), false);
      assert.strictEqual(validateFilePath("./../../etc/passwd"), false);
    });

    test("rejects empty paths", () => {
      assert.strictEqual(validateFilePath(""), false);
    });
  });
});

suite("URL Validation Tests", () => {
  suite("Valid URLs", () => {
    test("allows http URLs", () => {
      assert.strictEqual(validateUrl("http://example.com/svn/repo"), true);
    });

    test("allows https URLs", () => {
      assert.strictEqual(validateUrl("https://example.com/svn/repo"), true);
    });

    test("allows svn protocol URLs", () => {
      assert.strictEqual(validateUrl("svn://example.com/repo"), true);
    });

    test("allows svn+ssh URLs", () => {
      assert.strictEqual(validateUrl("svn+ssh://user@example.com/repo"), true);
    });
  });

  suite("SSRF Prevention", () => {
    test("rejects localhost", () => {
      assert.strictEqual(validateUrl("http://localhost/repo"), false);
    });

    test("rejects 127.0.0.1", () => {
      assert.strictEqual(validateUrl("http://127.0.0.1/repo"), false);
    });

    test("rejects private IP 10.x.x.x", () => {
      assert.strictEqual(validateUrl("http://10.0.0.1/repo"), false);
    });

    test("rejects private IP 172.16-31.x.x", () => {
      assert.strictEqual(validateUrl("http://172.16.0.1/repo"), false);
      assert.strictEqual(validateUrl("http://172.31.255.254/repo"), false);
    });

    test("rejects private IP 192.168.x.x", () => {
      assert.strictEqual(validateUrl("http://192.168.1.1/repo"), false);
    });

    test("rejects link-local 169.254.x.x", () => {
      assert.strictEqual(validateUrl("http://169.254.169.254/repo"), false);
    });

    test("rejects AWS metadata endpoint", () => {
      assert.strictEqual(validateUrl("http://169.254.169.254/latest/meta-data"), false);
    });

    test("rejects file:// protocol", () => {
      assert.strictEqual(validateUrl("file:///etc/passwd"), false);
    });

    test("rejects invalid protocols", () => {
      assert.strictEqual(validateUrl("ftp://example.com/repo"), false);
      assert.strictEqual(validateUrl("data:text/plain,hello"), false);
    });
  });

  suite("Input Validation", () => {
    test("rejects empty string", () => {
      assert.strictEqual(validateUrl(""), false);
    });

    test("rejects malformed URLs", () => {
      assert.strictEqual(validateUrl("not a url"), false);
    });

    test("rejects URLs without protocol", () => {
      assert.strictEqual(validateUrl("example.com/repo"), false);
    });
  });
});
