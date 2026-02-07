import * as assert from "assert";
import * as sinon from "sinon";
import { configuration } from "../../../helpers/configuration";
import {
  createSanitizedErrorLog,
  sanitizeError,
  sanitizeString
} from "../../../security/errorSanitizer";

suite("Error Sanitizer - Security Tests", () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite("sanitizeString", () => {
    test("strips Windows paths", () => {
      const input = "Error in C:\\Users\\test\\file.txt";
      const output = sanitizeString(input);
      assert.ok(output.includes("[PATH]"));
      assert.ok(!output.includes("C:\\Users"));
    });

    test("strips Unix paths", () => {
      const input = "Failed to access /etc/passwd";
      const output = sanitizeString(input);
      assert.ok(output.includes("[PATH]"));
      assert.ok(!output.includes("/etc/passwd"));
    });

    test("strips URLs with credentials", () => {
      const input =
        "Connection to https://user:pass@svn.example.com/repo failed";
      const output = sanitizeString(input);
      assert.ok(output.includes("[DOMAIN]"));
      assert.ok(!output.includes("user:pass"));
      assert.ok(!output.includes("sven.example.com"));
    });

    test("strips IPv4 addresses", () => {
      const input = "Connection refused from 192.168.1.100";
      const output = sanitizeString(input);
      assert.ok(output.includes("[IP]"));
      assert.ok(!output.includes("192.168.1.100"));
    });

    test("strips IPv6 addresses", () => {
      const input = "Connecting to fe80::1";
      const output = sanitizeString(input);
      assert.ok(output.includes("[IP]"));
      assert.ok(!output.includes("fe80::1"));
    });

    test("redacts password in key=value format", () => {
      const input = "Auth failed with password=secret123";
      const output = sanitizeString(input);
      assert.ok(output.includes("[REDACTED]"));
      assert.ok(!output.includes("secret123"));
    });

    test("redacts API keys", () => {
      const input = "Request with api_key=abc123xyz";
      const output = sanitizeString(input);
      assert.ok(output.includes("[REDACTED]"));
      assert.ok(!output.includes("abc123xyz"));
    });

    test("redacts tokens", () => {
      const input = "Bearer token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const output = sanitizeString(input);
      assert.ok(output.includes("[REDACTED]"));
    });

    test("handles empty string", () => {
      const output = sanitizeString("");
      assert.strictEqual(output, "");
    });

    test("handles null or undefined", () => {
      const output1 = sanitizeString(null as any);
      const output2 = sanitizeString(undefined as any);
      // Should handle gracefully
      assert.ok(output1 === null || output1 === undefined || output1 === "");
      assert.ok(output2 === null || output2 === undefined || output2 === "");
    });

    test("preserves error codes", () => {
      const input = "svn: E170001: Authorization failed";
      const output = sanitizeString(input);
      assert.ok(output.includes("E170001"));
      assert.ok(output.includes("Authorization failed"));
    });

    test("debug disable mode returns raw string and warns once", () => {
      sandbox.stub(configuration, "get").returns(true as any);
      const warnStub = sandbox.stub(console, "warn");

      const first = sanitizeString("password=debug-secret");
      const second = sanitizeString("token=debug-token");

      assert.strictEqual(first, "password=debug-secret");
      assert.strictEqual(second, "token=debug-token");
      assert.strictEqual(warnStub.callCount, 1);
    });

    test("debug mode auto-disables after timeout", () => {
      const clock = sandbox.useFakeTimers({ now: 0 });
      const getStub = sandbox.stub(configuration, "get");
      // Reset module-level debug tracking first
      getStub.onFirstCall().returns(false as any);
      sanitizeString("reset=1");
      getStub.returns(true as any);
      const warnStub = sandbox.stub(console, "warn");

      const initial = sanitizeString("password=secret123");
      assert.strictEqual(initial, "password=secret123");

      clock.tick(5 * 60 * 1000 + 1);
      const afterTimeout = sanitizeString("password=secret123");

      assert.notStrictEqual(afterTimeout, "password=secret123");
      assert.ok(warnStub.callCount >= 2);
    });

    test("redacts credentials in query strings", () => {
      const input = "request failed ?password=abc123&token=xyz987";
      const output = sanitizeString(input);

      assert.ok(output.includes("?password=[REDACTED]"));
      assert.ok(!output.includes("abc123"));
      assert.ok(!output.includes("xyz987"));
    });
  });

  suite("sanitizeError", () => {
    test("sanitizes Error object", () => {
      const error = new Error("Failed to access /home/user/secret.txt");
      const output = sanitizeError(error);
      assert.ok(output.includes("[PATH]"));
      assert.ok(!output.includes("/home/user"));
    });

    test("sanitizes string input", () => {
      const input = "Connection to https://example.com failed";
      const output = sanitizeError(input);
      assert.ok(output.includes("[DOMAIN]"));
    });

    test("handles Error with no message", () => {
      const error = new Error();
      const output = sanitizeError(error);
      // Should not crash
      assert.ok(typeof output === "string");
    });
  });

  suite("createSanitizedErrorLog", () => {
    test("returns empty object for non-object input", () => {
      assert.deepStrictEqual(createSanitizedErrorLog(undefined), {});
      assert.deepStrictEqual(createSanitizedErrorLog("boom" as any), {});
    });

    test("extracts and sanitizes standard and svn-like properties", () => {
      const log = createSanitizedErrorLog({
        message: "Cannot access /home/user/private.txt",
        name: "SvnError",
        code: "E170001",
        exitCode: 1,
        svnErrorCode: "E170001",
        svnCommand: "svn --username test --password=topsecret",
        stdout: "Info from C:\\Users\\name\\repo",
        stderr: "Host 192.168.1.20 not found",
        stderrFormated: "Request to https://example.com failed",
        stack: "at /tmp/private/path.ts:1:1"
      });

      assert.strictEqual(log.name, "SvnError");
      assert.strictEqual(log.code, "E170001");
      assert.strictEqual(log.exitCode, 1);
      assert.strictEqual(log.svnErrorCode, "E170001");
      assert.ok(String(log.message).includes("[PATH]"));
      assert.ok(String(log.svnCommand).includes("[REDACTED]"));
      assert.ok(String(log.stdout).includes("[PATH]"));
      assert.ok(String(log.stderr).includes("[IP]"));
      assert.ok(String(log.stderrFormated).includes("[DOMAIN]"));
      assert.ok(String(log.stack).includes("[PATH]"));
    });
  });
});
