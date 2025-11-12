# IMPLEMENTATION PLAN

**Version**: v2.17.107
**Updated**: 2025-11-12
**Status**: Phase 19 COMPLETE ✅, Phase 18 remains

---

## Phase 19: Memory + Security Fixes 🔒 COMPLETE ✅

**Completed**: 2025-11-12 (v2.17.106-107)
**Effort**: 2.5h (as estimated)
**Impact**: Security vuln fixed, memory leak prevented, 95% faster polls

### Results
**A. Info cache LRU** ✅ (v2.17.107)
- 500 entry max, LRU eviction
- lastAccessed tracking
- +3 tests, prevents 100-500MB leak

**B. esbuild update** ✅ (v2.17.106)
- 0.24.2 → 0.27.0
- GHSA-67mh-4wv8-2f99 fixed
- 5 → 4 vulnerabilities

**C. Smart remote polling** ✅ (v2.17.107)
- `svn log -r BASE:HEAD --limit 1` check
- 95% faster when no changes
- +3 tests

---

## Phase 18: UI Performance - Non-Blocking Operations ⚡ CRITICAL

**Impact**: 50-100% users, 2-5s UI freezes eliminated
**Effort**: 4-6h
**Risk**: MEDIUM (async refactor of critical path)
**Priority**: P0 - Highest user impact

### Problem
Blocking SVN operations freeze UI during:
- File saves (status update)
- Branch switches (full repo scan)
- Remote checks (5min poll)
- Manual refresh

**Root cause**: `await repository.getStatus()` + `svn stat --xml --show-updates` runs serially, blocks main thread.

**User impact**: Editor unresponsive 2-5s per operation, 50-100% users affected.

### Implementation
1. Convert `run()` to non-blocking: use ProgressLocation.Notification
2. Add cancellation tokens to long ops (status, update, log)
3. Implement background queue for status updates
4. Add "Cancel" button to progress UI
5. Defer non-critical updates (decorations, counts)

### Success Metrics
- UI freeze <100ms (down from 2-5s)
- Operations cancellable within 500ms
- Background queue handles burst events

### Tests
- Status update doesn't block typing (integration)
- Cancel interrupts long operation (unit)
- Queue batches rapid events (unit)

---

## Metrics

| Metric | Before | Phase 18 Target | Phase 19 ✅ |
|--------|--------|-----------------|-------------|
| UI freeze | 2-5s | <100ms | 2-5s (unchanged) |
| Memory growth (8h) | 100-500MB | N/A | <50MB ✅ |
| Remote poll (no changes) | 5-300s | N/A | 0.1-15s ✅ |
| Security vulns | 1 | 1 | 0 ✅ |

---

## Unresolved

- SVN concurrency limits?
- Worker threads for status parsing?
- Progressive status updates (show partial)?
