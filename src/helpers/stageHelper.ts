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
 * Prepare for staging: warn about changelists and build original map.
 * Returns null if user cancels, otherwise the original changelist map.
 */
export async function prepareStaging(
  selection: Resource[]
): Promise<Map<string, string> | null> {
  const affected = getAffectedChangelists(selection);
  if (!(await warnAboutChangelists(affected))) return null;
  return buildOriginalChangelistMap(selection);
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
 * Restores files to their original changelist if they had one,
 * otherwise removes them from any changelist.
 *
 * Builds a single grouped Map (destination → paths; `null` = remove)
 * and dispatches one batched call so the SCM UI refreshes once.
 */
export async function unstageWithRestoreOptimistic(
  repository: Repository,
  paths: string[]
): Promise<void> {
  const groups = new Map<string | null, string[]>();
  for (const p of paths) {
    const dest = repository.staging.getOriginalChangelist(p) ?? null;
    const list = groups.get(dest);
    if (list) list.push(p);
    else groups.set(dest, [p]);
  }

  await repository.unstageOptimistic(groups);
  repository.staging.clearOriginalChangelists(paths);
}
