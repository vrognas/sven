# Sven - Subversion for Positron

Positron-optimized SVN extension with Git-like staging, inline blame, file locking, and sparse checkout.

**Original extension:** [JohnstonCode/svn-scm](https://github.com/JohnstonCode/svn-scm)

## Features at a Glance

| Feature | Description |
|---------|-------------|
| **Git-like Staging** | Stage files before commit, partial commits |
| **Inline Blame** | Line-by-line annotations with author, date, message |
| **File Locking** | Lock files for exclusive editing, break/steal locks |
| **Sparse Checkout** | Download only what you need from large repos |
| **Repository History** | Browse commits, filter, compare revisions |
| **Smart Rename/Delete** | Auto-converts Explorer operations to SVN commands |
| **External Diff** | Beyond Compare, Meld, or any diff tool |
| **Positron Integration** | Connections pane, optimized for data science |

## Prerequisites

> This extension uses your machine's SVN installation. [Install SVN](https://subversion.apache.org) first.

**Windows:** If using [TortoiseSVN](https://tortoisesvn.net/), check **Command Line Tools** during install and ensure `C:\Program Files\TortoiseSVN\bin` is in PATH.

## Quick Start

1. **Checkout**: `Ctrl+Shift+P` → `SVN: Checkout` → enter repo URL
2. **Stage files**: Click `+` on changed files
3. **Commit**: `Ctrl+Enter` or click checkmark

---

## Core Features

### Staging Area (Git-like Workflow)

Files must be staged before commit. Uses a hidden SVN changelist (`__staged__`).

| Action | How |
|--------|-----|
| Stage file | `+` button or right-click → Stage |
| Stage all | `+` on Changes header |
| Unstage | `-` button |
| Commit staged | `Ctrl+Enter` or checkmark |

**Settings:**
- `sven.commit.useQuickPick` - Native VS Code commit dialog
- `sven.commit.conventionalCommits` - Conventional commits format
- `sven.commit.autoUpdate` - Run `svn update` before/after commit

### Blame Annotations

View line-by-line revision history directly in the editor.

**Components:**
- **Gutter icons** - Colored revision indicators (left margin)
- **Inline messages** - Author/date at end of line (GitLens-style)
- **Status bar** - Current line's blame info
- **Hover tooltips** - Full commit details

**Commands:**
- `SVN: Toggle Annotations (Blame)` - Toggle on/off
- `SVN: Show Annotations (Blame)` - Enable
- `SVN: Clear Annotations` - Disable

**Settings:**
| Setting | Default | Description |
|---------|---------|-------------|
| `sven.blame.enabled` | `true` | Master toggle |
| `sven.blame.autoBlame` | `true` | Auto-show when opening files |
| `sven.blame.enableLogs` | `true` | Fetch commit messages |
| `sven.blame.gutter.enabled` | `true` | Show gutter icons |
| `sven.blame.gutter.showText` | `true` | Show author/date in gutter |
| `sven.blame.inline.enabled` | `true` | Show inline annotations |
| `sven.blame.inline.currentLineOnly` | `true` | Only current line |
| `sven.blame.inline.showMessage` | `true` | Include commit message |
| `sven.blame.inline.opacity` | `0.5` | Transparency (0.0-1.0) |
| `sven.blame.statusBar.enabled` | `true` | Status bar info |
| `sven.blame.dateFormat` | `relative` | `relative` or `absolute` |
| `sven.blame.largeFileWarning` | `true` | Warn for large files |
| `sven.blame.largeFileLimit` | `5000` | Line threshold for warning |

**Templates** (customize with placeholders):
- `sven.blame.gutter.template` - `"${author}, ${date}"`
- `sven.blame.inline.template` - `"${author}, ${date} • ${message}"`
- `sven.blame.statusBar.template` - `"$(git-commit) ${revision} by ${author}"`

### File Locking

Lock files for exclusive editing. Essential for binary files (CSVs, images, models).

**Commands:**
| Command | Description |
|---------|-------------|
| `SVN: Lock` | Lock selected file(s) |
| `SVN: Unlock` | Release lock |
| `SVN: Break Lock` | Force remove lock (admin) |
| `SVN: Steal Lock` | Take lock from another user |
| `SVN: Toggle Require Lock` | Set/remove `svn:needs-lock` |

**Visual indicators:**
- 🔒 Locked file (hover for owner)
- 🔓 Needs lock but unlocked (read-only)

### Sparse Checkout (Selective Download)

Download only specific folders from large repositories.

**TreeView:** Appears in SCM sidebar as "Selective Download"
- **Local items** - Show depth (Full, Shallow, Files Only, Empty)
- **Ghost items** (☁️) - Not downloaded, click to download

**Commands:**
- `SVN: Download...` - Download folder with depth selection
- `SVN: Remove from Disk` - Exclude folder locally
- `SVN: Set Download Scope (Depth)...` - Change existing folder depth

**Depth options:**
| Depth | Downloads |
|-------|-----------|
| Full (infinity) | Everything recursively |
| Shallow (immediates) | Direct children only |
| Files Only | Files, no subfolders |
| Empty | Folder only, no contents |

**Settings:**
- `sven.sparse.confirmExclude` - Confirm before excluding
- `sven.sparse.largeFileWarningMb` - Warn for large downloads
- `sven.sparse.downloadTimeoutMinutes` - Timeout for downloads

### Repository History

Browse commit history in the Repository History pane.

**Features:**
- Commit list with author, date, message
- File changes per commit (expand to see)
- **B** badge - Your working copy's BASE revision
- Diff view - Click files to see changes

**Toolbar:**
| Button | Action | When to use |
|--------|--------|-------------|
| ↻ Refresh | Redraw UI | Quick update |
| ↓ Fetch | Get new commits | See what's new |
| ↓↓ Pull | Fetch + Update | Get changes locally |

**Commands:**
- `SVN: Go to Revision...` - Jump to specific revision
- `SVN: Filter History...` - Filter by author, date, text
- `SVN: Search History...` - Text search in messages

**Settings:**
- `sven.log.length` - Number of commits (default: 50)
- `sven.log.authorColors` - Colored dots per author

### File & Folder Decorations

**Status badges:**
| Badge | Meaning |
|-------|---------|
| **A** | Added |
| **M** | Modified |
| **D** | Deleted |
| **R** | Renamed/Replaced |
| **C** | Conflicted |
| **U** | Unversioned |
| **!** | Missing |
| **I** | Ignored |

**Lock badges:** 🔒 🔓 🔒M 🔒A

### Smart File Operations

**Rename:** Explorer rename → auto `svn move` (preserves history)
**Delete:** Explorer delete → auto `svn delete`

Delete behavior (`sven.delete.actionForDeletedFiles`):
- `remove` (default) - Auto `svn delete`
- `prompt` - Ask each time
- `none` - Do nothing

### External Diff Tools

Use Beyond Compare, Meld, or any diff tool.

**Setup:**
1. Set `sven.diff.tool` to wrapper script path
2. Right-click file → **Diff with External Tool**

[Beyond Compare setup guide](https://www.scootersoftware.com/kb/vcs#svn)

### Watches (Remote Change Monitoring)

Monitor specific files/folders for remote changes.

**Commands:**
- `SVN: Toggle Watch for Remote Changes` - Watch/unwatch file
- `SVN: Manage Watches...` - View all watches

**Settings:**
- `sven.remoteChanges.checkFrequency` - Check interval (seconds, default: 300)

---

## SVN Properties

### EOL Style (`svn:eol-style`)

Normalize line endings across platforms.

**Commands:**
- `SVN: Set Line Ending Style (EOL)...`
- `SVN: Remove Line Ending Style (EOL)`
- `SVN: Manage Line Ending Styles (EOL)...`

**Values:** `native`, `LF`, `CRLF`

### MIME Type (`svn:mime-type`)

Control merge behavior for binary files.

**Commands:**
- `SVN: Set File Type (MIME)...`
- `SVN: Remove File Type (MIME)`

### Auto-Props

Auto-apply properties when files are added.

**Command:** `SVN: Manage Auto-Properties...`
- Edit/Create rules
- Import from client config
- Use default template

### Client Config

**Command:** `SVN: Open SVN Client Config`

Opens `~/.subversion/config` (Unix) or `%APPDATA%\Subversion\config` (Windows).

---

## Positron Integration

Enhanced for Posit's Positron IDE.

**Features:**
- Connections pane integration
- Quick checkout wizard
- Repository metadata display

**Setup:** Automatic when running in Positron.

**Privacy:** All operations local. See [PRIVACY.md](./PRIVACY.md).

---

## Authentication

The extension supports multiple credential storage modes.

**Mode** (`sven.auth.credentialMode`):
| Mode | Description |
|------|-------------|
| `auto` (default) | System keyring locally, SecretStorage remotely |
| `systemKeyring` | Always use OS credential manager |
| `extensionStorage` | Always use VS Code SecretStorage |
| `prompt` | Never store credentials |

**Recommended:** SSH keys for production (`svn+ssh://`).

For detailed auth setup and troubleshooting, see [Security Quick Reference](./docs/SECURITY_QUICK_REFERENCE.md).

---

## All Settings

### Core

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.enabled` | `true` | Enable extension |
| `sven.path` | `null` | Path to SVN executable |
| `sven.autorefresh` | `true` | Auto-refresh on file changes |
| `sven.showOutput` | `false` | Show output panel on startup |

### Commit

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.commit.useQuickPick` | `true` | Native commit dialog |
| `sven.commit.conventionalCommits` | `false` | Conventional commits format |
| `sven.commit.autoUpdate` | `none` | Update timing: `both`, `before`, `after`, `none` |
| `sven.commit.checkEmptyMessage` | `true` | Warn on empty message |
| `sven.commit.changes.selectedAll` | `true` | Select all by default |

### Source Control UI

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.sourceControl.changesLeftClick` | `open diff` | Click action: `open`, `open diff` |
| `sven.sourceControl.countUnversioned` | `true` | Include unversioned in badge |
| `sven.sourceControl.hideUnversioned` | `false` | Hide unversioned files |
| `sven.sourceControl.ignore` | `[]` | Glob patterns to hide |
| `sven.sourceControl.ignoreOnCommit` | `["ignore-on-commit"]` | Excluded changelists |
| `sven.sourceControl.combineExternalIfSameServer` | `false` | Combine externals |

### Remote Changes

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.remoteChanges.checkFrequency` | `300` | Check interval (seconds, 0 to disable) |
| `sven.refresh.remoteChanges` | `false` | Include remote in Refresh |

### Update

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.update.ignoreExternals` | `true` | Skip externals |
| `sven.showUpdateMessage` | `true` | Show update notification |

### Diff

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.diff.withHead` | `true` | Compare with HEAD (vs BASE) |
| `sven.diff.tool` | `null` | External diff tool path |

### History/Log

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.log.length` | `50` | Commits to show |
| `sven.log.authorColors` | `true` | Colored author dots |

### Delete

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.delete.actionForDeletedFiles` | `remove` | Action: `none`, `prompt`, `remove` |
| `sven.delete.ignoredRulesForDeletedFiles` | `[]` | Patterns to ignore |

### Conflicts

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.conflicts.autoResolve` | `false` | Auto-mark resolved |

### Authentication

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.auth.credentialMode` | `auto` | Storage mode |
| `sven.auth.commandTimeout` | `60` | Command timeout (seconds) |

### Repository Layout

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.layout.trunkRegex` | `(trunk)(/.*)?` | Trunk detection |
| `sven.layout.branchesRegex` | `branches/([^/]+)(/.*)?` | Branch detection |
| `sven.layout.tagsRegex` | `tags/([^/]+)(/.*)?` | Tag detection |
| `sven.layout.showFullName` | `true` | Show full path |

### Multi-Folder/Monorepo

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.multipleFolders.enabled` | `false` | Scan subfolders |
| `sven.multipleFolders.depth` | `4` | Max scan depth |
| `sven.multipleFolders.ignore` | `[".git",".hg","vendor","node_modules"]` | Skip folders |

### Detection

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.detectExternals` | `true` | Detect svn:externals |
| `sven.detectIgnored` | `true` | Scan ignored folders |

### Checkout

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.defaultCheckoutDirectory` | `null` | Default checkout location |

### Encoding

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.default.encoding` | `null` | Force encoding |
| `sven.experimental.detect_encoding` | `false` | Auto-detect |

### Gravatars

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.gravatars.enabled` | `true` | Use Gravatar icons |
| `sven.gravatar.icon_url` | (see below) | Gravatar URL template |

### Debug

| Setting | Default | Description |
|---------|---------|-------------|
| `sven.debug.disableSanitization` | `false` | ⚠️ Exposes credentials in logs |

---

## All Commands (91)

### Staging
`sven.stage`, `sven.stageAll`, `sven.stageWithChildren`, `sven.unstage`, `sven.unstageAll`

### Commit
`sven.commit`, `sven.commitAll`, `sven.commitStaged`, `sven.commitQuick`, `sven.commitWithMessage`, `sven.pickCommitMessage`

### Diff/Compare
`sven.openChangeBase`, `sven.openChangeHead`, `sven.openChangePrev`, `sven.diffWithExternalTool`, `sven.patch`, `sven.patchAll`, `sven.patchChangeList`

### File Operations
`sven.add`, `sven.revert`, `sven.revertAll`, `sven.openFile`, `sven.openHEADFile`, `sven.renameExplorer`, `sven.revealInExplorer`, `sven.copyRelativePath`, `sven.copyAbsolutePath`

### Locking
`sven.lock`, `sven.unlock`, `sven.breakLock`, `sven.stealLock`, `sven.toggleNeedsLock`

### Blame
`sven.blameFile`, `sven.blame.toggleBlame`, `sven.blame.showBlame`, `sven.blame.clearBlame`, `sven.blame.enableBlame`, `sven.blame.disableBlame`

### History
`sven.log`, `sven.repolog.refresh`, `sven.repolog.fetch`, `sven.repolog.goToRevision`, `sven.repolog.goToBase`, `sven.repolog.filterHistory`, `sven.repolog.clearFilter`, `sven.itemlog.refresh`, `sven.itemlog.gotoRepolog`, `sven.searchLogByRevision`, `sven.searchLogByText`

### Sparse Checkout
`sven.sparse.refresh`, `sven.sparse.checkout`, `sven.sparse.exclude`, `sven.setDepth`

### Properties
`sven.setEolStyle`, `sven.removeEolStyle`, `sven.manageEolStyle`, `sven.setMimeType`, `sven.removeMimeType`, `sven.manageAutoProps`, `sven.manageProperties`, `sven.openClientConfig`

### Ignore
`sven.addToIgnoreExplorer`, `sven.addToIgnoreSCM`, `sven.removeFromIgnore`, `sven.toggleIgnore`, `sven.viewIgnorePatterns`

### Repository
`sven.checkout`, `sven.update`, `sven.refresh`, `sven.refreshRemoteChanges`, `sven.cleanup`, `sven.merge`, `sven.resolve`, `sven.resolveAll`, `sven.switchBranch`, `sven.close`

### Watches
`sven.toggleWatch`, `sven.manageWatches`

### Other
`sven.changelist`, `sven.removeUnversioned`, `sven.deleteUnversioned`, `sven.clearCredentials`, `sven.clearCache`, `sven.applyRecommendedSettings`, `sven.showGlossary`

---

## SVN Terminology

| Term | Meaning |
|------|---------|
| **BASE** | Your last updated version |
| **HEAD** | Server's latest version |
| **PREV** | Previous committed version |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing, and workflow.

**Documentation:**
- [Architecture](./docs/ARCHITECTURE_ANALYSIS.md) - System design
- [Lessons Learned](./docs/LESSONS_LEARNED.md) - Development patterns
- [Security](./docs/SECURITY_QUICK_REFERENCE.md) - Auth & security

## Feedback

- **Issues:** [GitHub Issues](https://github.com/vrognas/sven/issues)
- **Security:** [Security Advisories](https://github.com/vrognas/sven/security/advisories)
