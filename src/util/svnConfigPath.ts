// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Get candidate SVN config directories in priority order.
 * Returns all possible locations to check.
 */
function getConfigDirCandidates(): string[] {
  const candidates: string[] = [];

  // 1. SVN_CONFIG_DIR environment variable (highest priority)
  const envConfigDir = process.env.SVN_CONFIG_DIR;
  if (envConfigDir) {
    candidates.push(envConfigDir);
  }

  // 2. Platform-specific locations
  if (process.platform === "win32") {
    // Windows: %APPDATA%\Subversion (TortoiseSVN, official Windows builds)
    const appData = process.env.APPDATA;
    if (appData) {
      candidates.push(path.join(appData, "Subversion"));
    }

    // Windows fallback: ~/.subversion (Cygwin, MSYS2, some ports)
    candidates.push(path.join(os.homedir(), ".subversion"));
  } else {
    // Unix/macOS: ~/.subversion
    candidates.push(path.join(os.homedir(), ".subversion"));
  }

  return candidates;
}

/**
 * Get the SVN configuration directory path.
 * Checks in priority order:
 * 1. SVN_CONFIG_DIR environment variable
 * 2. %APPDATA%\Subversion (Windows only)
 * 3. ~/.subversion (all platforms)
 *
 * Returns first existing directory, or platform default if none exist.
 */
export function getSvnConfigDir(): string {
  const candidates = getConfigDirCandidates();

  // Return first existing directory
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // None exist - return platform default (will be created by SVN on first use)
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, "Subversion");
    }
  }
  return path.join(os.homedir(), ".subversion");
}

/**
 * Get all existing SVN config directories.
 * Useful for debugging or showing user all config locations.
 */
export function getAllExistingConfigDirs(): string[] {
  return getConfigDirCandidates().filter(dir => fs.existsSync(dir));
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
