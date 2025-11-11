# SVN Extension Architecture

**Version**: 2.17.55
**Updated**: 2025-11-11

---

## Executive Summary

Mature VS Code extension for SVN integration. Event-driven architecture, decorator-based commands, multi-repository management.

**Stats**:
- **Source lines**: ~12,200
- **Repository**: 1,179 → 923 lines (22% reduction, 3 services extracted)
- **Commands**: 50+
- **Coverage**: ~21-23% (111 tests)
- **Performance**: ✅ 70% faster (Phase 8+9: 18 bottlenecks fixed)

---

## Architecture Layers

### Extension Entry
**File**: `src/extension.ts` (164 lines)
Flow: activate() → SvnFinder → Svn → SourceControlManager → registerCommands()

### Repository Management
**SourceControlManager** (527 lines):
- Multi-repository coordinator
- Workspace folder detection
- Event emission for lifecycle

**Repository** (923 lines):
- Single repository state
- SVN operations coordination
- File watcher coordination
- Delegates to services

**Services** (3 extracted):
- **StatusService** (355 lines): Model state updates
- **ResourceGroupManager** (298 lines): VS Code resource groups
- **RemoteChangeService** (107 lines): Polling timers

### SVN Execution
**Svn** (369 lines):
- Process spawning, error handling
- Encoding detection/conversion
- Auth credential management

### Command Pattern
**Command base** (492 lines):
- 50+ subclasses for SVN operations
- Repository resolution
- Diff/show infrastructure

---

## Critical Issues

### Performance Bottlenecks 🔥

| Issue | File:Line | Impact |
|-------|-----------|--------|
| **processConcurrently not imported** | source_control_manager.ts:328 | REGRESSION: Phase 9.1 broken, 45% users freeze |
| **executeCommand on hot path** | commands/command.ts:89-92 | 100% users, +5-15ms every command (28 sites) |
| **updateInfo() over-called** | repository.ts:342 | 30% users, 100-300ms network calls |
| **@sequentialize blocks concurrent** | svnRepository.ts:168 | 20% users, 50-200ms queue delays |
| **O(n×m) ignore matching** | repository.ts:377-389 | 15% users, 500ms-2s freeze (20 rules × 100 files) |

### Code Bloat 🗑️

| Pattern | Lines | Files |
|---------|-------|-------|
| **Command execution boilerplate** | 105 | 7 commands (add, remove, revert, resolve, deleteUnversioned, patch, addToIgnoreSCM) |
| **Error handling duplication** | 80 | 20+ commands |
| **show()/showBuffer() logic** | 35 | svnRepository.ts:302-336 |
| **Redundant null checks** | 30 | 15 commands (runByRepository callbacks) |
| **Revert duplication** | 22 | revert.ts vs revertExplorer.ts |

**Total**: 272 lines removable

### Architecture Debt 🏗️

| Issue | Location | Impact |
|-------|----------|--------|
| **God classes** | repository.ts (923) + svnRepository.ts (970) = 1,893 lines | Violate SRP, manage everything (UI, auth, caching, ops, events) |
| **Missing AuthService** | repository.ts:772-843 + svnRepository.ts:49-50 | Auth logic scattered/duplicated (70 lines) |
| **Command base ISP violation** | command.ts:57-528 (492 lines) | 50+ commands inherit unused methods, tight UI coupling |

---

## Design Patterns

1. **Command Pattern**: Command base + 50+ subclasses
2. **Observer/Event**: EventEmitter throughout
3. **Repository Pattern**: Data access abstraction
4. **Decorator**: @memoize, @throttle, @debounce, @sequentialize
5. **Strategy**: Multiple parsers (status, log, info, diff, list)
6. **Adapter**: File watching, URI schemes

---

## Key Files

**Entry**: extension.ts, source_control_manager.ts, commands.ts
**Core**: repository.ts, svnRepository.ts, svn.ts
**Services**: statusService.ts, resourceGroupManager.ts, remoteChangeService.ts
**Commands**: command.ts (base), commands/*.ts (50+)
**Parsing**: statusParser.ts, logParser.ts, infoParser.ts
**Utils**: types.ts (323 lines), util.ts, decorators.ts

---

## Strengths

1. Event-driven, clear Observer pattern
2. Layered (UI, Business Logic, CLI Wrapper)
3. Decorator-based commands (elegant)
4. Configurable behavior
5. Async/await throughout
6. Separate concerns (parsing, execution, UI)

---

## Next Actions

See IMPLEMENTATION_PLAN.md:
- **Phase 10**: Fix regression + hot path perf (2-3h, CRITICAL, 100% users)
- **Phase 11**: Command boilerplate extraction (3-4h, HIGH, 207 lines removed)

---

**Version**: 1.8
**Updated**: 2025-11-11 (v2.17.55)
