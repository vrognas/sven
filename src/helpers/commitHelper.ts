// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { window } from "vscode";
import { Status } from "../common/types";
import { configuration } from "./configuration";
import { inputCommitMessage } from "../messages";
import { Repository } from "../repository";
import { Resource } from "../resource";
import { CommitFlowService } from "../services/commitFlowService";

/**
 * Check if there are staged files to commit.
 * Shows message if none staged.
 * @returns true if staged files exist, false otherwise
 */
export function requireStaged(staged: Resource[]): boolean {
  if (staged.length === 0) {
    window.showInformationMessage("No staged files to commit");
    return false;
  }
  return true;
}

/**
 * Ensure staged files exist, or offer to stage all changes.
 * Used by commit commands that support auto-staging.
 *
 * @returns true if files are staged (or just got staged), false if cancelled
 */
export async function ensureStagedOrOffer(
  staged: Resource[],
  changes: Resource[],
  repository: Repository,
  resourcesToPaths: (resources: Resource[]) => string[]
): Promise<boolean> {
  if (staged.length > 0) {
    return true;
  }

  if (changes.length === 0) {
    window.showInformationMessage("No changes to commit");
    return false;
  }

  const choice = await window.showInformationMessage(
    `${changes.length} file(s) not staged. Stage all and commit?`,
    "Stage All",
    "Cancel"
  );

  if (choice !== "Stage All") {
    return false;
  }

  const changePaths = resourcesToPaths(changes);
  await repository.stageOptimistic(changePaths);
  return true;
}

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

export interface ExpandedCommitPaths extends CommitPaths {
  commitPaths: string[];
}

/**
 * Build display/rename metadata and expanded commit paths in one step.
 */
export function buildExpandedCommitPaths(
  resources: Resource[],
  repository: Pick<Repository, "getResourceFromFile">
): ExpandedCommitPaths {
  const { displayPaths, renameMap } = buildCommitPaths(resources, repository);

  return {
    displayPaths,
    renameMap,
    commitPaths: expandCommitPaths(displayPaths, renameMap)
  };
}

export interface CommitFlowResult {
  message?: string;
  commitPaths?: string[];
  cancelled: boolean;
}

// Shared commit flow service instance
let commitFlowServiceInstance: CommitFlowService | undefined;

function getCommitFlowService(): CommitFlowService {
  if (!commitFlowServiceInstance) {
    commitFlowServiceInstance = new CommitFlowService();
  }
  return commitFlowServiceInstance;
}

/**
 * Run the shared commit flow: get config, show UI, return message/paths.
 * Used by commitAll and commitStaged commands.
 */
export async function runCommitMessageFlow(
  repository: Repository,
  displayPaths: string[],
  renameMap: Map<string, string>
): Promise<CommitFlowResult> {
  const useQuickPick = configuration.commitUseQuickPick();
  const conventionalCommits = configuration.commitConventionalCommits();
  const autoUpdate = configuration.commitAutoUpdate();
  const updateBeforeCommit = autoUpdate === "both" || autoUpdate === "before";

  let message: string | undefined;
  let selectedPaths: string[] | undefined;

  if (useQuickPick) {
    const result = await getCommitFlowService().runCommitFlow(
      repository,
      displayPaths,
      { conventionalCommits, updateBeforeCommit }
    );

    if (result.cancelled) {
      return { cancelled: true };
    }
    message = result.message;
    selectedPaths = result.selectedFiles;
  } else {
    message = await inputCommitMessage(
      repository.inputBox.value,
      true,
      displayPaths
    );
    selectedPaths = displayPaths;
  }

  if (message === undefined || !selectedPaths) {
    return { cancelled: true };
  }

  const commitPaths = expandCommitPaths(selectedPaths, renameMap);
  return { message, commitPaths, cancelled: false };
}

/**
 * Execute the commit and show result.
 */
export async function executeCommit(
  repository: Repository,
  message: string,
  commitPaths: string[]
): Promise<void> {
  const result = await repository.commitFiles(message, commitPaths);
  window.showInformationMessage(result);
  repository.inputBox.value = "";
  repository.staging.clearOriginalChangelists(commitPaths);
}
