# IMPLEMENTATION PLAN

**Version**: v2.17.112
**Updated**: 2025-11-12
**Status**: All P0 issues resolved ✅. 2 high-impact P1 phases planned.

---

## Phase 20: Performance - Critical Path Optimization ⚡

**Target**: v2.17.113-115
**Effort**: 5-8h
**Impact**: 50-70% users, 2-5x faster status updates

### Bottlenecks

**A. Quadratic descendant resolution** (P1 - CRITICAL)
- Location: `StatusService.ts:217-223`
- Issue: O(n*m) nested loop despite claiming "Phase 11 perf fix"
- Impact: 100-500ms on 1000+ files
- Fix: Build descendant set once, single iteration
- Effort: 1-2h

**B. Repeated glob pattern matching** (P1)
- Location: `StatusService.ts:292,350-358`
- Issue: `matchAll()` per status item (10-50ms on 500+ files)
- Fix: Pre-filter simple patterns, two-tier matching
- Effort: 2-3h

**C. Missing batch operations** (P1)
- Location: `svnRepository.ts:615-618`
- Issue: No chunking for bulk file ops (50-200ms overhead)
- Fix: Batch SVN commands (50 files/chunk)
- Effort: 2-3h

### Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Status update (1000 files) | 100-500ms | 20-100ms |
| Glob filtering (500 files) | 10-50ms | 3-15ms |
| Bulk add (100 files) | 50-200ms | 20-80ms |

---

## Phase 21: Code Quality - Duplication & Modernization 🔧

**Target**: v2.17.116-118
**Effort**: 12-15h
**Impact**: ~200 lines removed, better maintainability

### Quick Wins

**A. Extract show/showBuffer encoding logic** (P1)
- Duplication: 139 lines, 90% identical
- Remove: ~95 lines via template method
- Effort: 2h

**B. Split util.ts into focused modules** (P1)
- Current: 336 lines, 26 exports (dumping ground)
- Split into: pathUtils, eventUtils, validation
- Remove: ~180 lines reorganized
- Effort: 3-4h

**C. Standardize error handling** (P1)
- Issue: 70 catch blocks, inconsistent patterns
- Fix: Extract error handler utility
- Remove: ~40 lines duplicate logic
- Effort: 4-6h

**D. Optional chaining modernization** (P2)
- Replace: `&& obj && obj.prop` → `obj?.prop` (48 occurrences)
- Effort: 2-3h

### Metrics

| Metric | Before | After |
|--------|--------|-------|
| svnRepository.ts | 1086 lines | ~990 lines |
| util.ts | 336 lines | Split 3 files |
| Duplicate code | 200+ lines | <50 lines |

---

## Completed Phases ✅

**Phase 18 (v2.17.108-109)**: UI Performance
- Non-blocking progress (ProgressLocation.Notification)
- CancellationToken support
- Impact: UI freezes eliminated (2-5s → 0s)

**Phase 19 (v2.17.106-107)**: Memory + Security
- Info cache LRU (500 entry limit)
- esbuild update (vuln fix)
- Smart remote polling (95% faster)
- Impact: Memory stable (<50MB vs 100-500MB/8h)

---

## Future Opportunities (P2/P3)

**Type Safety** (80-120h):
- 248 `any` types across 25 files
- Decorator type definitions
- Error type guards

**Security** (20-30h):
- Password CLI exposure fix
- Unsafe JSON.parse (2 locations)

**Architecture** (16-20h):
- Extract FileOperationsService
- Extract DiffService

---

## Summary

**P0**: All resolved ✅
**P1 (Phases 20-21)**: 17-23h effort, high user impact
**P2/P3**: 120-170h effort, lower priority

**Next action**: Phase 20 (Performance optimization)
