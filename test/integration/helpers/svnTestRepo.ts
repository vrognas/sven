/**
 * SVN Test Repository Helper
 * Creates temporary SVN repositories for integration testing.
 * Works on all CI platforms (Linux, macOS, Windows).
 */

import { execSync, ExecSyncOptions } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

export interface TestRepo {
  testDir: string;
  repoDir: string;
  wcDir: string;
  repoUrl: string;
  svn: (args: string) => string;
  svnAdmin: (args: string) => string;
  cleanup: () => Promise<void>;
}

/**
 * Check if SVN CLI is available
 */
export function isSvnAvailable(): boolean {
  try {
    execSync("svn --version", { encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute command with proper options
 */
function exec(cmd: string, cwd?: string): string {
  const options: ExecSyncOptions = {
    encoding: "utf8",
    stdio: "pipe",
    cwd
  };
  return execSync(cmd, options) as string;
}

/**
 * Create a temporary SVN repository and working copy
 */
export async function createTestRepo(prefix = "svn-test"): Promise<TestRepo> {
  const testDir = path.join(tmpdir(), `${prefix}-${Date.now()}`);
  const repoDir = path.join(testDir, "repo");
  const wcDir = path.join(testDir, "wc");

  await fs.mkdir(testDir, { recursive: true });

  // Create SVN repository
  exec(`svnadmin create "${repoDir}"`);

  // Create repo URL (cross-platform)
  const normalizedPath = repoDir.replace(/\\/g, "/");
  const repoUrl =
    process.platform === "win32"
      ? `file:///${normalizedPath}`
      : `file://${normalizedPath}`;

  // Checkout working copy
  exec(`svn checkout "${repoUrl}" "${wcDir}"`);

  const svn = (args: string): string => exec(`svn ${args}`, wcDir);
  const svnAdmin = (args: string): string => exec(`svnadmin ${args}`, repoDir);

  const cleanup = async (): Promise<void> => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors (Windows file locking)
    }
  };

  return { testDir, repoDir, wcDir, repoUrl, svn, svnAdmin, cleanup };
}

/**
 * Create a file in the working copy
 */
export async function createFile(
  wcDir: string,
  relativePath: string,
  content: string
): Promise<string> {
  const filePath = path.join(wcDir, relativePath);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

/**
 * Read a file from the working copy
 */
export async function readFile(
  wcDir: string,
  relativePath: string
): Promise<string> {
  const filePath = path.join(wcDir, relativePath);
  return fs.readFile(filePath, "utf8");
}

/**
 * Modify a file in the working copy
 */
export async function modifyFile(
  wcDir: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(wcDir, relativePath);
  await fs.writeFile(filePath, content, "utf8");
}

/**
 * Delete a file from the working copy
 */
export async function deleteFile(
  wcDir: string,
  relativePath: string
): Promise<void> {
  const filePath = path.join(wcDir, relativePath);
  await fs.unlink(filePath);
}
