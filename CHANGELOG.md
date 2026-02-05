# Changelog

All notable changes to Sven are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.2.12] (2025-02-05)

### Fix

- **SCM context menu**: "Diff with External Tool" now works from SCM Changes view
- **File History highlight**: Viewed revision now selected/highlighted when using "Open this revision"
- **Broken command links**: Fix all `command:svn.*` → `command:sven.*` in walkthroughs and welcome messages
- **Welcome messages**: File History pane now correctly describes auto-update behavior
- **Version alignment**: Align `@types/vscode` with `engines.vscode` (fixes CI packaging)

## [0.2.11] (2025-02-04)

### Chore

- Use standard markdown for development notice (Positron compatibility)

## [0.2.10] (2025-02-04)

### Chore

- Exclude `.vscodeignore` from VSIX package (reduces package size)
- Update README badges (CI status, marketplace downloads, license)
- Add active development notice to README

## [0.2.9] (2025-02-04)

### Feature: Blame Line Mapping for Modified Files

- **LCS-based line mapping**: Blame annotations now align with working copy content even when file is modified
- Previously, blame decorations appeared on wrong lines if local changes added/removed lines
- Uses Longest Common Subsequence algorithm to map BASE line numbers to working copy
- Deleted lines: Blame info hidden (no longer exists in working copy)
- Modified lines: Context anchoring preserves blame through content changes

### Changed: Blame Code Quality

- **DRY**: Extract `mapBlameLineNumber()` helper (eliminates 4× duplicate code blocks)
- **DRY**: Move date formatting to shared `util/formatting.ts`
- **Performance**: Add LCS index structures for O(1) lookups (vs O(n) array.find)

## [0.2.8] (2025-02-03)

### Fix: History Filter for Sparse Commits

- **SVN --limit bug**: Text search filters (author/message/path) now search entire history
- Previously, `--limit` restricted commits _searched_, not results returned
- If author had no commits in first 50, filter returned nothing
- Now: Search full history without limit, apply client-side truncation

### Fix: Blame Cache Staleness After External Changes

- **Document version tracking**: Blame cache now validates against VS Code document version
- Previously, blame annotations showed stale line numbers after `svn update` or external changes
- Now: Cache invalidates automatically when document version changes

## [0.2.7] (2025-02-02)

### Fix: Theia IDE Compatibility

- **Bundle iconv-lite**: Direct import instead of dynamic require from VS Code's node_modules
- Fixes "Missing dependency: iconv-lite" error in Theia IDE and other VS Code forks

## [0.2.6] (2025-02-02)

### Performance: File Watcher CPU Optimization

- **Increased throttle delay**: 100ms → 300ms for file watcher events (3x reduction in callback overhead)
- **Bulk operation guard**: Skip file watcher during Update/SwitchBranch/Merge operations (zero watcher overhead during bulk ops)

## [0.2.5] (2025-01-29)

### Fix: Antigravity IDE Compatibility

- **Engine downgrade**: vscode ^1.104.0 for Antigravity IDE support

## [Unreleased]

### Test: E2E Integration Tests

- **New test suites**: 28 integration tests for real SVN operations
- **Test helpers**: `svnTestRepo.ts` for temp repo creation/teardown
- **Parser coverage**: Real SVN output for info, status, log, blame parsers
- **Scenarios**: File lifecycle, changelists, branches, conflicts
- **CI compatible**: All tests run on GitHub CI (Ubuntu, Windows, macOS)

## [0.2.4] (2025-12-30)

### Performance: Memory Leaks & File Watcher

- **Fixed config listener leak**: `authConfigDisposable` now cleaned up on deactivation
- **Cache cleanup**: Repository.dispose() clears needsLock/eol/mime/lock caches
- **Narrowed file watcher**: Changed from `**` to `**/.svn/{wc.db,entries}` for repo discovery
- **Deduplicated code**: Removed duplicate `getParentFolderStatus()` in decorator (-13 lines)

## [0.2.3] (2025-12-26)

### Refactor: Property Operations Consolidation

- **Auto-props**: `getAutoProps()`, `setAutoProps()`, `removeAutoProps()` now use generic property methods
- **Ignore patterns**: New `modifyIgnorePatterns()` helper for read-modify-write operations
- **Code organization**: Added section comments for property method groups
- **DRYer code**: 11 property methods now share core `getProperty/setProperty/deleteProperty`

## [0.2.2] (2025-12-26)

### Refactor: exec/execBuffer Consolidation

- **New private method**: `executeProcess()` handles auth, spawning, timeout, cancellation
- **Reduced duplication**: `exec()` and `execBuffer()` now share core process logic
- **Line reduction**: svn.ts reduced from 716 to 565 lines (-151 lines, -21%)

## [0.2.1] (2025-12-26)

### Refactor: DRY Command Helpers

- **New helpers in Command base**: `filterResources()`, `toUris()`, `toPaths()`, `resourcesToPaths()`
- **Reduced duplication**: Stage, Unstage, Revert, Commit commands use shared helpers
- **Type safety**: `filterResources()` uses type guard instead of unsafe cast

## [0.2.0] (2025-12-25)

### UX: User-Friendly Command Names (P1.1)

- **SVN jargon mapped**: EOL→"Line Ending", MIME→"File Type", Blame→"Annotations", Changelist→"Change Group"
- **Ellipsis added**: Dialog-opening commands now end with "..." (Merge..., Switch Branch..., Search History...)
- **Consistent naming**: "Set Line Ending Style (EOL)...", "Show Annotations (Blame)", "Go to Your Version (BASE)"
- **Terminology module**: `src/constants/terminology.ts` provides humanize() helper for consistent naming

### UX: Terminology Glossary (P1.2)

- **New command**: "SVN: Show Terminology Help..." opens quick-pick with 12 glossary entries
- **Core concepts**: BASE, HEAD, PREV, Working Copy, Revision, Lock, Annotations (Blame)
- **Searchable**: matchOnDetail enabled - search by term or definition

### UX: Streamlined Commit Flow (P2.1)

- **2-step flow**: File selection → Message input (with `conventionalCommits: false`)
- **Step indicators**: Added "(1/2)", "(2/2)" to QuickPick titles for clarity
- **Settings-based**: Pre-commit update controlled by `sven.commit.autoUpdate` (not modals)
- **Inline validation**: Empty message shows error in InputBox, not modal dialog

### UX: Unified Property Management (P2.2)

- **New command**: "SVN: Manage Properties..." opens quick-pick with 5 categories
- **Categories**: Line Endings (EOL), File Types (MIME), Auto-Properties, Ignore Patterns, Lock Settings
- **Consolidates**: 6+ property commands into single entry point

### Docs: Design System (P3.1)

- **New doc**: `docs/DESIGN_SYSTEM.md` documents visual patterns
- **Color palette**: gitDecoration mappings, lock colors, revision badges
- **Badge system**: Single-char (A/M/D/C), dual-char (B/S), folder prefixes (📁A)
- **Dialog patterns**: When modal vs inline, QuickPick step indicators
- **Terminology conventions**: SVN jargon → user-friendly mappings

### UX: Actionable Error Buttons

- **Auth errors**: "Clear Credentials" button for E170001, E215004
- **Network errors**: "Retry" button for E170013, E175002 (auto-retries operation)
- **Lock conflicts**: "Steal Lock" button for E200035 (file locked by other)
- **Lock missing/expired**: "Lock File" button for E200036, E200041
- **Permission errors**: "Show Output" button for E261001, E261002, E250006
- **Error priority**: Auth > Cleanup > Update > Conflict > Lock > Network > Output

### UX: Less Intrusive Dialogs

- **Commit message**: Inline validation warning (yellow box) when empty, non-modal confirmation
- **Resolve conflict**: Non-modal confirmation instead of blocking modal
- **Pre-commit conflicts**: Non-modal warning instead of blocking modal

### UX: Auto-Onboarding

- **First repo open**: Shows "Quick Tour" / "Dismiss" prompt when user opens first SVN repository
- **Walkthrough**: Opens "Getting Started with SVN" walkthrough if user clicks "Quick Tour"
- **Once per install**: Uses globalState to show only once, not per session

## [0.1.9] (2025-12-23)

### Feature: SVN Property Management (eol-style, mime-type, auto-props)

- **Set EOL Style**: Set svn:eol-style (native/LF/CRLF/CR) on files/folders with recursive option
- **Remove EOL Style**: Remove svn:eol-style from files/folders
- **Manage EOL Styles**: View all files with eol-style, bulk change or clear
- **Set MIME Type**: Set svn:mime-type with auto-detection from file extension
- **Remove MIME Type**: Remove svn:mime-type from files
- **Manage Auto-Props**: Edit/view/remove svn:auto-props on repository root with default template
- **Context menu**: "Properties" submenu in Explorer and SCM views
- **Explorer tooltips**: Hover files to see eol-style and mime-type properties (e.g., "eol: native, mime: text/plain")

## [0.1.8] (2025-12-21)

### UX: Needs-Lock Status Bar

- **Status bar**: Shows `$(unlock) N` when N files have svn:needs-lock property
- **Click**: Opens "Manage Needs-Lock" QuickPick to view/remove needs-lock files
- **Removed**: "L" badge from file decorations (moved to status bar for cleaner UI)
- **New badge**: "PM" for files with both content and property changes (was just "M")

## [0.1.7] (2025-12-21)

### UX: Context Menu Harmonization

- **Consistent naming**: Removed "with SVN" / "from SVN" suffixes (context is clear)
- **Reorganized groups**: Explorer menu items now align with SCM menu structure
- **Removed**: "Revert" from Explorer context (use SCM view - can't detect modified files in Explorer)

### UX: Untracked vs Deleted Clarity

- **Badge**: "U" for untracked (file kept), "D" for deleted (file removed)
- **Strikethrough**: Only for truly deleted files
- **Tooltip**: "Untracked: Removed from SVN (file kept locally)" vs "Deleted: File will be removed"

## [0.1.6] (2025-12-21)

### Feature: Untrack Command

- **Renamed**: "Remove" → "Untrack" for clearer intent (always keeps local files)
- **Explorer**: Right-click → "Untrack from SVN" in Explorer context menu
- **Folders**: Confirmation prompt before untracking folders recursively
- **Ignore prompt**: Offer to add to svn:ignore after untracking

## [0.1.5] (2025-12-21)

### Feature: Watch Files for Remote Changes

- **New**: Watch files/folders for remote change notifications
- **Commands**: "Toggle Watch" and "Manage Watches" in Command Palette and context menu
- **Status bar**: Shows `$(eye) N` when watching N items
- **Notifications**: Modal alert when watched files have remote changes
- **Folder watch**: Watching a folder includes all descendants
- **Persistence**: Watches stored in workspace state across restarts
- **Auto-clear**: Pending state cleared after running Update command

## [0.1.4] (2025-12-20)

### Performance: Stat Cache

- **Issue**: Repeated `svn list` calls when viewing file history (5-6x for same file)
- **Fix**: Cache stat() results for 1 minute with request deduplication
- **Invalidation**: Cache cleared on repository changes (commit/update)
- **Impact**: Significantly reduces redundant SVN commands

## [0.1.3] (2025-12-20)

### Feature: Beyond Compare Auto-Integration

- **New**: Set `sven.diff.tool` to `"beyondcompare"` for automatic CSV Table Compare
- **How**: Extension auto-detects BC installation and generates wrapper script
- **CSV**: CSV files open in Table Compare view automatically
- **Location**: Script generated in extension's globalStorageUri

## [0.1.2] (2025-12-20)

### Fix: Repository Disposal on External Files

- **Bug**: Opening files outside workspace (e.g., Beyond Compare configs) caused SVN repo to disappear
- **Root cause**: BlameProvider ran SVN commands on external files → NotASvnRepository error → repo disposed
- **Fix**: Add `isDescendant` checks in BlameProvider before any SVN operations
- **Bonus**: Re-assert context on editor switch (keeps SCM view visible)

## [0.1.1] (2025-12-20)

### Fix: Double-Activation Errors

- **Root cause**: Having old extension (svn-scm) installed alongside new one (sven) causes duplicate registrations
- **Solution**: Uninstall old extension
- **Warnings**: Downgrade SvnFileSystemProvider registration errors to warnings (graceful handling)
- **New command**: `SVN: Clear SVN Path Cache` - clears cached SVN executable location

## [0.1.0] (2025-12-18)

### Rebrand: Sven

- **New identity**: Extension rebranded from "sven" to "Sven"
- **New icon**: Updated extension icon
- **Command prefix**: Changed from `svn.*` to `sven.*`
- **Settings prefix**: Changed from `svn.*` to `sven.*`

---

## Pre-Rebrand History

For changes prior to v0.1.0 (the rebrand from svn-scm to Sven), see [CHANGELOG_LEGACY.md](docs/archive/CHANGELOG_LEGACY.md).
