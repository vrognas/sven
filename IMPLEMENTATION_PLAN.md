# IMPLEMENTATION PLAN

**Version**: v2.17.61
**Updated**: 2025-11-11
**Status**: Phases 10-11 COMPLETE ✅

---

## Completed ✅

- Phase 2: 3 services extracted (760 lines), Repository 22% smaller
- Phase 4a: 111 tests, 21-23% coverage
- Phase 4b/4b.1: 60-80% perf gain (debounce, throttle fixes)
- Phase 8: 15 bottlenecks (v2.17.46-50, 70% faster UI)
- Phase 9: 3 NEW bottlenecks (v2.17.52-54, 45% impact)
- Phase 10: Regression + hot path fixes (v2.17.59-60, 100% users)
- Phase 11: Command boilerplate (v2.17.58, 82 lines removed)

---

## Phase 12: Status Update Performance 🔥 CRITICAL

**Target**: Eliminate redundant status updates (50% users)
**Effort**: 1-2h
**Impact**: CRITICAL - 200-500ms savings per change burst
**Priority**: IMMEDIATE

### Issue
**File**: `repository.ts:468` (updateModelState)
**Problem**: Has @throttle + @globalSequentialize but no short-term cache. Multiple events within 2-3s trigger redundant SVN status calls.
**Impact**: 50% active editors, 200-500ms per burst, 2-5x duplicate calls

### Fix
```typescript
// Add to Repository class
private lastModelUpdate: number = 0;
private readonly MODEL_CACHE_MS = 2000; // 2s cache

@globalSequentialize
@throttle(300)
async updateModelState(): Promise<void> {
  const now = Date.now();
  if (now - this.lastModelUpdate < this.MODEL_CACHE_MS) return;
  this.lastModelUpdate = now;

  // ... existing logic
}
```

**Why 2s**: Bursts typically occur within 2-3s window. Longer cache risks stale UI.

**Tests** (2 TDD):
1. Multiple events within 2s trigger single update
2. Events >2s apart trigger separate updates

**Success Criteria**:
- [ ] updateModelState calls reduced 60-80% during bursts
- [ ] UI still responsive (<3s staleness acceptable)
- [ ] Tests pass

---

## Phase 13: Code Bloat Cleanup 🏗️ HIGH

**Target**: Remove 260 lines defensive/duplicate code
**Effort**: 2.5h
**Impact**: HIGH - Maintainability, leverage Phase 11 work
**Priority**: HIGH

### 13.1: Remove Defensive Null Checks (30min)
**Pattern**: 17 commands check `if (!repository) return;`
**Files**: patch.ts:18-21, resolve.ts, commit.ts, etc. (34 lines)
**Issue**: Command base already handles resolution
**Fix**: Remove all unnecessary repository null guards
**Tests**: Existing command tests verify no regressions

### 13.2: Extract Empty Selection Guards (30min)
**Pattern**: 6 commands duplicate selection check (18 lines)
**Files**: resolve.ts:13, revert.ts:13, patch.ts:12, etc.
**Fix**: Add `getResourceStatesOrExit()` to Command base returning null on empty
**Tests** (1 TDD):
1. Returns null on empty selection, exits early

### 13.3: Migrate to Phase 11 Error Helpers (1.5h)
**Pattern**: 17 commands not using `handleRepositoryOperation()` (180 lines)
**Issue**: Phase 11.2 added helper but only 3 commands migrated
**Fix**: Migrate remaining try/catch blocks to use helper
**Tests**: Existing tests verify error handling preserved

**Success Criteria**:
- [ ] 232 lines bloat removed (34 + 18 + 180)
- [ ] Command base has 2 new helpers (getResourceStatesOrExit + migrations)
- [ ] 20 commands refactored
- [ ] Build passes, no regressions

---

## Deferred (Low Priority)

**AuthService Extraction** (70 lines, 4-6h, HIGH risk):
- Security isolation, but scattered logic risky to extract
- Defer until stability window

**God Classes** (1,893 lines, LOW ROI):
- Already extracted 3 services, diminishing returns

**Test Coverage** (21-23% → 50%+, 20-30h):
- Command layer, SVN process, multi-repo (47 commands untested)
- Defer until features stabilize

**SVN Timeout Config** (2-3h, 10-15% users):
- Per-operation timeouts (status:10s, commit:60s)
- Defer until Phase 12-13 complete

---

## Metrics

| Metric | Before | Phase 12 Target | Phase 13 Target |
|--------|--------|-----------------|-----------------|
| updateModelState redundant | 60-80% | <20% | - |
| Status burst latency | 200-500ms | <100ms | - |
| Code bloat lines | 260 | - | 0 |
| Commands refactored | 5 | - | 25 total |

---

## Execution Order

**NEXT**: Phase 12 → Phase 13

**Rationale**:
1. Phase 12: CRITICAL perf fix (50% users, active editors)
2. Phase 13: Leverage Phase 11 helpers, maintainability

**Total Effort**: 3.5-4.5h
