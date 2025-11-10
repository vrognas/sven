# IMPLEMENTATION PLAN - Next Phases

**Version**: v2.17.34
**Updated**: 2025-11-10
**Status**: Phase 2 Complete ✅ | Phase 4.5b Complete ✅ | Next: Phase 4a Testing + Phase 2b Auth

---

## Current Status

**Phase 2 Complete** (v2.17.17-18):
- Repository: 1,179 → 923 lines (22% reduction)
- 3 services extracted: StatusService (355), ResourceGroupManager (298), RemoteChangeService (107)
- 9 tests added, zero regressions

**Phase 4.5b Complete** (v2.17.31-33):
- Build fixed (5 TS errors, esModuleInterop)
- DX improved (parallel pretest, test:fast, 40-80% faster)
- URL validation complete (checkout + switchBranch)
- validateRevision scope assessed (1/1 inputs protected)

**Outstanding**:
- 1 CRITICAL security gap (password exposure - deferred, requires stdin refactor)
- 5 performance bottlenecks (deferred to Phase 8)
- ~530 lines code bloat (deferred)

---

## Phase 4a: Security Foundation (Week 1 - 6 days)

### Validation Tests (2 days)
Test 6 validators with boundary cases:
- validateRevision, validatePath, validateUrl, validateBranchName, validateCommitMsg, validateRepositoryUrl
- ~90 tests (15 cases × 6 validators)

**Files**: test/unit/validators.test.ts

### Parser + Integration Tests (2 days)
- Parser tests: statusParser, logParser, infoParser with real fixtures
- Integration tests: checkout→modify→commit end-to-end flows
- Edge cases: special chars, externals, changelists

**Files**: test/unit/parsers/, test/integration/

### Error Handling Tests (2 days)
Focus on 5 critical user-facing gaps:
1. Unhandled promise rejections (event handlers)
2. Generic error messages (add context)
3. Race conditions in status updates
4. Silent auth failures
5. Activation failures

**Files**: test/unit/error-handling.test.ts

**Target**: 25-30% coverage

**Success Criteria**:
- [ ] All validators tested (boundary + malicious)
- [ ] Parsers + integration tested
- [ ] Error handling tests passing
- [ ] 25-30% line coverage

---

## Phase 2b: AuthService Extraction (Week 1 - concurrent)

### Extract Auth Logic (6h)
- Lines: repository.ts:735-806 (70 lines)
- Target: Repository → 850 lines
- Pattern: Stateless service, zero Repository deps

### Auth Security Tests (1 day)
- Credential storage (SecretStorage API)
- Retry flow with auth
- Multiple accounts per repo

**Success Criteria**:
- [ ] AuthService extracted (70 lines)
- [ ] 3 TDD tests passing
- [ ] Repository < 860 lines

---

## Performance Bottlenecks (Top 5 - Deferred to Phase 8)

**Critical Issues Identified** (5 parallel subagents, 2025-11-10):

1. **Info cache timeout: 2min** (svnRepository.ts:192) - spawns new processes every 2min
2. **Remote polling overhead: 5min** (services/RemoteChangeService.ts:89) - no backpressure
3. **Cascading debounce: 3×1000ms** (repository.ts:293,302,366) - 2-3s delay
4. **Blocking XML parser** (parser/statusParser.ts:72) - UI thread blocked
5. **O(n²) status filtering** (services/StatusService.ts:239) - 10k files × 50 patterns

**Decision**: Affects power users only, defer post-v2.18.0

---

## Code Bloat (Top 5 - Deferred)

**~250-300 lines removable**:

1. Duplicate Buffer/String pairs (~150 lines) - show/showBuffer, etc.
2. Over-engineered constructor pattern (svnRepository.ts:51-66)
3. Redundant error handlers (35 instances)
4. Debug console logging (extension.ts:34-76)
5. Stale TODOs (18+ instances)

**Decision**: Defer until testing complete

---

## Metrics Dashboard

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test coverage (line) | 25-30% | 12% | 🔴 |
| Repository LOC | <860 | 923 | 🟡 |
| Services extracted | 4 | 3 | 🟡 |
| CRITICAL vulns | 0 | 1 (deferred) | 🟡 |
| Build status | ✅ | ✅ | ✅ |
| DX (dev cycle speed) | Faster | 40-80% faster | ✅ |
| URL validation | 100% | 100% | ✅ |

---

## Next Actions

**PHASE 4a** (Week 1 - 6 days):
1. Validator tests (6 validators, boundary cases) - 2 days
2. Parser tests + integration tests - 2 days
3. Error handling tests (promise rejections, race conditions) - 2 days

**PHASE 2b** (Concurrent):
4. Extract AuthService (70 lines from repository.ts) - 1 day
5. Auth security tests (3 TDD tests)

**Target**: v2.18.0 with 25-30% coverage, 4 services extracted

---

## Unresolved Questions

**Performance Analysis**:
- Target repo size (file count) for optimization?
- Remote vs local repos priority?
- Network latency profile?
- CPU/memory constraints?
