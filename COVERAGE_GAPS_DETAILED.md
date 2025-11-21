# Test Coverage Gaps - Detailed File-by-File Breakdown

## Quick Reference: Files Needing Tests

### CRITICAL - No Tests (Top Priority)

#### Core System Files
```
src/source_control_manager.ts          [450 LOC] ← HIGHEST PRIORITY
  ├─ Repository lifecycle management
  ├─ Multi-root workspace handling
  ├─ Event emission verification
  └─ Error recovery mechanisms

src/extension.ts                       [220 LOC] - Only 2 tests
  ├─ SVN finder integration
  ├─ Provider registration
  ├─ Signal handler setup
  └─ Cleanup on deactivation

src/historyView/repoLogProvider.ts     [280 LOC] ← HIGH PRIORITY
  ├─ Tree rendering logic
  ├─ Lazy loading commits
  ├─ Filtering/searching
  └─ External diff integration

src/historyView/itemLogProvider.ts     [240 LOC] ← HIGH PRIORITY
  ├─ File history tree
  ├─ Revision comparison
  └─ Copy/paste operations

src/historyView/branchChangesProvider.ts [180 LOC] ← HIGH PRIORITY
  ├─ Branch detection
  ├─ Change aggregation
  └─ Diff opening

src/blame/blameStatusBar.ts            [280 LOC] ← HIGH PRIORITY
  ├─ Status bar rendering
  ├─ Click handling
  └─ Configuration reactions

src/blame/performanceComparison.ts     [200 LOC]
  ├─ Metrics collection
  └─ Comparison logic
```

#### Tree View/UI Files (6 files)
```
src/treeView/nodes/baseNode.ts         [150 LOC]
src/treeView/nodes/incomingChangeNode.ts [100 LOC]
src/treeView/nodes/incomingChangesNode.ts [120 LOC]
src/treeView/nodes/noIncomingChangesNode.ts [80 LOC]
src/treeView/nodes/repositoryNode.ts   [200 LOC]
src/fileDecorationProvider.ts          [150 LOC]
  ├─ Icon assignment
  ├─ Color computation
  └─ Badge rendering
```

#### Commands - 30+ Untested

**Blame Subcommands (6)**
```
src/commands/blame/clearBlame.ts       [40 LOC]
src/commands/blame/disableBlame.ts     [40 LOC]
src/commands/blame/enableBlame.ts      [40 LOC]
src/commands/blame/showBlame.ts        [60 LOC]
src/commands/blame/toggleBlame.ts      [50 LOC]
src/commands/blame/untrackedInfo.ts    [30 LOC]
```

**File Operations (7)**
```
src/commands/openFile.ts               [30 LOC]
src/commands/openHeadFile.ts           [30 LOC]
src/commands/openCommands.ts           [30 LOC]
src/commands/fileOpen.ts               [30 LOC]
src/commands/finishCheckout.ts         [30 LOC]
src/commands/revealInExplorer.ts       [20 LOC] ← Has test
src/commands/deleteUnversioned.ts      [40 LOC] ← Has test
```

**Branch/Merge/Search (4)**
```
src/commands/merge.ts                  [80 LOC]     ← HIGH PRIORITY
src/commands/switchBranch.ts           [60 LOC]     ← HIGH PRIORITY
src/commands/search_log_by_text.ts     [50 LOC]
src/commands/search_log_by_revision.ts [40 LOC]
```

**Diff/Patch (5)**
```
src/commands/diffWithExternalTool.ts   [80 LOC]     ← HIGH PRIORITY
src/commands/patchChangeList.ts        [60 LOC]
src/commands/patchAll.ts               [40 LOC]
src/commands/patch.ts                  [50 LOC]
src/commands/openChangePrev.ts         [30 LOC]
```

**Administrative (8)**
```
src/commands/close.ts                  [20 LOC]
src/commands/promptAuth.ts             [50 LOC]
src/commands/promptRemove.ts           [40 LOC]
src/commands/upgrade.ts                [30 LOC] ← Has test
src/commands/refreshRemoteChanges.ts   [40 LOC]
src/commands/pullIncomingChange.ts     [30 LOC] ← Has test
src/commands/changeList.ts             [60 LOC]
src/commands/cleanup.ts                [30 LOC]
```

**Ignore Operations (2)**
```
src/commands/addToIgnoreExplorer.ts    [20 LOC]
src/commands/addToIgnoreSCM.ts         [30 LOC]
```

---

### MEDIUM PRIORITY - Partial Tests

#### Blame System
```
src/blame/blameProvider.ts             [1200 LOC] ⚠️ PARTIAL
├─ Has: E2E tests (40+ assertions)
├─ Missing: Error handling
├─ Missing: Memory management
├─ Missing: Large files (10K+ lines)
└─ Needs: 30+ additional tests

src/blame/templateCompiler.ts          [100 LOC] ⚠️ MINIMAL
├─ Has: 3 tests
├─ Missing: Special characters
├─ Missing: Performance
└─ Needs: 10+ additional tests
```

#### Core System
```
src/repository.ts                      [780 LOC] ⚠️ INTEGRATION ONLY
├─ Has: Integration tests
├─ Missing: Unit test isolation
├─ Missing: Resource transitions
└─ Needs: 40+ unit tests

src/svnRepository.ts                   [500 LOC] ⚠️ MINIMAL
├─ Has: Basic test only
├─ Missing: Error scenarios
├─ Missing: Auth flows
└─ Needs: 30+ tests
```

#### Services (Partial Coverage)
```
src/services/authService.ts            ⚠️ Has test but limited
├─ Missing: Multi-repo isolation
├─ Missing: Timeout handling
└─ Needs: 10+ additional tests

src/services/statusService.ts          ⚠️ Has test but limited
├─ Missing: Cache invalidation
├─ Missing: Concurrent requests
└─ Needs: 15+ additional tests

src/services/resourceGroupManager.ts   ⚠️ Has test but limited
├─ Missing: State transitions
├─ Missing: Filter consistency
└─ Needs: 15+ additional tests

src/services/svnAuthCache.ts           ⚠️ Has test but limited
├─ Missing: TTL behavior
├─ Missing: Memory limits
└─ Needs: 10+ additional tests

src/services/remoteChangeService.ts    ⚠️ Has test but limited
├─ Missing: Check frequency
├─ Missing: Error handling
└─ Needs: 15+ additional tests
```

#### Parsers (Edge Cases)
```
src/parser/xmlParserAdapter.ts         ⚠️ PARTIAL
├─ Has: Security tests
├─ Missing: Malformed XML
├─ Missing: Encoding edges
└─ Needs: 20+ additional tests

src/parser/blameParser.ts              ⚠️ NEW, SPARSE
├─ Missing: Deleted lines
├─ Missing: Binary files
├─ Missing: Non-ASCII
└─ Needs: 15+ tests
```

#### File Operations
```
src/fs/exists.ts                       ⚠️ Has test
src/fs/read_file.ts                    ⚠️ Has test
src/fs/write_file.ts                   ⚠️ Has test
src/fs/stat.ts                         ⚠️ Has test
├─ Missing: Permission errors
├─ Missing: Encoding issues
└─ Needs: Additional edge cases

src/temp_svn_fs.ts                     ⚠️ Has test
├─ Missing: Cleanup on error
├─ Missing: Concurrent access
└─ Needs: 15+ additional tests

src/watchers/repositoryFilesWatcher.ts ⚠️ Has test
├─ Missing: Event ordering
├─ Missing: Large file bursts
└─ Needs: 15+ additional tests
```

#### Utilities
```
src/decorators.ts                      ⚠️ INDIRECT ONLY
├─ @debounce - indirect test via usage
├─ @throttle - no direct tests
├─ @globalSequentialize - has test
├─ @memoize - no direct tests
└─ Needs: 30+ direct unit tests

src/util.ts                            ✓ Good coverage
src/util/globMatch.ts                  ✓ Good coverage
src/util/errorLogger.ts                ✓ Good coverage
```

---

## Test Estimation Matrix

| File | LOC | Current | Estimated Tests | Priority | Est. Time |
|------|-----|---------|-----------------|----------|-----------|
| source_control_manager.ts | 450 | 0 | 25 | P0 | 3h |
| repoLogProvider.ts | 280 | 0 | 20 | P0 | 2.5h |
| itemLogProvider.ts | 240 | 0 | 18 | P0 | 2.5h |
| branchChangesProvider.ts | 180 | 0 | 15 | P0 | 2h |
| blameStatusBar.ts | 280 | 0 | 20 | P0 | 2.5h |
| blameProvider.ts | 1200 | 40 | 30 | P1 | 3h |
| merge.ts | 80 | 0 | 10 | P1 | 1.5h |
| switchBranch.ts | 60 | 0 | 8 | P1 | 1h |
| diffWithExternalTool.ts | 80 | 0 | 10 | P1 | 1.5h |
| treeView nodes (6 files) | 650 | 0 | 40 | P1 | 5h |
| commands (24 files) | 1200 | ~15 | 80+ | P2 | 10h |
| decorators.ts | 150 | ~5 | 30 | P2 | 3h |
| **TOTAL** | **~6000** | **~60** | **400+** | | **~42h** |

---

## Coverage by Test Type

### Current Test Distribution

```
Unit Tests (isolated, mocked):       ~75 files
├─ Parsers                          6 files ✓ Good
├─ Utilities                        15 files ✓ Good
├─ Blame features                   14 files ⚠️ Medium
├─ Commands                         15 files ❌ Low
├─ Security                         5 files ✓ Good
└─ Services                         4 files ⚠️ Medium

Integration Tests:                   ~20 files
├─ Full SVN operations              3 files (with real repos)
├─ History views                    1 file (minimal)
└─ Workflows                        ~16 files (limited)

Missing Test Types:
❌ Performance tests                 0 files
❌ Concurrent operation tests        0 files
❌ Configuration tests               0 files
❌ Timeout/cancellation tests        0 files
```

---

## Testing Patterns - What's Needed

### 1. Unit Test Pattern (for commands)

```typescript
// Test structure needed for each command
describe("CommandName", () => {
  let command: CommandName;
  let mockRepository: Partial<Repository>;
  let mockUI: Partial<Window>;

  beforeEach(() => {
    command = new CommandName();
    mockRepository = createMockRepository();
    mockUI = createMockUI();
  });

  // Happy path
  test("executes successfully with valid input", async () => {
    // Execute
    // Assert: repository called correctly
    // Assert: user feedback shown
  });

  // Error cases
  test("shows error on repository failure", async () => {
    // Arrange: mock error
    // Execute
    // Assert: error message shown
    // Assert: user notified
  });

  // Edge cases
  test("handles empty selection gracefully", async () => {
    // Execute: empty selection
    // Assert: early exit
  });
});
```

### 2. Tree Provider Pattern

```typescript
// Test structure for tree providers
describe("RepoLogProvider", () => {
  let provider: RepoLogProvider;
  let mockRepository: Partial<Repository>;

  test("creates root items for commits", async () => {
    // Get tree items
    // Verify structure, labels, icons
  });

  test("resolves children on demand", async () => {
    // Get root item
    // Get children
    // Verify lazy loading works
  });

  test("filters items by criteria", async () => {
    // Apply filter
    // Get items
    // Verify filtering correct
  });
});
```

### 3. Integration Test Pattern

```typescript
// Test pattern for workflows
describe("Checkout and Commit Workflow", () => {
  let repository: Repository;
  let tempDir: string;

  before(async () => {
    // Create real SVN repo
    // Checkout working copy
  });

  after(async () => {
    // Cleanup repo
    // Cleanup files
  });

  test("complete checkout → add → commit flow", async () => {
    // Create file
    // Add to SVN
    // Verify in staging
    // Commit
    // Verify revision
    // Verify server has commit
  });
});
```

---

## Implementation Priority

### Week 1 - Core System (15h)
```
1. source_control_manager.ts        (3h)  - Foundation for other tests
2. extension.ts cleanup/init        (2h)  - Startup/shutdown safety
3. repoLogProvider.ts               (2.5h) - Most used history view
4. itemLogProvider.ts               (2.5h) - File history
5. branchChangesProvider.ts         (2h)   - Branch operations
6. Remove placeholder tests         (1h)   - Fix test reliability
```

### Week 2 - Blame System (10h)
```
7. blameStatusBar.ts                (2.5h)
8. blameProvider.ts expansion       (3h)   - Large files, error cases
9. Message fetching edge cases      (1.5h)
10. Performance comparison          (1.5h)
11. Large file warning system       (1.5h)
```

### Week 3 - Commands (15h)
```
12. merge, switchBranch             (3h)   - Branch operations
13. Diff/patch commands             (3h)   - Diff tools
14. Blame subcommands (6)           (3h)   - Blame UI
15. File operations (7)             (3h)   - Open file operations
16. Changelist operations           (2h)   - Changelist management
17. Ignore operations               (1h)   - SVN ignore
```

### Week 4+ - Quality
```
18. Tree view nodes (6 files)       (5h)   - UI rendering
19. Decorator testing               (3h)   - debounce, throttle, etc
20. Error scenarios & edge cases    (6h)   - Robustness
21. Integration workflows           (4h)   - E2E scenarios
22. Performance tests               (3h)   - Regression detection
```

---

## Quick Wins (Can start immediately)

These need only 1-2 hours each:

```
1. Remove 15 placeholder tests in commandBoilerplate.test.ts
2. Add blameStatusBar.ts basic test (2h)
3. Add performanceComparison.ts basic test (1.5h)
4. Add close.ts command test (1h)
5. Add promptAuth.ts command test (1h)
6. Add changeList.ts command test (1.5h)
7. Add openFile*.ts command tests (2h total)
8. Add ignore*.ts command tests (1h)
9. Add search_log*.ts command tests (1.5h total)
```

**Total Quick Wins**: ~13 hours → 100+ new test assertions

---

## Success Criteria

### Target Coverage
```
Source files with tests:         80%+ (128/155 files)
Test assertions per file:        0.8+ (80+ tests for source files)
Command coverage:                90%+ (40+ of 45 commands)
Blame system coverage:           95%+
History view coverage:           80%+
Security tests:                  100% (all security features)
```

### Test Quality Metrics
```
Placeholder tests:               0 (currently ~15)
Flaky tests:                     <1% (currently unknown)
Test execution time:             <30 seconds (parallel)
Coverage threshold enforcement:  YES
Mock depth:                      Deep (>80% of real behavior)
```

### Documentation
```
Each test file has:
✓ Clear describe() groups
✓ Meaningful test names
✓ Setup/teardown comments
✓ Mock explanation
✓ Expected behavior in assertions
```
