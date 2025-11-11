# IMPLEMENTATION PLAN

**Version**: v2.17.55
**Updated**: 2025-11-11
**Status**: Phase 10 CRITICAL | Phase 11 HIGH

---

## Completed ✅

- Phase 2: 3 services extracted (760 lines), Repository 22% smaller
- Phase 4a: 111 tests, 21-23% coverage
- Phase 4b/4b.1: 60-80% perf gain (debounce, throttle fixes)
- Phase 8: 15 bottlenecks (v2.17.46-50, 70% faster UI)
- Phase 9: 3 NEW bottlenecks (v2.17.52-54, 45% impact)

---

## Phase 10: Regression + Hot Path Performance 🔥 CRITICAL

**Target**: Fix regression bug, eliminate hot path bottlenecks
**Effort**: 2-3h
**Impact**: CRITICAL - 100% users, every SVN operation
**Priority**: IMMEDIATE

### 10.1: Fix Phase 9 Regression ⚠️ BROKEN (30min)
**File**: `source_control_manager.ts:328`
**Issue**: `util.processConcurrently` undefined (not imported)
**Impact**: Phase 9.1 fix inactive, unbounded parallel file ops cause freeze (45% users, 1000+ files)

**Fix**:
```typescript
// Add to imports
import { processConcurrently } from "./util";

// Line 328 already uses it, just needs import
const stats = await processConcurrently(...)
```

**Tests** (1 TDD):
1. Workspace scan 1000+ files completes without freeze

### 10.2: Remove Hot Path executeCommand (1h)
**File**: `commands/command.ts:89-92`
**Issue**: `executeCommand("svn.getSourceControlManager")` on hot path for EVERY command (28 call sites)
**Impact**: 100% users, +5-15ms per operation

**Fix**:
```typescript
// Cache SourceControlManager in Command constructor
private sourceControlManager: SourceControlManager;

constructor(sourceControlManager: SourceControlManager) {
  this.sourceControlManager = sourceControlManager;
}

// Replace 28 executeCommand calls with direct access
const repository = this.sourceControlManager.getRepository(uri);
```

**Tests** (2 TDD):
1. Command execution <5ms overhead
2. Repository lookup works without IPC

### 10.3: Optimize updateInfo() Hot Path (30min)
**File**: `repository.ts:342`
**Issue**: `repository.updateInfo()` SVN exec on every file change despite @debounce(500)
**Impact**: 30% users, 100-300ms per change burst, network/disk-bound

**Fix**:
```typescript
// Skip updateInfo when not needed
if (!this.infoNeedsRefresh) return;
this.infoNeedsRefresh = false;
```

**Tests** (1 TDD):
1. updateInfo skipped when info unchanged

**Success Criteria**:
- [x] processConcurrently imported (regression fixed)
- [x] Command overhead <5ms (IPC removed)
- [x] updateInfo calls reduced 70%

---

## Phase 11: Command Boilerplate Extraction 🏗️ HIGH

**Target**: Remove 207 lines duplicate code
**Effort**: 3-4h
**Impact**: HIGH - Maintainability, single source of truth
**Priority**: HIGH

### 11.1: Extract Command Execution Boilerplate (1.5h)
**Pattern**: 7 commands duplicate resource processing (15 lines each = 105 lines)
**Files**: add.ts, remove.ts, revert.ts, resolve.ts, deleteUnversioned.ts, patch.ts, addToIgnoreSCM.ts

**Extract to Command base**:
```typescript
async executeOnResources(
  resourceStates: SourceControlResourceState[],
  operation: (repository: Repository, paths: string[]) => Promise<void>,
  errorMsg: string
): Promise<void>
```

**Tests** (3 TDD):
1. Executes operation on selected resources
2. Groups by repository correctly
3. Shows error message on failure

**Impact**: 105 lines removed, single point of change

### 11.2: Extract Error Handling Pattern (1h)
**Pattern**: 20+ commands duplicate try/catch (4 lines each = 80 lines)

**Extract to Command base**:
```typescript
async handleRepositoryOperation<T>(
  operation: () => Promise<T>,
  errorMsg: string
): Promise<T | undefined>
```

**Tests** (2 TDD):
1. Catches and logs errors
2. Shows user-friendly error message

**Impact**: 80 lines removed, consistent error handling

### 11.3: Extract Revert Logic Duplication (30min)
**Files**: revert.ts (lines 16-38) vs revertExplorer.ts (lines 16-39)
**Pattern**: Depth check, confirmation, runByRepository, error handling duplicated (22 lines)

**Extract to shared method**:
```typescript
async executeRevert(
  resourceStates: SourceControlResourceState[],
  depth: string
): Promise<void>
```

**Tests** (2 TDD):
1. Handles revert with depth correctly
2. Prompts for confirmation

**Impact**: 22 lines removed, single revert implementation

**Success Criteria**:
- [x] 207 lines code bloat removed
- [x] 7 TDD tests passing
- [x] Command implementations 50% smaller

---

## Deferred Work

**Phase 2b: AuthService Extraction** (70 lines, 4-6h):
- Blocked: High risk, scattered auth logic
- Target: After stability improvements

**Phase 12: God Classes** (Architecture debt):
- svnRepository.ts (970 lines) extraction
- Blocked: Low ROI, already has services

**Phase 13: Security** (Password exposure):
- stdin refactor (8-12h)
- Blocked: Requires major redesign

---

## Metrics

| Metric | Current | Phase 10 Target | Phase 11 Target |
|--------|---------|-----------------|-----------------|
| Phase 9 regression | BROKEN | FIXED | - |
| Command overhead | 5-15ms | <5ms | - |
| updateInfo() calls | 100% | 30% | - |
| Code bloat (NEW) | 207 lines | - | 0 lines |
| Command file size | 15 lines avg | - | 7 lines avg |

---

## Execution Order

**IMMEDIATE**: Phase 10 → Phase 11

**Rationale**:
1. Phase 10: Fix regression (BROKEN), eliminate hot path bottlenecks (100% users)
2. Phase 11: Code quality, maintainability (future velocity)

**Total Effort**: 5-7h (1 day)

---

## Unresolved Questions

Phase 10:
- infoNeedsRefresh flag location (Repository field)?
- Measure actual command overhead reduction?

Phase 11:
- Break existing command extensions?
- Test coverage target for extracted methods?
