# AI Development Instructions

## Documentation Structure

**This file**: AI behavior and development guidelines
**Related**: ARCHITECTURE_ANALYSIS.md, DEV_WORKFLOW.md, LESSONS_LEARNED.md, SECURITY.md, PERFORMANCE_BASELINE.md

Review all after each commit to keep current.

## Core Behavioral Rules

- Extremely concise, sacrifice grammar for concision
- TDD: Write/review tests before implementation (~3 end-to-end tests per feature)
- Commit often with small focused commits
- Update version and changelog with every commit
- Review CLAUDE.md, ARCHITECTURE_ANALYSIS.md, DEV_WORKFLOW.md, LESSONS_LEARNED.md after commits
- Tool call limits: Simple ≤5, complex ≤15

## Build & Test

```bash
npm run build       # TypeScript + CSS
npm run build:ts    # TypeScript only (faster)
npm run package     # Create VSIX
npm run compile     # Watch mode
npm test            # Run tests
```

**Type safety**: Strict mode enabled. All code passes strict TypeScript checks.

## Testing Guidelines

- Minimalist tests (~3 per feature)
- Prefer end-to-end over unit tests
- Test security validators (validateRevision, validateFilePath, validateUrl)
- Current coverage: <10% (target: 50%+)

## Quality Standards

**Type Safety**:
- ✅ Strict mode, 0 `any` types
- Error handling uses ISvnErrorData
- No type assertions without validation

**Security**:
- ✅ Phase 4.5 complete (validators applied, credentials secured, TOCTOU fixed)
- Use validateRevision() for revisions (command injection prevention)
- Use validateFilePath() for file ops (path traversal prevention)
- Use validateUrl() for URLs (SSRF prevention)
- Credentials via --password-from-stdin (SVN 1.9+)
- See SECURITY.md

**Performance**:
- Baselines in PERFORMANCE_BASELINE.md
- Activation <200ms, Commands <500ms, Status <1s, Load <3s

## Project Status

**Version**: 2.17.28
**Phase**: Phase 2 prerequisites complete

**Completed**:
- ✅ Phase 1: Build modernization (webpack→tsc), strict types
- ✅ Phase 4.5: Security hardening complete
- ✅ Phase 2 prereqs: Async constructor fix, performance baseline, CommandArgs types

**Next**: Repository refactoring (1,179 lines → focused services)

## Architecture

**Full details**: ARCHITECTURE_ANALYSIS.md (directory structure, design patterns, technical debt)

### Core Flow
```
extension.ts → SourceControlManager → Repository → Svn (CLI)
                     ↓                     ↓
              Multi-repo mgr        Status/ResourceGroups
```

### Components

**Extension Entry** (`src/extension.ts`):
- Init SVN finder, create Svn instance with path/version
- Create SourceControlManager
- Register commands and providers

**SVN Wrapper** (`src/svn.ts`):
- CLI wrapper with encoding detection/conversion
- Child process execution
- Auth credential management

**Source Control Manager** (`src/source_control_manager.ts`):
- Multi-repository coordinator
- Workspace discovery
- Repository lifecycle (open/close)
- Handles externals

**Repository** (`src/repository.ts`):
- Single SVN working copy (1,179 lines - refactor target)
- Resource groups: changes, unversioned, conflicts, changelists, remotechanges
- Operations via `run()` for progress tracking
- Remote change detection, status bar
- Auth via VS Code SecretStorage API

**Base Repository** (`src/svnRepository.ts`):
- Lower-level SVN operations (970 lines)
- Direct command execution (status, commit, update, etc.)
- SVN output parsing

### Command Pattern

Commands in `src/commands/`, registered via `src/commands.ts`:
- Each extends base `Command` class
- Use `getSourceControlManager()` to access repos
- Wrap ops in `repository.run()` for tracking

### Resource Groups

VS Code SCM UI groups:
- **changes**: Modified files
- **unversioned**: Untracked files
- **conflicts**: Merge conflicts
- **changelists**: User-defined groups
- **remotechanges**: Remote server changes

### Parsers

`src/parser/`:
- `statusParser.ts` - svn status
- `logParser.ts` - svn log
- `infoParser.ts` - svn info --xml
- `diffParser.ts` - svn diff

### History Views

`src/historyView/`:
- `repoLogProvider.ts` - Repo log viewer
- `itemLogProvider.ts` - File history
- `branchChangesProvider.ts` - Branch changes

## SVN Requirements

- CLI tools required (TortoiseSVN on Windows with "Command Line Tools")
- Config: `svn.path` setting
- Version contexts: `isSvn18orGreater`, `isSvn19orGreater`

## Authentication

VS Code SecretStorage API (replaced keytar v2.17.0):
- Stored per repository root URL
- Multiple accounts supported
- Auto-retry on auth failure
- User prompts when needed

## Documentation Maintenance

**After each commit, update if needed**:
1. CLAUDE.md - This file
2. ARCHITECTURE_ANALYSIS.md - Architecture, debt, phases
3. DEV_WORKFLOW.md - Build/install workflow
4. LESSONS_LEARNED.md - Implementation lessons
5. SECURITY.md - Security validators
6. PERFORMANCE_BASELINE.md - Performance metrics

## Plans

At end of each plan:
- List unresolved questions (extremely concise)
- Next phase recommendations
- Technical debt impact
