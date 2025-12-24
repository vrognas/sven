// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Get the SVN configuration directory path.
 * Checks in order:
 * 1. SVN_CONFIG_DIR environment variable
 * 2. Platform default: %APPDATA%\Subversion (Windows) or ~/.subversion (Unix)
 */
export function getSvnConfigDir(): string {
  // Check environment variable first
  const envConfigDir = process.env.SVN_CONFIG_DIR;
  if (envConfigDir && fs.existsSync(envConfigDir)) {
    return envConfigDir;
  }

  // Platform-specific defaults
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, "Subversion");
    }
  }

  // Unix default: ~/.subversion
  return path.join(os.homedir(), ".subversion");
}

/**
 * Get the SVN client config file path.
 * Returns the path to the 'config' file in the SVN config directory.
 */
export function getSvnConfigPath(): string {
  return path.join(getSvnConfigDir(), "config");
}

/**
 * Check if the SVN config file exists.
 */
export function svnConfigExists(): boolean {
  return fs.existsSync(getSvnConfigPath());
}

/**
 * Parse auto-props section from SVN client config file.
 * Returns the auto-props entries as a string, or null if not found/empty.
 */
export function parseClientAutoProps(configContent: string): string | null {
  const lines = configContent.split(/\r?\n/);
  const autoPropsLines: string[] = [];
  let inAutoPropsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers
    if (trimmed.startsWith("[")) {
      if (trimmed.toLowerCase() === "[auto-props]") {
        inAutoPropsSection = true;
        continue;
      } else if (inAutoPropsSection) {
        // Hit a new section, stop
        break;
      }
    }

    if (inAutoPropsSection) {
      // Skip empty lines but include comments and rules
      if (trimmed === "") continue;
      // Include all non-empty lines (comments and rules)
      autoPropsLines.push(line);
    }
  }

  if (autoPropsLines.length === 0) {
    return null;
  }

  return autoPropsLines.join("\n");
}

/**
 * Read and parse auto-props from the SVN client config file.
 * Returns null if file doesn't exist or has no auto-props.
 */
export async function readClientAutoProps(): Promise<string | null> {
  const configPath = getSvnConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = await fs.promises.readFile(configPath, "utf-8");
    return parseClientAutoProps(content);
  } catch {
    return null;
  }
}
