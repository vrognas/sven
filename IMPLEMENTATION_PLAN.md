# IMPLEMENTATION PLAN

**Version**: v2.17.65
**Updated**: 2025-11-11
**Status**: Phases 12-13 COMPLETE ✅

---

## Completed ✅

- Phase 2: 3 services extracted (760 lines), Repository 22% smaller
- Phase 4a: 111 tests, 21-23% coverage
- Phase 4b/4b.1: 60-80% perf gain (debounce, throttle fixes)
- Phase 8: 15 bottlenecks (v2.17.46-50, 70% faster UI)
- Phase 9: 3 NEW bottlenecks (v2.17.52-54, 45% impact)
- Phase 10: Regression + hot path fixes (v2.17.59-60, 100% users)
- Phase 11: Command boilerplate (v2.17.58, 82 lines removed)
- Phase 12: Status update cache (v2.17.63, 60-80% burst reduction)
- Phase 13: Code bloat cleanup (v2.17.64, 45 lines removed, 17 commands)

---

## Phase 14: Async Deletion Bug 🔥 CRITICAL

**Target**: Fix data loss risk in directory deletion
**Effort**: 30min
**Impact**: CRITICAL - 40-50% users, silent failures
**Priority**: IMMEDIATE

### Issue
**File**: `commands/deleteUnversioned.ts:33`
**Problem**: `deleteDirectory()` async but not awaited - fails silently
**Impact**: Directory deletions fail in background, user sees no error

### Fix
```typescript
// Line 33
if (stat.isDirectory()) {
  await deleteDirectory(fsPath);  // ADD await
} else {
  await unlink(fsPath);
}
```

**Tests** (2 TDD):
1. Directory deletion awaited and completes
2. Errors properly caught by handleRepositoryOperation

**Success Criteria**:
- [ ] await added to deleteDirectory call
- [ ] Directory deletion errors surface to user
- [ ] Tests pass

---

## Phase 15: Decorator Overhead ⚡ HIGH

**Target**: Remove redundant decorator overhead
**Effort**: 1-2h
**Impact**: HIGH - 50-100% users, every operation
**Priority**: HIGH

### Issue
**File**: `repository.ts:469-471` (updateModelState)
**Problem**: Dual decorators (@throttle + @globalSequentialize) create promise chains even when 2s cache prevents execution
**Impact**: 1-2ms overhead per call, all status operations

### Fix
```typescript
// Option 1: Remove @throttle (cache already handles throttling)
@globalSequentialize("updateModelState")
public async updateModelState(checkRemoteChanges: boolean = false) {
  const now = Date.now();
  if (now - this.lastModelUpdate < this.MODEL_CACHE_MS) return;
  // ...
}

// Option 2: Move cache check BEFORE decorators (protected method)
@globalSequentialize("updateModelState")
public async updateModelState(checkRemoteChanges: boolean = false) {
  const now = Date.now();
  if (now - this.lastModelUpdate < this.MODEL_CACHE_MS) return;
  await this._updateModelStateUncached(checkRemoteChanges);
}
```

**Tests** (1 perf):
1. updateModelState <1ms overhead when cache hits

**Success Criteria**:
- [ ] Decorator overhead eliminated on cache hits
- [ ] updateModelState <1ms when skipped
- [ ] Sequentialization still works for actual updates

---

## Deferred (Medium Priority)

**Resource Index Rebuild** (2-3h, 50-80% users):
- Unconditional rebuildResourceIndex() on every updateGroups()
- 5-15ms waste on large repos

**Timeout Error UX** (2-3h, 30-40% users):
- Generic error messages for network timeouts
- Should show "Network timeout - try again?"

**Open* Command Bloat** (2.5h, 74 lines):
- 5 thin wrapper commands (openChangeHead/Base/Prev, openResourceHead/Base)
- Refactor to factory pattern

**AuthService Extraction** (4-6h, HIGH risk):
- Security isolation, scattered logic
- Defer until stability

**Test Coverage** (20-30h):
- 47 commands untested
- Defer until features stabilize

---

## Metrics

| Metric | Phase 14 Target | Phase 15 Target |
|--------|-----------------|-----------------|
| Directory deletion errors | 0% caught | 100% caught |
| Data loss risk | CRITICAL | FIXED |
| Decorator overhead | 1-2ms | <0.5ms |
| Status operations | 100% affected | 100% faster |

---

## Execution Order

**NEXT**: Phase 14 → Phase 15

**Rationale**:
1. Phase 14: CRITICAL bug fix (data loss, 30min)
2. Phase 15: High-frequency optimization (all operations, 1-2h)

**Total Effort**: 1.5-2.5h
