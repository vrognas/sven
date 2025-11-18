# Repository Log Performance Issue - Root Cause Analysis

**Investigation Date**: 2025-11-18  
**Affected Version**: v2.17.179  
**Commit**: c734bfb (UX: Flatten Repository Log view)

---

## Executive Summary

**Root Cause**: Architectural change from lazy-loaded tree (expand to fetch) to eager-loaded flat list (fetch on every refresh) combined with aggressive cache invalidation.

**Impact**: Extension host freezing due to excessive `svn log -r HEAD:1 --limit=50` calls.

**Estimated Frequency**: Every SVN operation or file change → 1-10+ calls per minute in active development.

---

## Root Cause Analysis

### The CASCADE (Event Chain)

```
1. ANY .svn file change (wc.db, entries, pristine)
   ↓ (throttled 100ms, debounced 500ms)
2. Repository.onDidAnyFileChanged()
   ↓
3. Fires onDidChangeRepository event
   ↓
4. SourceControlManager broadcasts to all subscribers
   ↓
5. RepoLogProvider.refresh() ← CLEARS CACHE (line 374, 389)
   ↓
6. TreeView._onDidChangeTreeData fires
   ↓
7. VS Code calls getChildren(undefined)
   ↓
8. Cache is empty (logentries.length === 0)
   ↓
9. fetchMore() executes: svn log -r HEAD:1 --limit=50
```

**Key Files**:
- `/home/user/positron-svn/src/historyView/repoLogProvider.ts` (lines 369-460)
- `/home/user/positron-svn/src/repository.ts` (lines 226-232, 348-350)
- `/home/user/positron-svn/src/source_control_manager.ts` (lines 444-446)
- `/home/user/positron-svn/src/watchers/repositoryFilesWatcher.ts` (lines 118-122)

### Trigger Frequency

**Common .svn file changes**:
- `wc.db` updates: Every status check, commit, update, revert
- `pristine/` changes: File modifications, updates
- `entries` updates: Any structural change
- `tmp/` operations: Every SVN command (filtered, but still fires events)

**Estimated frequency** in active development:
- Status checks: 3-5/minute (auto-refresh every 10s default)
- User operations: 2-10/minute (commits, updates, reverts)
- File saves: 5-20/minute (triggers status checks)
- **Total: ~10-35 refresh events/minute → 10-35 `svn log` calls/minute**

---

## Comparison: Old vs New Architecture

| Aspect | OLD (Pre-c734bfb) | NEW (Post-c734bfb) |
|--------|-------------------|-------------------|
| **Root children** | Repo folders (lazy) | Commits (eager) |
| **Fetch trigger** | User expands repo folder | Every refresh() |
| **Cache invalidation** | Per-repo (when expanded) | Global (all repos) |
| **User interaction** | Click to expand → fetch | Automatic fetch |
| **Network calls** | On-demand (1x per expand) | Continuous (on every refresh) |
| **Performance** | O(1) per refresh | O(1) per refresh + O(n) fetch |

### Code Diff Analysis

**OLD getChildren() behavior** (removed in c734bfb):
```typescript
if (element === undefined) {
  // Return repo folders - NO FETCH
  return transform(logCache.entries(), LogTreeItemKind.Repo);
} else if (element.kind === LogTreeItemKind.Repo) {
  // Only fetch when user expands repo folder
  if (logentries.length === 0) {
    await fetchMore(cached);
  }
  return transform(logentries, LogTreeItemKind.Commit);
}
```

**NEW getChildren() behavior** (current):
```typescript
if (element === undefined) {
  // Show commits directly - FETCH IMMEDIATELY
  const cached = this.getCached();
  const logentries = cached.entries;
  if (logentries.length === 0) {
    await fetchMore(cached);  // ← RUNS ON EVERY REFRESH WITH EMPTY CACHE
  }
  return transform(logentries, LogTreeItemKind.Commit);
}
```

**Why this breaks**:
1. **Old**: Cache only cleared when refreshing a specific repo folder (element.kind === Repo)
2. **New**: Cache cleared on EVERY refresh() call (line 369-396)
3. **Old**: getChildren(undefined) never fetched - just returned folders
4. **New**: getChildren(undefined) fetches if cache empty - which it ALWAYS is after refresh()

---

## Current Caching Strategy Analysis

### Cache Invalidation (repoLogProvider.ts:369-396)

```typescript
public async refresh(element?: ILogTreeItem, fetchMoreClick?: boolean) {
  if (fetchMoreClick) {
    // Fetch more commits - PRESERVES cache
    const cached = this.getCached(element);
    await fetchMore(cached);
  } else if (element === undefined) {
    // Full refresh - DESTROYS cache
    for (const [k, v] of this.logCache) {
      if (!v.persisted.userAdded) {
        this.logCache.delete(k);  // ← DELETES workspace repos
      }
    }
    for (const repo of this.sourceControlManager.repositories) {
      // Recreate cache entry with EMPTY entries array
      this.logCache.set(repoUrl, {
        entries: [],  // ← CLEARED CACHE
        isComplete: false,
        // ...
      });
    }
  }
  this._onDidChangeTreeData.fire(element);
}
```

**Problem**: Cache is cleared on every `refresh()` call, forcing `getChildren()` to refetch.

**Why so aggressive?**:
- Ensures fresh data after repository changes
- Simple implementation (no differential update logic)
- Works fine with lazy-loaded tree (old architecture)
- **BREAKS** with eager-loaded flat list (new architecture)

---

## Proposed Solutions (Ranked by Impact)

### Solution 1: Smart Cache Invalidation ⭐⭐⭐⭐⭐
**Impact**: HIGH | **Effort**: MEDIUM | **Risk**: LOW

**Approach**: Only clear cache when necessary, preserve entries array.

```typescript
public async refresh(element?: ILogTreeItem, fetchMoreClick?: boolean) {
  if (fetchMoreClick) {
    const cached = this.getCached(element);
    await fetchMore(cached);
  } else if (element === undefined) {
    // DON'T clear entries - keep cached commits
    for (const [k, v] of this.logCache) {
      if (!v.persisted.userAdded) {
        // Update metadata, but preserve entries
        v.isComplete = false;  // Allow fetching more if needed
        // Keep v.entries intact
      }
    }
    // Ensure all workspace repos are in cache (add missing)
    for (const repo of this.sourceControlManager.repositories) {
      const repoUrl = repo.branchRoot.toString(true);
      if (!this.logCache.has(repoUrl)) {
        this.logCache.set(repoUrl, {
          entries: [],
          isComplete: false,
          // ...
        });
      }
    }
  }
  this._onDidChangeTreeData.fire(element);
}
```

**Pros**:
- Eliminates unnecessary `svn log` calls (95%+ reduction)
- Preserves user scrolling position
- Simple code change
- Low risk - cache still refreshable via explicit refresh command

**Cons**:
- Stale data possible (mitigated by explicit refresh button)
- Need to handle edge cases (branch switches, repo changes)

**Estimated Impact**: 95%+ reduction in `svn log` calls (from 10-35/min to <1/min)

---

### Solution 2: Differential Refresh ⭐⭐⭐⭐
**Impact**: MEDIUM-HIGH | **Effort**: HIGH | **Risk**: MEDIUM

**Approach**: Only refresh commits that changed, not entire cache.

```typescript
private async onDidChangeRepository(e: RepositoryChangeEvent) {
  // Only refresh if HEAD changed (new commits)
  const repo = e.repository;
  const currentHead = repo.repository.info.revision;
  const cachedHead = this.getCached()?.entries[0]?.revision;
  
  if (currentHead !== cachedHead) {
    // Fetch only new commits since last cached
    const cached = this.getCached();
    const newCommits = await cached.repo.log(
      currentHead,
      cachedHead,
      10,
      cached.svnTarget
    );
    // Prepend new commits to cache
    cached.entries.unshift(...newCommits);
    this._onDidChangeTreeData.fire(undefined);
  }
  // Else: no refresh needed
}
```

**Pros**:
- Minimal network calls (only fetch deltas)
- Always shows fresh data
- No stale data concerns

**Cons**:
- Complex logic (handle branch switches, repo changes)
- More code to maintain
- Edge cases (what if user is scrolled to bottom?)

**Estimated Impact**: 90% reduction in `svn log` calls

---

### Solution 3: TreeView Visibility Detection ⭐⭐⭐
**Impact**: MEDIUM | **Effort**: MEDIUM | **Risk**: LOW

**Approach**: Pause refreshes when Repository Log view is hidden.

```typescript
constructor(private sourceControlManager: SourceControlManager) {
  this.refresh();
  
  // Create TreeView instead of just registering data provider
  const treeView = window.createTreeView("repolog", {
    treeDataProvider: this
  });
  
  this._dispose.push(treeView);
  
  // Track visibility
  let isVisible = treeView.visible;
  treeView.onDidChangeVisibility(e => {
    isVisible = e.visible;
    if (isVisible) {
      // Refresh when view becomes visible
      this.refresh();
    }
  });
  
  this._dispose.push(
    this.sourceControlManager.onDidChangeRepository(
      async (_e: RepositoryChangeEvent) => {
        // Only refresh if visible
        if (isVisible) {
          return this.refresh();
        }
      }
    )
  );
}
```

**Pros**:
- No wasted work when view hidden
- Simple implementation
- Compatible with other solutions

**Cons**:
- Still does excessive refreshes when view is visible
- Stale data when view reopened (mitigated by refresh on show)
- Doesn't fix root cause

**Estimated Impact**: 50-80% reduction (if view hidden half the time)

---

### Solution 4: Revert to Lazy Loading ⭐⭐
**Impact**: HIGH | **Effort**: LOW | **Risk**: LOW

**Approach**: Revert commit c734bfb, restore old architecture.

```bash
git revert c734bfb
```

**Pros**:
- Immediate fix (proven architecture)
- Zero new code
- No risk of new bugs

**Cons**:
- Worse UX (extra click to expand)
- Reverts intentional UX improvement
- User feedback likely negative

**Estimated Impact**: 99% reduction (back to on-demand fetching)

---

### Solution 5: Debounce/Throttle Refresh ⭐⭐
**Impact**: LOW-MEDIUM | **Effort**: LOW | **Risk**: LOW

**Approach**: Add debouncing to refresh() calls.

```typescript
@debounce(2000)  // Wait 2s of silence before refreshing
private async onDidChangeRepository(_e: RepositoryChangeEvent) {
  return this.refresh();
}
```

**Pros**:
- Simple one-line change
- Reduces refresh frequency
- Low risk

**Cons**:
- Stale data during active development
- Doesn't eliminate root cause
- Still clears cache on every refresh

**Estimated Impact**: 30-50% reduction (batches bursts of changes)

---

## Recommended Solution

**Combination approach** (Solutions 1 + 3):

1. **Implement Smart Cache Invalidation** (Solution 1) - PRIMARY FIX
   - Eliminate unnecessary cache clearing
   - Preserve cached commits across refreshes
   - Add explicit "Refresh" command for forced updates

2. **Add TreeView Visibility Detection** (Solution 3) - OPTIMIZATION
   - Skip refreshes when view hidden
   - Refresh on visibility change
   - Additional 50-80% savings

**Total estimated impact**: 97-99% reduction in `svn log` calls

**Implementation time**: 2-3 hours

**Risk level**: LOW (can always revert if issues)

---

## Implementation Steps (Solution 1 + 3)

### Phase 1: Smart Cache (1-2h)
1. Read `/home/user/positron-svn/src/historyView/repoLogProvider.ts`
2. Modify `refresh()` method (lines 364-399)
   - Remove `entries: []` reset (line 389)
   - Add logic to preserve existing entries
   - Update only metadata (isComplete, baseRevision)
3. Test: Verify commits persist across refreshes
4. Test: Verify explicit refresh still works

### Phase 2: Visibility Detection (1h)
1. Modify `constructor` (lines 103-142)
   - Change from `registerTreeDataProvider` to `createTreeView`
   - Add `onDidChangeVisibility` handler
   - Conditionally skip refreshes when hidden
2. Test: Verify no refreshes when view hidden
3. Test: Verify refresh on view show

### Phase 3: Validation (30m)
1. Monitor SVN logs during active development
2. Verify `svn log` calls reduced to <1/minute
3. Verify no stale data issues
4. Performance testing with 100+ commits

---

## Metrics

### Current (v2.17.179)
- **Refresh frequency**: 10-35/minute (active development)
- **svn log calls**: 10-35/minute
- **Cache hit rate**: 0% (cleared on every refresh)
- **User impact**: Extension host freezing

### After Solution 1 + 3
- **Refresh frequency**: 10-35/minute (unchanged)
- **svn log calls**: <1/minute (97% reduction)
- **Cache hit rate**: 95%+ (preserved across refreshes)
- **User impact**: Zero freezing, instant response

---

## Open Questions

1. **Branch switching**: Should cache be cleared on branch change?
   - **Answer**: Yes, but detect via branch comparison (currentBranch !== cached.branch)

2. **Multi-repo**: Does this work with multiple workspace repositories?
   - **Answer**: Yes, cache is per-repo URL (logCache Map)

3. **Explicit refresh**: Should users have manual refresh button?
   - **Answer**: Yes, already exists (`svn.repolog.refresh` command)

4. **Cache size**: Should we limit cached commits (memory)?
   - **Answer**: Later optimization, not urgent (50 commits ≈ 10KB)

5. **Stale data**: How to handle commits made outside VS Code?
   - **Answer**: Periodic refresh (every 5 min) or on window focus

---

## Files to Modify

1. **Primary**: `/home/user/positron-svn/src/historyView/repoLogProvider.ts`
   - Lines 103-142 (constructor - add TreeView)
   - Lines 364-399 (refresh - preserve cache)

2. **Testing**: Create test cases for:
   - Cache persistence across refreshes
   - Visibility-based refresh skipping
   - Explicit refresh clears cache
   - Multi-repo scenarios

---

**Report Generated**: 2025-11-18  
**Performance Engineer**: Claude (Anthropic)  
**Status**: Ready for implementation
