import * as assert from "assert";
import { validateUrl } from "../validation";

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
