// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { STAGING_CHANGELIST } from "../services/stagingService";

/**
 * Check if any resources are in changelists (other than staging).
 * Returns list of changelist names that will be affected.
 */
export function getAffectedChangelists(resources: Resource[]): string[] {
  const changelists = new Set<string>();
  for (const resource of resources) {
    if (resource.changelist && resource.changelist !== STAGING_CHANGELIST) {
      changelists.add(resource.changelist);
    }
  }
  return Array.from(changelists);
}

/**
 * Build a map of file path → original changelist for resources.
 * Used to restore changelists on unstage.
 */
export function buildOriginalChangelistMap(
  resources: Resource[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const resource of resources) {
    if (resource.changelist && resource.changelist !== STAGING_CHANGELIST) {
      map.set(resource.resourceUri.fsPath, resource.changelist);
    }
  }
  return map;
}

/**
 * Warn user if staging will remove files from existing changelists.
 * Returns true if user wants to proceed, false to cancel.
 */
export async function warnAboutChangelists(
  changelists: string[]
): Promise<boolean> {
  if (changelists.length === 0) return true;

  const listStr = changelists.join(", ");
  const message =
    changelists.length === 1
      ? `This will remove files from changelist "${listStr}". Continue?`
      : `This will remove files from changelists: ${listStr}. Continue?`;

  const choice = await window.showWarningMessage(message, "Stage", "Cancel");
  return choice === "Stage";
}

/**
 * Save original changelists for paths before staging.
 * Allows restoring on unstage.
 */
export function saveOriginalChangelists(
  repository: Repository,
  paths: string[],
  originalChangelists: Map<string, string>
): void {
  for (const path of paths) {
    const original = originalChangelists.get(path);
    if (original) {
      repository.staging.saveOriginalChangelist(path, original);
    }
  }
}

/**
 * Unstage files with optimistic UI update.
 * Restores files to their original changelist if they had one.
 */
export async function unstageWithRestoreOptimistic(
  repository: Repository,
  paths: string[]
): Promise<void> {
  // Group paths by their restore destination
  const toRestore = new Map<string, string[]>(); // changelist → paths
  const toRemove: string[] = []; // paths with no original changelist

  for (const path of paths) {
    const original = repository.staging.getOriginalChangelist(path);
    if (original) {
      const list = toRestore.get(original) || [];
      list.push(path);
      toRestore.set(original, list);
    } else {
      toRemove.push(path);
    }
  }

  // Use optimistic updates for each group
  for (const [changelist, filePaths] of toRestore) {
    await repository.unstageOptimistic(filePaths, changelist);
  }

  if (toRemove.length > 0) {
    await repository.unstageOptimistic(toRemove);
  }

  // Clear tracking for all unstaged files
  repository.staging.clearOriginalChangelists(paths);
}
