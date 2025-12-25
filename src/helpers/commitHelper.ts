// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { Status } from "../common/types";
import { Repository } from "../repository";
import { Resource } from "../resource";

export interface CommitPaths {
  /** Paths to display in picker (new names only for renames) */
  displayPaths: string[];
  /** Map: new path → old path (for renamed files) */
  renameMap: Map<string, string>;
}

/**
 * Build commit paths from resources, handling:
 * - Renamed files (tracks old → new mapping)
 * - Parent directories (ADDED dirs need explicit commit)
 *
 * @param resources - Resources to commit
 * @param repository - Repository for parent directory lookup
 * @returns Display paths and rename map
 */
export function buildCommitPaths(
  resources: Resource[],
  repository: Pick<Repository, "getResourceFromFile">
): CommitPaths {
  const displayPathSet = new Set(resources.map(r => r.resourceUri.fsPath));
  const renameMap = new Map<string, string>();

  for (const resource of resources) {
    // Track renamed files (ADDED + renameResourceUri)
    if (resource.type === Status.ADDED && resource.renameResourceUri) {
      renameMap.set(
        resource.resourceUri.fsPath,
        resource.renameResourceUri.fsPath
      );
    }

    // Add parent directories if ADDED
    let dir = path.dirname(resource.resourceUri.fsPath);
    let parent = repository.getResourceFromFile(dir);
    while (parent) {
      if (parent.type === Status.ADDED) {
        displayPathSet.add(dir);
      }
      dir = path.dirname(dir);
      parent = repository.getResourceFromFile(dir);
    }
  }

  return {
    displayPaths: Array.from(displayPathSet),
    renameMap
  };
}

/**
 * Expand selected paths to include old paths for renamed files.
 * Required for SVN commit to work correctly with renames.
 *
 * @param selectedPaths - Paths selected for commit
 * @param renameMap - Map from new path to old path
 * @returns Expanded paths including old rename paths
 */
export function expandCommitPaths(
  selectedPaths: string[],
  renameMap: Map<string, string>
): string[] {
  const commitPaths = [...selectedPaths];
  for (const selectedPath of selectedPaths) {
    const oldPath = renameMap.get(selectedPath);
    if (oldPath) {
      commitPaths.push(oldPath);
    }
  }
  return commitPaths;
}
