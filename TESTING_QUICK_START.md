# Testing Quick Start - Priority Action List

## 🎯 START HERE (This Week)

### 1. Fix Test Reliability (1 hour)
**File**: `src/test/commands/commandBoilerplate.test.ts`
```
❌ CURRENT: 15 placeholder tests with assert.ok(true)
✓ ACTION: Remove or implement these tests
✓ IMPACT: Restores test credibility
```

### 2. Add Critical System Tests (6 hours)

```
PRIORITY 1: src/source_control_manager.ts (3h)
├─ NO TESTS currently
├─ 450 LOC - Core system management
├─ Tests needed:
│  ✓ Repository discovery
│  ✓ Open/close lifecycle
│  ✓ Multi-repo scenarios
│  ✓ Event emission
│  ✓ Error recovery
└─ Expected: 20-25 assertions

PRIORITY 2: src/extension.ts init/cleanup (1.5h)
├─ Only 2 tests (activation only)
├─ Missing: startup sequence, shutdown cleanup
├─ Tests needed:
│  ✓ SVN finder integration
│  ✓ Provider registration
│  ✓ Signal handlers
│  ✓ Credential cleanup
└─ Expected: 15-20 assertions

PRIORITY 3: src/historyView/repoLogProvider.ts (1.5h)
├─ NO TESTS currently
├─ 280 LOC - Most-used history view
├─ Tests needed:
│  ✓ Tree item generation
│  ✓ Commit fetching
│  ✓ Filtering/sorting
│  ✓ Diff opening
└─ Expected: 15-20 assertions
```

### 3. Add Blame Status Bar Test (2 hours)
**File**: `src/blame/blameStatusBar.ts`
```
❌ CURRENT: NO TESTS
✓ ACTION: Create src/test/blame/blameStatusBar.test.ts
✓ Tests needed:
  - Status bar text rendering
  - Click handling
  - Configuration change reactions
  - Template variable substitution
✓ Expected: 15-20 assertions
```

**Total This Week**: 9 hours → 100+ new assertions

---

## 📋 NEXT 2 WEEKS (High Priority)

### Week 2 - History Views & Blame (8 hours)

```
src/historyView/itemLogProvider.ts           (2h) → 15 tests
src/historyView/branchChangesProvider.ts     (1.5h) → 12 tests
src/blame/blameProvider.ts expansion         (2h) → 20 tests
src/blame/performanceComparison.ts          (1.5h) → 10 tests
src/historyView/common.ts (shared utils)    (1h) → 8 tests
```

### Week 3 - Top Commands (8 hours)

```
Merge/Branch Operations:
  src/commands/merge.ts                     (1.5h) → 10 tests
  src/commands/switchBranch.ts              (1.5h) → 8 tests

Diff/Patch Tools:
  src/commands/diffWithExternalTool.ts      (1.5h) → 10 tests
  src/commands/patchAll.ts                  (1h) → 6 tests

Blame Subcommands (6 files):
  src/commands/blame/*.ts                   (1.5h) → 20 tests

Ignore Operations (2 files):
  src/commands/addToIgnore*.ts              (1h) → 6 tests
```

---

## 📊 COVERAGE BY STATUS

### ✓ GOOD (No Action Needed)
```
Security Testing                            100%
  ├─ Error sanitizer
  ├─ Credential protection
  └─ XML injection prevention

Parser Testing                              100%
  ├─ Status, log, info, diff parsing
  └─ XML security

Utility Testing                             75%+
  ├─ Path operations
  ├─ File operations
  ├─ Event utilities
  └─ Glob matching
```

### ⚠️ MEDIUM (Some Tests Exist)
```
Blame System                                67%
  ├─ Config, state, rendering ✓
  ├─ Missing: Provider edge cases
  └─ Missing: Status bar, performance

Services                                    80%
  ├─ Auth, status, groups ✓
  ├─ Missing: Integration scenarios
  └─ Missing: Concurrency tests

Commands (Specific)                         20%
  ├─ 15 commands tested
  ├─ Missing: 30+ commands
  └─ Especially: merge, branch, diff tools
```

### ❌ CRITICAL (Must Fix)
```
History Views                               25%
  ├─ 3 tree providers = 0 direct tests
  ├─ Missing: All rendering logic
  └─ Missing: All user interactions

Core System                                 33%
  ├─ Manager = no tests
  ├─ Extension init = 2 tests only
  └─ Missing: Lifecycle management

Tree View/Decorators                        13%
  ├─ 6 tree node files = 0 tests
  ├─ File decorations = 0 tests
  └─ Missing: All UI rendering

Commands (Overall)                          27%
  ├─ 15 of 55 commands tested
  ├─ Missing: 30+ commands
  └─ Especially admin, merge, diff ops
```

---

## 🚀 QUICK WIN TESTS (Start with These)

Each takes 30-60 minutes, gives immediate confidence:

```
1. src/commands/close.ts              (20 LOC) → 8 tests
2. src/commands/cleanup.ts            (30 LOC) → 8 tests
3. src/commands/openFile.ts           (30 LOC) → 8 tests
4. src/commands/openHeadFile.ts       (30 LOC) → 8 tests
5. src/blame/performanceComparison.ts (200 LOC) → 10 tests
6. src/treeView/nodes/baseNode.ts    (150 LOC) → 12 tests
7. src/fileDecorationProvider.ts     (150 LOC) → 12 tests
8. src/commands/addToIgnoreExplorer.ts (20 LOC) → 6 tests
9. src/commands/addToIgnoreSCM.ts    (30 LOC) → 6 tests
10. src/services/svnAuthCache.ts     (with expansion) → 8 tests
```

**Total**: 10 hours → 86 new assertions

---

## 📁 FILE STRUCTURE FOR NEW TESTS

Create test files following this pattern:

```
For: src/blame/blameStatusBar.ts
Create: src/test/unit/blame/blameStatusBar.test.ts

For: src/commands/merge.ts
Create: src/test/unit/commands/merge.test.ts

For: src/historyView/repoLogProvider.ts
Create: src/test/unit/historyView/repoLogProvider.test.ts

For: src/source_control_manager.ts
Create: src/test/unit/managers/sourceControlManager.test.ts
```

---

## 🧪 TEST TEMPLATE (Copy & Use)

```typescript
import * as assert from "assert";
import * as sinon from "sinon";
// Import what you're testing

suite("[ComponentName] Tests", () => {
  let instance: ComponentName;
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    // Initialize component
    instance = new ComponentName();
  });

  teardown(() => {
    sandbox.restore();
    // Cleanup
  });

  test("[scenario] - [expected behavior]", async () => {
    // Arrange - setup test conditions

    // Act - execute code

    // Assert - verify results
    assert.strictEqual(result, expected);
  });

  test("[error scenario] - [should handle gracefully]", async () => {
    // Arrange - setup error condition

    // Act - execute code that should fail

    // Assert - verify error handling
    assert.ok(error);
  });
});
```

---

## 📈 METRICS TO TRACK

### Count
```
Weekly new assertions:  50+ (goal)
Weekly new test files:   2-3 (goal)
Weekly placeholder removal: 5+ (goal)
```

### Quality
```
Test execution time: < 30 seconds with parallel
Placeholder tests:   0 (currently ~15)
Flaky tests:        <1%
Coverage threshold:  80%+ (when enabled)
```

---

## 🔧 COMMANDS TO RUN

```bash
# Run all tests (takes ~3 min)
npm test

# Run tests only (skip build)
npm run test:fast

# Run specific test file
npm run test:fast -- --grep "BlameStatusBar"

# Generate coverage report (in coverage/)
npm run test:coverage

# Watch tests (during development)
npm test -- --watch
```

---

## 📚 REFERENCE

**Full Analysis**: TEST_COVERAGE_ANALYSIS.md
**Detailed Plan**: COVERAGE_GAPS_DETAILED.md
**Executive Summary**: TEST_COVERAGE_SUMMARY.md
**This Guide**: TESTING_QUICK_START.md

---

## ✅ SUCCESS CRITERIA

**Phase 1 (This Week)**:
- [ ] Remove placeholder tests
- [ ] Add source_control_manager.ts test
- [ ] Add blameStatusBar.ts test
- [ ] Add repoLogProvider.ts test
- [ ] Total: 100+ new assertions

**Phase 2 (Next 2 Weeks)**:
- [ ] Add remaining history view tests
- [ ] Add top 5 command tests
- [ ] Add blame system expansion tests
- [ ] Total: 150+ new assertions

**Phase 3 (Ongoing)**:
- [ ] 85%+ file coverage
- [ ] 90%+ command coverage
- [ ] 80%+ threshold enforcement
- [ ] <30 second parallel execution

---

## 💡 PRO TIPS

1. **Start small** - Fix quick wins first (1-hour tests)
2. **Use templates** - Copy existing test structure
3. **Test isolation** - Each test should be independent
4. **Mock deeply** - Replicate real behavior 80%+
5. **Name clearly** - Test name describes what's being tested
6. **Group logically** - Use suite() for organization
7. **One assert per scenario** - Keep tests focused
8. **Clean up** - Teardown should reverse setup

---

## 🎓 LEARNING PATH

1. Read: TESTING_QUICK_START.md (this file)
2. Check: Existing similar tests for patterns
3. Copy: Test template from section above
4. Write: Your first test (pick from quick wins)
5. Run: npm test:fast -- --grep "[your test]"
6. Iterate: Refine test until assertions pass
7. Review: Compare with similar tests
8. Submit: Add to appropriate test file

---

**Status**: Ready to start implementing
**Estimated Total Effort**: 48 hours for 80%+ coverage
**High Priority Items**: 9 hours for critical gaps
**Quick Wins**: 10 hours for immediate confidence

👉 **Next Step**: Pick first test from "Quick Win Tests" above and start writing!
