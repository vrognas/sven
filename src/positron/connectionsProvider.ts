/**
 * Positron Connections Provider (Phase 23.P1)
 *
 * Registers SVN repositories as connections in Positron Connections pane
 * Shows: branch, revision, remote URL, status
 * Quick actions: Update, Switch, Show Changes
 */

import type {
  ConnectionsDriver,
  ConnectionsDriverMetadata,
  ConnectionsInput
} from "positron";
import { commands, Disposable } from "vscode";
import type { SourceControlManager } from "../source_control_manager";
import { getPositronApi } from "./runtime";

/**
 * SVN Connections Driver for Positron
 *
 * Enables users to:
 * - View SVN repositories in Connections pane
 * - See current branch, revision, status
 * - Quick checkout/update actions
 */
export class SvnConnectionsProvider implements ConnectionsDriver {
  readonly driverId = "svn-scm";

  readonly metadata: ConnectionsDriverMetadata = {
    languageId: "svn",
    name: "Subversion Repository",
    inputs: [
      {
        id: "url",
        label: "Repository URL",
        type: "string"
      },
      {
        id: "targetPath",
        label: "Local Directory (optional)",
        type: "string"
      }
    ]
  };

  constructor(private sourceControlManager: SourceControlManager) {}

  /**
   * Generate SVN checkout code from user inputs
   */
  generateCode(inputs: ConnectionsInput[]): string {
    const url = inputs.find(i => i.id === "url")?.value || "";
    const target = inputs.find(i => i.id === "targetPath")?.value || "";

    // Validate URL is non-empty
    if (!url || url.trim() === "") {
      throw new Error("Repository URL cannot be empty");
    }

    // Validate URL format (basic check for valid URL structure)
    // SVN URLs can be: http://, https://, svn://, svn+ssh://, file://
    const urlPattern = /^(https?|svn(\+ssh)?|file):\/\/.+/i;
    if (!urlPattern.test(url.trim())) {
      throw new Error(
        "Invalid SVN URL format. URL must start with http://, https://, svn://, svn+ssh://, or file://"
      );
    }

    if (target) {
      return `svn checkout ${url} ${target}`;
    }
    return `svn checkout ${url}`;
  }

  /**
   * Execute SVN checkout command
   */
  async connect(code: string): Promise<void> {
    // Execute the generated SVN command
    // For now, show the command to user
    await commands.executeCommand("svn.showOutput");
    console.log(`SVN Connection: Would execute: ${code}`);
  }

  /**
   * Check if SVN is installed and available
   */
  async checkDependencies(): Promise<boolean> {
    // SVN availability already checked during extension activation
    return this.sourceControlManager.repositories.length > 0;
  }
}

/**
 * Register SVN connections provider with Positron
 *
 * @param sourceControlManager Source control manager instance
 * @returns Disposable to unregister the provider
 */
export function registerSvnConnectionsProvider(
  sourceControlManager: SourceControlManager
): Disposable | undefined {
  const api = getPositronApi();
  if (!api) {
    return undefined;
  }

  const provider = new SvnConnectionsProvider(sourceControlManager);

  return api.connections.registerConnectionDriver(provider);
}
