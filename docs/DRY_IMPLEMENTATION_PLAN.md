# DRY Refactoring Implementation Plan

**Version**: 1.2.0
**Created**: 2025-12-24
**Status**: Phase 2 Complete

---

## Executive Summary

After thorough code analysis, I've identified 4 DRY opportunities with varying impact. Initial estimates were optimistic - actual duplication is ~300 lines (not 700+).

**Revised scope** (based on actual code review):

| Refactoring        | Lines Saved | Files Affected | Risk   | Priority | Status      |
| ------------------ | ----------- | -------------- | ------ | -------- | ----------- |
| CommitHelper       | 64          | 2              | Medium | P1       | ✅ Complete |
| BaseStatusBar      | 80          | 2              | Low    | P2       | ✅ Complete |
| runForAllResources | ~20         | 2              | Low    | P3       | Pending     |
| FS Modernization   | ~50         | 13→1           | Low    | P4       | Pending     |
| **Total**          | **~214**    | **19**         |        |          |             |

**Phase 1 Actual Results**:

- Created `src/helpers/commitHelper.ts` (77 lines)
- Refactored `commitAll.ts`: -32 lines
- Refactored `commitStaged.ts`: -32 lines
- `commit.ts` skipped: uses `getResourceMap()` for O(1) perf (Phase 21.A optimization)
- 9 unit tests added

**Phase 2 Actual Results**:

- Created `src/statusbar/baseStatusBar.ts` (106 lines)
- Refactored `needsLockStatusBar.ts`: -42 lines
- Refactored `lockStatusBar.ts`: -38 lines
- 7 unit tests added

**Not worth extracting** (after code review):

- Simple command factory: Only `add.ts` is truly simple (22 lines). Others have dialogs, input boxes, or complex logic.
- StagingHelper: Functions only used in stage.ts, not shared.

---

## Phase 1: CommitHelper (P1)

**Goal**: Extract shared commit path building logic from 3 files.

### 1.1 Files Affected

| File              | Lines | Duplicated Logic                                         |
| ----------------- | ----- | -------------------------------------------------------- |
| `commitAll.ts`    | 155   | Lines 67-94: displayPathSet, renameMap, parent traversal |
| `commitStaged.ts` | 133   | Lines 39-66: identical to commitAll                      |
| `commit.ts`       | 101   | Lines 57-80: similar but uses resourceMap                |

### 1.2 Duplicated Pattern

```typescript
// Pattern repeated in all 3 files:
const displayPathSet = new Set(resources.map(s => s.resourceUri.fsPath));
const renameMap = new Map<string, string>();

resources.forEach(state => {
  // Track renamed files
  if (state.type === Status.ADDED && state.renameResourceUri) {
    renameMap.set(state.resourceUri.fsPath, state.renameResourceUri.fsPath);
  }
  // Traverse parent directories
  let dir = path.dirname(state.resourceUri.fsPath);
  let parent = repository.getResourceFromFile(dir);
  while (parent) {
    if (parent.type === Status.ADDED) displayPathSet.add(dir);
    dir = path.dirname(dir);
    parent = repository.getResourceFromFile(dir);
  }
});
```

### 1.3 Proposed Solution

**New file**: `src/helpers/commitHelper.ts`

```typescript
// src/helpers/commitHelper.ts
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
 */
export function buildCommitPaths(
  resources: Resource[],
  repository: Repository
): CommitPaths {
  const displayPathSet = new Set(resources.map(r => r.resourceUri.fsPath));
  const renameMap = new Map<string, string>();

  for (const resource of resources) {
    // Track renamed files
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
```

### 1.4 Implementation Steps

1. **Write tests first** (TDD)
   - Test `buildCommitPaths` with normal files
   - Test `buildCommitPaths` with renamed files
   - Test `buildCommitPaths` with nested ADDED directories

2. **Create helper file**
   - Create `src/helpers/commitHelper.ts`
   - Export `buildCommitPaths` and `expandCommitPaths`

3. **Refactor commitAll.ts**
   - Import helper functions
   - Replace lines 67-94 with helper call
   - Run tests

4. **Refactor commitStaged.ts**
   - Same pattern as commitAll.ts
   - Run tests

5. **Refactor commit.ts**
   - This file uses `resourceMap` - verify helper works
   - Run tests

6. **Run full test suite**

### 1.5 Risk Mitigation

- **commit.ts uses resourceMap**: May need variant that accepts resourceMap
- **Behavior must be identical**: Extract verbatim first, refactor later

---

## Phase 2: BaseStatusBar (P2)

**Goal**: Extract shared repository subscription logic from status bars.

### 2.1 Files Affected

| File                    | Lines | Shared Code                                 |
| ----------------------- | ----- | ------------------------------------------- |
| `needsLockStatusBar.ts` | 122   | Lines 21-55: constructor subscription logic |
| `lockStatusBar.ts`      | 108   | Lines 20-53: nearly identical               |

### 2.2 Duplicated Pattern

```typescript
// Repeated in both files (~35 lines each):
private repoSubscriptions = new Map<unknown, Disposable>();

constructor(private sourceControlManager: SourceControlManager) {
  // Create status bar item
  this.statusBarItem = window.createStatusBarItem(...);

  // Subscribe to existing repositories
  for (const repo of sourceControlManager.repositories) {
    this.subscribeToRepository(repo);
  }

  // Subscribe to new repositories
  this.disposables.push(
    sourceControlManager.onDidOpenRepository(repo => {
      this.subscribeToRepository(repo);
      this.update();
    })
  );

  this.disposables.push(
    sourceControlManager.onDidCloseRepository(repo => {
      const sub = this.repoSubscriptions.get(repo);
      if (sub) {
        sub.dispose();
        this.repoSubscriptions.delete(repo);
      }
      this.update();
    })
  );

  this.update();
}

dispose(): void {
  this.disposables.forEach(d => d.dispose());
  this.repoSubscriptions.forEach(d => d.dispose());
  this.repoSubscriptions.clear();
  this.statusBarItem.dispose();
}
```

### 2.3 Proposed Solution

**New file**: `src/statusbar/baseStatusBar.ts`

```typescript
// src/statusbar/baseStatusBar.ts
import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { Repository } from "../repository";
import { SourceControlManager } from "../source_control_manager";

export interface StatusBarConfig {
  id: string;
  alignment: StatusBarAlignment;
  priority: number;
  command?: string;
}

/**
 * Base class for status bars that track repository state.
 * Handles subscription lifecycle for repository open/close events.
 */
export abstract class BaseStatusBar implements Disposable {
  protected statusBarItem: StatusBarItem;
  protected disposables: Disposable[] = [];
  private repoSubscriptions = new Map<unknown, Disposable>();

  constructor(
    protected sourceControlManager: SourceControlManager,
    config: StatusBarConfig
  ) {
    this.statusBarItem = window.createStatusBarItem(
      config.id,
      config.alignment,
      config.priority
    );
    if (config.command) {
      this.statusBarItem.command = config.command;
    }

    this.setupRepositoryListeners();
    this.update();
  }

  /**
   * Subscribe to repository events. Override to listen to specific events.
   * @returns Disposable for the subscription
   */
  protected abstract subscribeToRepository(repo: Repository): Disposable;

  /**
   * Update status bar display. Called on repository changes.
   */
  protected abstract update(): void;

  private setupRepositoryListeners(): void {
    // Subscribe to existing repositories
    for (const repo of this.sourceControlManager.repositories) {
      this.addRepoSubscription(repo);
    }

    // Subscribe to new repositories
    this.disposables.push(
      this.sourceControlManager.onDidOpenRepository(repo => {
        this.addRepoSubscription(repo);
        this.update();
      })
    );

    // Clean up closed repositories
    this.disposables.push(
      this.sourceControlManager.onDidCloseRepository(repo => {
        const sub = this.repoSubscriptions.get(repo);
        if (sub) {
          sub.dispose();
          this.repoSubscriptions.delete(repo);
        }
        this.update();
      })
    );
  }

  private addRepoSubscription(repo: Repository): void {
    if (this.repoSubscriptions.has(repo)) return;
    const sub = this.subscribeToRepository(repo);
    this.repoSubscriptions.set(repo, sub);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.repoSubscriptions.forEach(d => d.dispose());
    this.repoSubscriptions.clear();
    this.statusBarItem.dispose();
  }
}
```

### 2.4 Implementation Steps

1. **Write tests first**
   - Test that subscriptions are set up on construction
   - Test that new repos get subscriptions
   - Test that closed repos have subscriptions disposed

2. **Create base class**
   - Create `src/statusbar/baseStatusBar.ts`

3. **Refactor NeedsLockStatusBar**
   - Extend BaseStatusBar
   - Implement `subscribeToRepository` and `update`
   - Run tests

4. **Refactor LockStatusBar**
   - Same pattern
   - Run tests

5. **Run full test suite**

### 2.5 Why Not BlameStatusBar?

BlameStatusBar (428 lines) is fundamentally different:

- Has its own caching (blameCache)
- Listens to cursor/selection events (not just repo events)
- Complex formatting logic
- Not worth forcing into same base class

---

## Phase 3: runForAllResources (P3)

**Goal**: Parameterize the group name in stage/unstage "all" commands.

### 3.1 Files Affected

| File         | Method             | Lines   |
| ------------ | ------------------ | ------- |
| `stage.ts`   | `runForAllChanges` | 192-209 |
| `unstage.ts` | `runForAllStaged`  | 104-121 |

### 3.2 Duplicated Pattern

```typescript
// stage.ts - runForAllChanges
private async runForAllChanges(fn: ...): Promise<void> {
  const scm = await commands.executeCommand(...);
  for (const repository of scm.repositories) {
    const changes = repository.changes.resourceStates;  // <-- only diff
    const paths = changes.map(r => r.resourceUri.fsPath);
    if (paths.length > 0) await fn(repository, paths);
  }
}

// unstage.ts - runForAllStaged
private async runForAllStaged(fn: ...): Promise<void> {
  const scm = await commands.executeCommand(...);
  for (const repository of scm.repositories) {
    const staged = repository.staged.resourceStates;  // <-- only diff
    const paths = staged.map(r => r.resourceUri.fsPath);
    if (paths.length > 0) await fn(repository, paths);
  }
}
```

### 3.3 Proposed Solution

Add method to Command base class:

```typescript
// Add to src/commands/command.ts

type ResourceGroupName = 'changes' | 'staged';

/**
 * Run operation for all resources in a group across all repositories.
 */
protected async runForAllInGroup(
  group: ResourceGroupName,
  fn: (repository: Repository, paths: string[]) => Promise<void>
): Promise<void> {
  const sourceControlManager =
    Command._sourceControlManager ||
    ((await commands.executeCommand(
      "sven.getSourceControlManager",
      ""
    )) as SourceControlManager);

  for (const repository of sourceControlManager.repositories) {
    const resourceStates = repository[group].resourceStates;
    const paths = resourceStates.map(r => r.resourceUri.fsPath);
    if (paths.length > 0) {
      await fn(repository, paths);
    }
  }
}
```

### 3.4 Implementation Steps

1. **Write test for new method**
2. **Add method to Command base class**
3. **Refactor StageAll to use `runForAllInGroup('changes', ...)`**
4. **Refactor UnstageAll to use `runForAllInGroup('staged', ...)`**
5. **Delete private methods from both files**
6. **Run full test suite**

---

## Phase 4: FS Modernization (P4)

**Goal**: Replace custom fs wrappers with Node.js fs/promises.

### 4.1 Files to Remove

```
src/fs/access.ts
src/fs/chmod.ts
src/fs/exists.ts
src/fs/lstat.ts
src/fs/mkdir.ts
src/fs/read_file.ts
src/fs/readdir.ts
src/fs/rename.ts
src/fs/rmdir.ts
src/fs/stat.ts
src/fs/unlink.ts
src/fs/write_file.ts
```

### 4.2 Keep/Modify

```
src/fs/index.ts  -- Rewrite to re-export from fs/promises
```

### 4.3 Proposed Solution

```typescript
// src/fs/index.ts (new version)
import * as fsPromises from "fs/promises";

// Re-export all fs/promises functions used in codebase
export const {
  access,
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rmdir,
  stat,
  unlink,
  writeFile
} = fsPromises;

// Custom exists() - not in fs/promises
export async function exists(path: string): Promise<boolean> {
  try {
    await fsPromises.access(path);
    return true;
  } catch {
    return false;
  }
}

// Custom makeWritable() - sets 0o644 permissions
export async function makeWritable(path: string): Promise<void> {
  await fsPromises.chmod(path, 0o644);
}
```

### 4.4 Implementation Steps

1. **Write test for `exists()` function**
2. **Rewrite `src/fs/index.ts`**
3. **Delete 12 wrapper files**
4. **Update any imports if needed** (should be transparent)
5. **Run full test suite**

### 4.5 Risk Assessment

- **Low risk**: fs/promises is stable since Node 14
- **Transparent**: Same function signatures
- **One concern**: `readFile` may need type assertion for encoding

---

## Testing Strategy

### Per-Phase Testing

Each phase follows TDD:

1. **Before implementation**: Write 3 minimal tests
   - Happy path
   - Edge case 1
   - Edge case 2

2. **During implementation**: Run phase tests continuously

3. **After implementation**: Run full suite (`npm test`)

### Test Locations

| Phase | Test File                                                  |
| ----- | ---------------------------------------------------------- |
| 1     | `src/test/unit/helpers/commitHelper.test.ts`               |
| 2     | `src/test/unit/statusbar/baseStatusBar.test.ts`            |
| 3     | `src/test/unit/commands/command.test.ts` (extend existing) |
| 4     | `src/test/unit/fs/index.test.ts`                           |

---

## Commit Strategy

Small, focused commits per CLAUDE.md guidelines:

```
Phase 1:
- feat(helpers): add commitHelper with buildCommitPaths
- refactor(commands): use commitHelper in commitAll
- refactor(commands): use commitHelper in commitStaged
- refactor(commands): use commitHelper in commit

Phase 2:
- feat(statusbar): add BaseStatusBar abstract class
- refactor(statusbar): NeedsLockStatusBar extends BaseStatusBar
- refactor(statusbar): LockStatusBar extends BaseStatusBar

Phase 3:
- feat(commands): add runForAllInGroup to Command base
- refactor(commands): use runForAllInGroup in stage/unstage

Phase 4:
- refactor(fs): replace wrappers with fs/promises
```

---

## Unresolved Questions

1. **commit.ts uses resourceMap** - need to verify helper works with its pattern?
2. **BlameStatusBar** - leave as-is or force into BaseStatusBar pattern?
3. **Break on failure?** - if Phase 1 reveals issues, skip later phases?
4. **fs/promises encoding** - verify readFile type signature matches?

---

## Success Criteria

- [ ] All existing tests pass
- [ ] No new TypeScript errors
- [ ] ~210 lines reduced
- [ ] ~17 files deleted or simplified
- [ ] No user-facing behavior changes

---

## Timeline Recommendation

| Phase     | Effort   | Dependencies |
| --------- | -------- | ------------ |
| 1         | 2-3h     | None         |
| 2         | 1-2h     | None         |
| 3         | 30min    | None         |
| 4         | 1h       | None         |
| **Total** | **5-7h** |              |

Phases are independent - can be done in any order or in parallel.

---

**Document Version**: 1.0.0
**Author**: Claude
**Review Status**: Pending
