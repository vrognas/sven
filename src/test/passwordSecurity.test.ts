import * as assert from "assert";
import * as cp from "child_process";
import { ISvnOptions } from "../common/types";
import { Svn } from "../svn";

suite("Password Security Tests", () => {
  test("SVN 1.9+ uses stdin for password (secure)", async () => {
    const options: ISvnOptions = {
      svnPath: "svn",
      version: "1.9.0"
    };
    const svn = new Svn(options);

    // Mock spawn to verify args don't contain password
    const originalSpawn = cp.spawn;
    let spawnArgs: any[] = [];
    let stdinWrites: string[] = [];

    (cp as any).spawn = function(_command: string, args: string[], _options: any) {
      spawnArgs = args;
      const mockProcess = {
        stdin: {
          write: (data: string) => {
            stdinWrites.push(data);
            return true;
          },
          end: () => {}
        },
        stdout: { on: () => {}, once: () => {} },
        stderr: { on: () => {}, once: () => {} },
        on: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        },
        once: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        }
      };
      return mockProcess as any;
    };

    try {
      await svn.exec("/tmp", ["status"], {
        username: "testuser",
        password: "SecretP@ssw0rd123",
        log: false
      });

      // Verify password NOT in args
      assert.ok(!spawnArgs.includes("SecretP@ssw0rd123"),
        "Password should NOT be in spawn args");
      assert.ok(!spawnArgs.includes("--password"),
        "Old --password flag should NOT be used");

      // Verify stdin flag is used
      assert.ok(spawnArgs.includes("--password-from-stdin"),
        "Should use --password-from-stdin flag");

      // Verify password written to stdin
      assert.ok(stdinWrites.some(write => write.includes("SecretP@ssw0rd123")),
        "Password should be written to stdin");
    } finally {
      (cp as any).spawn = originalSpawn;
    }
  });

  test("SVN 1.8 falls back to CLI arg (documented limitation)", async () => {
    const options: ISvnOptions = {
      svnPath: "svn",
      version: "1.8.19"
    };
    const svn = new Svn(options);

    const originalSpawn = cp.spawn;
    let spawnArgs: any[] = [];

    (cp as any).spawn = function(_command: string, args: string[], _options: any) {
      spawnArgs = args;
      const mockProcess = {
        stdin: { write: () => true, end: () => {} },
        stdout: { on: () => {}, once: () => {} },
        stderr: { on: () => {}, once: () => {} },
        on: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        },
        once: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        }
      };
      return mockProcess as any;
    };

    try {
      await svn.exec("/tmp", ["status"], {
        username: "testuser",
        password: "SecretP@ssw0rd123",
        log: false
      });

      // For older SVN, verify fallback behavior
      assert.ok(spawnArgs.includes("--password"),
        "Old SVN versions should use --password flag");
      assert.ok(spawnArgs.includes("SecretP@ssw0rd123"),
        "Password in args for SVN 1.8 (documented limitation)");
      assert.ok(!spawnArgs.includes("--password-from-stdin"),
        "Should NOT use stdin flag for old SVN");
    } finally {
      (cp as any).spawn = originalSpawn;
    }
  });

  test("SVN 1.10+ uses stdin for password (secure)", async () => {
    const options: ISvnOptions = {
      svnPath: "svn",
      version: "1.10.2"
    };
    const svn = new Svn(options);

    const originalSpawn = cp.spawn;
    let spawnArgs: any[] = [];

    (cp as any).spawn = function(_command: string, args: string[], _options: any) {
      spawnArgs = args;
      const mockProcess = {
        stdin: { write: () => true, end: () => {} },
        stdout: { on: () => {}, once: () => {} },
        stderr: { on: () => {}, once: () => {} },
        on: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        },
        once: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        }
      };
      return mockProcess as any;
    };

    try {
      await svn.exec("/tmp", ["status"], {
        username: "testuser",
        password: "SecretP@ssw0rd123",
        log: false
      });

      assert.ok(!spawnArgs.includes("SecretP@ssw0rd123"),
        "Password should NOT be in spawn args for SVN 1.10+");
      assert.ok(spawnArgs.includes("--password-from-stdin"),
        "Should use --password-from-stdin for SVN 1.10+");
    } finally {
      (cp as any).spawn = originalSpawn;
    }
  });

  test("No password provided - no security risk", async () => {
    const options: ISvnOptions = {
      svnPath: "svn",
      version: "1.9.0"
    };
    const svn = new Svn(options);

    const originalSpawn = cp.spawn;
    let spawnArgs: any[] = [];

    (cp as any).spawn = function(_command: string, args: string[], _options: any) {
      spawnArgs = args;
      const mockProcess = {
        stdin: { write: () => true, end: () => {} },
        stdout: { on: () => {}, once: () => {} },
        stderr: { on: () => {}, once: () => {} },
        on: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        },
        once: (_event: string, callback: Function) => {
          if (_event === "exit") {
            setTimeout(() => callback(0), 10);
          }
        }
      };
      return mockProcess as any;
    };

    try {
      await svn.exec("/tmp", ["status"], {
        log: false
      });

      assert.ok(!spawnArgs.includes("--password"),
        "No --password flag when no password provided");
      assert.ok(!spawnArgs.includes("--password-from-stdin"),
        "No --password-from-stdin when no password provided");
    } finally {
      (cp as any).spawn = originalSpawn;
    }
  });
});
