# Changelog

All notable changes to Sven are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.2.33] - 2026-04-15

### Fixed

- **Security**: `--password-from-stdin` was dead code for SVN ≥1.10 — missing else branch silently dropped passwords
- **Error logging**: Bare `catch {}` blocks in property cache now log errors instead of swallowing silently
- **Floating promise**: `saveAuth()` in retryRun now has explicit error handling
- **Type safety**: Removed `as any` cast in checkout depth picker

### Performance

- Pre-compiled error code regexes (avoid 22 RegExp allocations per error)
- Cached `semver.gte` version check (avoid per-spawn comparison)
- Cached 4 config reads in `updateModelState` hot path
- `refreshAllPropertyCaches` no longer blocks status update
- Added jitter to multi-repo poll timers (prevents simultaneous bursts)
- StatusService config cache filtered to relevant keys only
- Extracted shared `CredentialMode` type to `src/common/credentialMode.ts`

### Refactored

- Consolidated 9 command files into 4 (reveal, ignore, patch, commit)

## [0.2.32] - 2026-04-15

### Changed

- **Startup perf**: Merged duplicate `svn info` calls — pass parsed info from discovery to constructor (8→2 calls to first paint)
- **Startup perf**: Combined 3 separate `svn propget` calls into single `svn proplist -R -v .`
- **Startup perf**: Deferred proplist and remote check until after initial status renders
- **File-open perf**: In-flight dedup for `svn cat` — concurrent calls for same file+revision share one process
- **File-open perf**: Deduplicated `svn log` and `svn stat` calls on file open via debounce coalescing
- **File-open perf**: All property refreshes now use combined `svn proplist` instead of individual `svn propget` calls

### Fixed

- **Encoding**: Restored byte-sniff encoding detection for non-UTF-8 files not open in editor
- **TOCTOU race**: `pendingOpenPaths` guard now blocks before async `isSvnFolder` check
- **Cache correctness**: `cacheWarmed` flag prevents empty cache from being treated as valid during startup grace period

## [0.2.31] - 2026-04-14

### Changed

- **Needs-lock perf**: Expired cache now refreshes via single batch `svn propget -R` instead of spawning per-file propget calls
- **Pre-commit update perf**: Skip remote check for targeted updates — one fewer network round-trip
- **Pre-commit update perf**: Filter out unversioned/added files — skip update entirely when committing only new files
- **Pre-commit update reliability**: Remove fallback to full update — targeted failures surface cleanly instead of pulling unrelated changes

## [0.2.30] - 2026-04-11

### Changed

- **Commit workflow perf**: Pre-commit update targets only committed files (`svn update --parents <files>`), falls back to full update on benign failures
- **Commit workflow perf**: Pre-commit update runs in parallel with commit message input — user types while update downloads
- **Commit workflow reliability**: Auth/credential errors re-thrown instead of silently retried via fallback; cancellation properly detected in all code paths

## [0.2.29] - 2026-04-11

### Added

- **E2E integration tests**: 28 integration tests for real SVN operations (file lifecycle, changelists, branches, conflicts)
- **Test helpers**: `svnTestRepo.ts` for temp repo creation/teardown
- **Parser coverage**: Real SVN output for info, status, log, blame parsers
- **CI compatible**: All integration tests run on GitHub CI (Ubuntu, Windows, macOS)

### Fixed

- **Walkthrough accuracy**: All 14 walkthrough docs corrected — wrong command titles, non-existent settings, click vs right-click descriptions, `svn.` → `sven.` prefix

## [0.2.28] - 2026-04-07

### Added

- **Custom commit types**: New `sven.commit.types` setting — define your own commit types with icons and descriptions. No hardcoded types; empty by default. Type picker appears only when types are configured.

### Changed

- **Commit workflow perf**: Reuse cached remote-check result from background polling — skips redundant `svn log` network call when fresh
- **Commit workflow perf**: Parallel needs-lock checks — `Promise.all` instead of sequential `await` loop
- **Commit workflow perf**: Deduplicate post-commit history fetches — `updateRevision` called from `commitFiles` no longer fires its own `repolog.fetch`/`itemlog.refresh`
- **Commit workflow perf**: Parallelize history fetch + info refresh after commit with `Promise.all`
- **Commit workflow UX**: Post-commit update is now cancellable (kills SVN process via CancellationToken)
- **Status call perf**: `--show-updates` (network-hitting) now only added for remote checks and lock/unlock operations — file-watcher-triggered status refreshes stay local-only
- **Commit UX**: Quick-pick titles show message format preview at every step

### Removed

- **`sven.commit.conventionalCommits`** setting — behavior now derived from whether `sven.commit.types` is populated

### Fixed

- **`@types/vscode`**: Bumped to `~1.108.0` to match `engines.vscode ^1.108.0`

---

## [0.2.27] - 2026-03-26

### Added

- **Server-only commit color**: Commits above BASE in repo history now show in green (configurable via `sven.decorator.serverOnlyColor`) instead of being dimmed/invisible on dark backgrounds

---

## [0.2.26] - 2026-03-26

### Fixed

- **Cleanup error detection**: E155015 (conflict) no longer falsely triggers "Run Cleanup" — correctly routes to conflict resolution
- **Cleanup cache**: All cleanup operations now invalidate status cache — UI reflects actual state after cleanup
- **Error action buttons**: Explorer context menu errors now show full action button chain (cleanup, update, resolve, etc.) instead of plain error messages
- **Cleanup auto-retry**: Retries on E155004 (locked) in addition to E155037, and checks raw stderr for multi-code errors
- **Auto-retry error context**: Intermediate cleanup failure is logged and original error rethrown for clearer messaging
- **hasBlockedWord regex**: Was matching "locked" (false positives on lock errors) instead of "blocked" — one-char regex fix
- **Cleanup UI refresh**: Added `Operation.CleanUp` to `forceRefresh` list so UI actually refreshes after cleanup
- **Error sanitization**: Cleanup catch block now sanitizes error messages before display
- **Misclassified tokens**: Removed E155005 (WC not locked) and E155010 (path not found) from cleanup tokens
- **Format token drift**: `FORMAT_CLEANUP_TOKENS` now derived from `CLEANUP_ERROR_TOKENS` to prevent divergence
- **Cleanup retry**: Retry dialog is now properly awaited with max 3 retries before terminal fallback

## [0.2.25] - 2026-03-26

### Fixed

- **Selective download panel**: Use natural/numeric sort for directory and file names — `dos1, dos2, dos3, ..., dos10` instead of `dos1, dos10, dos2` ([#117](https://github.com/vrognas/sven/issues/117))

## [0.2.24] - 2026-03-04

### Fixed

- **Repo history readability**: Remove foreground color from server-only (S) commit decorations — `FileDecoration.color` was coloring entire label text, making commits above BASE unreadable on dark themes
- Remove `sven.decorator.serverColor` setting (no longer needed; S badge still appears without text color override)

## [0.2.23] - 2026-02-07

### Fixed

- Deflake Windows unit CI in legacy E2E suites by switching from `setup(...this.skip())` to per-test `testIfReady(...)` guards, preventing fixture access when suite preflight fails.

## [0.2.22] - 2026-02-07

### Fixed

- Deflake legacy E2E suites on Windows CI by replacing `suiteSetup`-only skip flow with `suiteReady` gating in `commands`, `repository`, `phase10`, and `svn` suites.
- Deflake `svnFinder` E2E assertions by skipping binary-dependent tests when `svn` is unavailable.
- Deflake `remoteChangeService` callback-error test by awaiting explicit second-poll signal with bounded timeout instead of fixed sleep.

## [0.2.21] - 2026-02-07

### Fixed

- Fix CI-only unhandled rejection in `phase10` suite by adding teardown settle delay before temp repo removal (`Failed to execute svn` from in-flight background status poll).

## [0.2.20] - 2026-02-07

### Fixed

- Fix Linux/macOS `svnAuthCache` cross-platform assertion flake by validating stable cache-dir suffix/absolute path instead of mocked-home prefix.

## [0.2.19] - 2026-02-07

### Fixed

- Fix cross-platform unit failures: use canonical SVN auth cache path (`auth/svn.simple`) and reject Windows-absolute path forms in `validateFilePath` on all platforms.
- Harden SCM input-box setup to tolerate proposal-gated properties in stable VS Code hosts.
- Stabilize VS Code harness activation with explicit binary/command preflight checks and actionable spawn failures.
- Stabilize path/auth/svn-finder suites and narrow `.vscode-test.mjs` to stable E2E targets.

## [0.2.18] - 2026-02-07

### Fixed

- Resolve TypeScript fail set in command, blame, security, and harness suites.
- Restore sinon stub compatibility for `child_process`/`fs.watch` mocking under Vitest.
- Make `npm test` cross-platform by replacing POSIX-only CI shell check with Node runtime check.

## [0.2.17] - 2026-02-07

### Added

- Expand blame fail-cluster tests (`blameProvider`) for lifecycle, event, mapping, and fallback branches.
- Expand security sanitizer tests (debug timeout flow + sanitized error log extraction).
- `src/blame/blameProvider.ts`: ~85% → ~96% lines.
- `src/security/errorSanitizer.ts`: ~37% → ~97% lines.
- Global `src/**` coverage increased to ~47-48% range.

## [0.2.16] - 2026-02-07

### Fixed

- Harden validation against decoded path traversal and encoded URL path metacharacters.
- Support root-stripped XML shapes in diff/list parsers.
- Correct changelist repository resolution when `null` repositories are returned.

### Changed

- Modernize legacy Vitest suites to ESM-safe mocking and current command/parser behavior.
- Stabilize cross-platform/path-sensitive tests (ResourceGroupManager, add/addRemove, prompt, auth cache, svnRepository).

## [0.2.15] - 2026-02-07

### Fixed

- Mock VS Code command registry now supports `thisArg` binding, matching real `registerCommand` behavior.
- `SwitchBranch` now accepts relative branch paths from branch picker; absolute URLs still validated.
- Base command resource selection now tolerates undefined entries instead of throwing.

### Added

- Modernize command e2e commit tests for staged/quick-commit flow.
- Add mock harness tests for config defaults, command binding, and `workspace.textDocuments` tracking.

## [0.2.14] - 2026-02-07

### Added

- Modernize legacy Mocha-style suites for Vitest (`vi.spyOn` over ESM export reassignment) in checkout/ignore/open command tests.
- Add Mocha-compat harness coverage (done callback, `this.timeout`, sync+async `this.skip`).
- Expand VS Code test mock for command registry and missing workspace/window/scm APIs used by legacy suites.

### Changed

- Increase unit test and hook timeout defaults for legacy suite parity (`60s`).

## [0.2.13] - 2026-02-07

### Changed

- Consolidate shared command helpers across stage/unstage/revert/changelist/pull/copy-path/commit/reveal/property/lock flows to reduce duplication.
- Extract reusable command error utilities for more consistent command execution and error handling.
- Add local agent and launch setup for contributor workflows.

### Fixed

- **Lock action ordering**: Prioritize explicit lock actions before cleanup fallback to avoid incorrect lock handling.
- **Lint script scope**: Restrict lint scripts to TypeScript paths to avoid hangs on bundled JavaScript output.

## [0.2.12] - 2025-02-05

### Fixed

- **SCM context menu**: "Diff with External Tool" now works from SCM Changes view
- **File History highlight**: Viewed revision now selected/highlighted when using "Open this revision"
- **Broken command links**: Fix all `command:svn.*` → `command:sven.*` in walkthroughs and welcome messages
- **Welcome messages**: File History pane now correctly describes auto-update behavior
- **Version alignment**: Align `@types/vscode` with `engines.vscode` (fixes CI packaging)

## [0.2.11] - 2025-02-04

### Changed

- Use standard markdown for development notice (Positron compatibility)

## [0.2.10] - 2025-02-04

### Changed

- Exclude `.vscodeignore` from VSIX package (reduces package size)
- Update README badges (CI status, marketplace downloads, license)
- Add active development notice to README

## [0.2.9] - 2025-02-04

### Added

- **Blame line mapping for modified files**: LCS-based line mapping — blame annotations now align with working copy content even when file is modified. Uses Longest Common Subsequence algorithm to map BASE line numbers to working copy.

### Changed

- **DRY**: Extract `mapBlameLineNumber()` helper (eliminates 4x duplicate code blocks)
- **DRY**: Move date formatting to shared `util/formatting.ts`
- **Performance**: Add LCS index structures for O(1) lookups (vs O(n) array.find)

## [0.2.8] - 2025-02-03

### Fixed

- **History filter for sparse commits**: Text search filters (author/message/path) now search entire history. Previously, `--limit` restricted commits _searched_, not results returned.
- **Blame cache staleness after external changes**: Blame cache now validates against VS Code document version. Cache invalidates automatically when document version changes.

## [0.2.7] - 2025-02-02

### Fixed

- **Theia IDE compatibility**: Bundle iconv-lite directly instead of dynamic require from VS Code's node_modules.

## [0.2.6] - 2025-02-02

### Changed

- **File watcher CPU optimization**: Increased throttle delay 100ms → 300ms (3x reduction in callback overhead). Skip file watcher during Update/SwitchBranch/Merge operations.

## [0.2.5] - 2025-01-29

### Fixed

- **Antigravity IDE compatibility**: Engine downgrade to vscode ^1.104.0.

## [0.2.4] - 2025-12-30

### Fixed

- **Config listener leak**: `authConfigDisposable` now cleaned up on deactivation
- **Cache cleanup**: Repository.dispose() clears needsLock/eol/mime/lock caches
- **Narrowed file watcher**: Changed from `**` to `**/.svn/{wc.db,entries}` for repo discovery
- **Deduplicated code**: Removed duplicate `getParentFolderStatus()` in decorator (-13 lines)

## [0.2.3] - 2025-12-26

### Changed

- **Property operations consolidation**: Auto-props and ignore patterns now use generic property methods. 11 property methods share core `getProperty/setProperty/deleteProperty`.

## [0.2.2] - 2025-12-26

### Changed

- **exec/execBuffer consolidation**: New private `executeProcess()` handles auth, spawning, timeout, cancellation. svn.ts reduced from 716 to 565 lines (-21%).

## [0.2.1] - 2025-12-26

### Changed

- **DRY command helpers**: New helpers in Command base (`filterResources()`, `toUris()`, `toPaths()`, `resourcesToPaths()`). Stage, Unstage, Revert, Commit commands use shared helpers.

## [0.2.0] - 2025-12-25

### Added

- **User-friendly command names**: SVN jargon mapped to plain language (EOL → "Line Ending", Blame → "Annotations", etc.)
- **Terminology glossary**: New command "SVN: Show Terminology Help..." with 12 searchable entries
- **Streamlined commit flow**: 2-step flow with file selection, step indicators, inline validation
- **Unified property management**: "SVN: Manage Properties..." consolidates 6+ commands
- **Design system docs**: `docs/DESIGN_SYSTEM.md` documents visual patterns, colors, badges
- **Actionable error buttons**: Auth, network, lock, cleanup errors now show contextual action buttons
- **Auto-onboarding**: First repo open shows "Quick Tour" prompt with walkthrough

### Changed

- **Less intrusive dialogs**: Commit message, resolve conflict, pre-commit conflicts use non-modal confirmations

## [0.1.9] - 2025-12-23

### Added

- **SVN property management**: Set/remove EOL style, MIME type, auto-props on files/folders
- **Context menu**: "Properties" submenu in Explorer and SCM views
- **Explorer tooltips**: Hover files to see eol-style and mime-type properties

## [0.1.8] - 2025-12-21

### Added

- **Needs-lock status bar**: Shows `$(unlock) N` when N files have svn:needs-lock property with click to manage
- **PM badge**: Files with both content and property changes show "PM" instead of "M"

## [0.1.7] - 2025-12-21

### Changed

- **Context menu harmonization**: Removed "with SVN"/"from SVN" suffixes, reorganized Explorer menu groups
- **Untracked vs deleted clarity**: "U" badge for untracked (file kept), "D" for deleted (file removed), strikethrough only for truly deleted

## [0.1.6] - 2025-12-21

### Added

- **Untrack command**: Renamed "Remove" → "Untrack" for clearer intent. Explorer context menu, folder support with confirmation, offer to add to svn:ignore after untracking.

## [0.1.5] - 2025-12-21

### Added

- **Watch files for remote changes**: Watch files/folders for remote change notifications. Status bar indicator, modal alerts, folder watch includes descendants, persistent across restarts.

## [0.1.4] - 2025-12-20

### Changed

- **Stat cache**: Cache stat() results for 1 minute with request deduplication. Cleared on repository changes (commit/update). Reduces redundant SVN commands.

## [0.1.3] - 2025-12-20

### Added

- **Beyond Compare auto-integration**: Set `sven.diff.tool` to `"beyondcompare"` for automatic CSV Table Compare. Auto-detects BC installation and generates wrapper script.

## [0.1.2] - 2025-12-20

### Fixed

- **Repository disposal on external files**: Opening files outside workspace (e.g., Beyond Compare configs) no longer causes SVN repo to disappear. Add `isDescendant` checks in BlameProvider.

## [0.1.1] - 2025-12-20

### Fixed

- **Double-activation errors**: Downgrade SvnFileSystemProvider registration errors to warnings. New command: `SVN: Clear SVN Path Cache`.

## [0.1.0] - 2025-12-18

### Changed

- **Rebrand to Sven**: Extension rebranded, new icon, command prefix `svn.*` → `sven.*`, settings prefix `svn.*` → `sven.*`

---

## Pre-Rebrand History

For changes prior to v0.1.0 (the rebrand from svn-scm to Sven), see [CHANGELOG_LEGACY.md](docs/archive/CHANGELOG_LEGACY.md).
