// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState } from "vscode";
import { Resource } from "../resource";
import { Repository } from "../repository";
import { STAGING_CHANGELIST } from "../services/stagingService";

/**
 * Get paths of staged files from resource states.
 */
export function getStagedPaths(
  resources: SourceControlResourceState[]
): string[] {
  return resources
    .filter(r => r instanceof Resource && r.changelist === STAGING_CHANGELIST)
    .map(r => r.resourceUri.fsPath);
}

/**
 * Unstage reverted files (remove from staging changelist).
 */
export async function unstageRevertedFiles(
  repository: Repository,
  revertedPaths: string[],
  stagedPaths: string[]
): Promise<void> {
  const revertedStaged = revertedPaths.filter(p => stagedPaths.includes(p));
  if (revertedStaged.length > 0) {
    await repository.removeChangelist(revertedStaged);
    repository.staging.clearOriginalChangelists(revertedStaged);
  }
}
