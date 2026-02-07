# SVN Extension Architecture

**Version**: 0.2.21
**Updated**: 2026-02-07

---

## Overview

VS Code extension for SVN source control with Positron IDE support. Event-driven architecture, decorator-based commands, multi-repository management. Zero telemetry, local-only operations.

**Stats**:

- ~13,200 source lines
- 54 commands (+3 blame)
- 1700+ tests, ~50% global coverage
- Targets: vscode ^1.105.0, positron ^2025.11.0

---

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│  Extension Entry (extension.ts)                 │
│  activate() → SvnFinder → Svn → SCM Manager     │
├─────────────────────────────────────────────────┤
│  Source Control Manager                         │
│  Multi-repo coordination, workspace detection   │
├─────────────────────────────────────────────────┤
│  Repository Layer                               │
│  - Repository: Single repo state & coordination │
│  - Services: Status, ResourceGroup, Remote      │
├─────────────────────────────────────────────────┤
│  SVN Execution (svn.ts)                         │
│  Process spawn, encoding, auth management       │
├─────────────────────────────────────────────────┤
│  Command Pattern (command.ts + 54 subclasses)   │
│  Repository resolution, diff/show infrastructure│
└─────────────────────────────────────────────────┘
```

### Key Files

| Layer    | Files                                                             |
| -------- | ----------------------------------------------------------------- |
| Entry    | extension.ts, source_control_manager.ts                           |
| Core     | repository.ts, svnRepository.ts, svn.ts                           |
| Services | StatusService.ts, ResourceGroupManager.ts, RemoteChangeService.ts |
| Commands | command.ts (base), commands/\*.ts (54 total)                      |
| Parsing  | statusParser.ts, logParser.ts, infoParser.ts, blameParser.ts      |
| Blame    | blameConfiguration.ts, blameStateManager.ts, blameProvider.ts     |

---

## Design Patterns

1. **Command Pattern**: Base class + 54+ subclasses with DRY helpers
2. **Observer/Event**: EventEmitter throughout for loose coupling
3. **Decorator**: @memoize, @throttle, @debounce, @sequentialize
4. **Strategy**: Multiple parsers (status, log, info, diff, list)
5. **Adapter**: XML parser abstraction, file watching, URI schemes
6. **Repository**: Data access abstraction per repo

---

## Key Subsystems

### Blame System

Per-file blame tracking with:

- Progressive rendering (10-20x faster)
- Template compilation for status bar/gutter
- Batch log fetching (50x faster)
- LRU cache eviction (MAX_CACHE_SIZE=20)
- Line mapping for modified files (LCS algorithm)

### File Locking (v0.1.0+)

- Commands: lock, unlock, breakLock
- Lock status in tooltips and decorations
- Directory support

### Sparse Checkout (v0.1.0+)

- TreeView in SCM sidebar
- Lazy-loads children via `svn list`
- Depth options: empty, files, immediates, infinity

### Git-like Staging

- Hidden `__staged__` changelist
- Optimistic UI updates (skip status refresh)
- ResourceGroupManager handles group manipulation

---

## Services (Extracted from Repository)

| Service              | Purpose                                    | Lines |
| -------------------- | ------------------------------------------ | ----- |
| StatusService        | Parse SVN status, update model             | ~355  |
| ResourceGroupManager | Manage VS Code resource groups             | ~298  |
| RemoteChangeService  | Background polling timers                  | ~107  |
| CommitFlowService    | Staging & commit orchestration             | ~300  |
| SvnAuthCache         | Credential storage (keyring/SecretStorage) | ~200  |

---

## Performance

All critical bottlenecks fixed:

- **Commit traversal**: O(1) parent lookups, 4-5x faster
- **Descendant resolution**: Single-pass O(n), 3-5x faster
- **Glob matching**: Two-tier simple→complex, 3x faster
- **Batch operations**: Adaptive chunking, 2-3x faster
- **Startup**: Conditional activation + path caching, 1-3s saved

Caching strategy:

- LRU eviction for info, blame, log caches
- Immutable data (SVN logs) = infinite TTL

---

## Security

- Password via stdin (SVN 1.10+)
- XXE protection in XML parser
- Error sanitization (logError utility)
- Zero telemetry, local-only operations
- Debug mode auto-timeout

See SECURITY.md and SECURITY_QUICK_REFERENCE.md for details.

---

## Build & Deploy

```bash
npm run compile    # esbuild + sass
npm run watch      # Watch mode
npm test           # Vitest unit tests
npm run package    # VSCE package
```

Output: dist/extension.js (CJS, minified)
External: vscode, @posit-dev/positron

---

## Strengths

1. Clean separation of concerns (services extracted)
2. Type-safe (strict TypeScript, minimal `any`)
3. Performance optimized (all P0/P1 fixed)
4. Comprehensive testing (930+ tests)
5. Security hardened (sanitization, stdin passwords)
6. Multi-repo support (independent operation queues)

---

## Test Harness Notes

- Vitest runs mixed legacy/new suites through a Mocha-compat setup file.
- Harness now depends on:
  - command registry behavior in the VS Code mock (`registerCommand` + `executeCommand`)
  - `thisArg` binding support in command registration
  - default-backed configuration reads for `workspace.getConfiguration("sven").get(...)`
  - workspace lifecycle event mocks (`onDidSaveTextDocument`, `onDidCloseTextDocument`, etc.)
  - `workspace.textDocuments` tracking for code paths that inspect open documents
  - ESM-safe mocking style in tests (`vi.spyOn` instead of export reassignment)
  - parser fixture parity with adapter defaults (`explicitRoot: false` root-stripped outputs)
  - command helper contract awareness (`runByRepositoryPaths` handles URI→path conversion)
  - suite preflight checks for required binaries and extension command registration before E2E setup
  - explicit stable test file allowlist in `.vscode-test.mjs` for CI-hosted VS Code runs
  - cross-platform path assertions based on invariant suffixes, not runner-specific home directory prefixes
  - teardown settle window before temp-repo deletion for suites with background poll/status tasks
- Coverage runs can intermittently report external flake noise:
  - `remoteChangeService` timing-sensitive poll assertion
  - `phase10` transient `svn` spawn/repository temp path failures

---

## Technical Debt

- Repository.ts still 923 lines (could extract more services)
- 50+ command files (could consolidate by category)
- ~248 `any` types remaining across 25 files
- fs/ wrappers could use fs.promises

---

See also:

- [LESSONS_LEARNED.md](LESSONS_LEARNED.md) - Development patterns
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - UI/UX conventions
- [PERFORMANCE.md](PERFORMANCE.md) - Optimization details
- [BLAME_SYSTEM.md](BLAME_SYSTEM.md) - Blame feature details
