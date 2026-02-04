# Sven - Subversion for VS Code & Positron

[![Version](https://img.shields.io/badge/version-0.2.4-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> [!NOTE]
> This extension is currently in active development.
> While stable for daily use, expect occasional breaking changes.
> Please report any issues to help improve the extension.

Git-like SVN experience with staging, inline blame, file locking, and sparse checkout. Zero telemetry.

> **Requires:** [SVN](https://subversion.apache.org) installed. Windows users: enable **Command Line Tools** when installing [TortoiseSVN](https://tortoisesvn.net/).

## Why Sven?

| Pain Point | Sven Solution |
|------------|---------------|
| SVN has no staging | Git-like stage → commit workflow |
| "Who wrote this line?" | Inline blame annotations (GitLens-style) |
| Binary file conflicts | File locking with visual indicators |
| Giant repos are slow | Sparse checkout - download only what you need |
| Clunky diff tools | Beyond Compare, Meld, any external tool |

## Quick Start

**Open existing repo:** File → Open Folder → select folder with `.svn`

**Checkout new repo:** `Ctrl+Shift+P` → **SVN: Checkout** → enter URL → choose folder

**Daily workflow:**
```
1. Make changes        → Files appear in "Changes"
2. Click + to stage    → Files move to "Staged"
3. Ctrl+Enter          → Commit staged files
```

## Features

### Staging

Stage files before commit - no more accidental commits.

| Action | How |
|--------|-----|
| Stage | `+` button or right-click |
| Unstage | `-` button |
| Commit | `Ctrl+Enter` |

### Blame Annotations

See who changed each line, when, and why.

- **Gutter**: Colored revision indicators
- **Inline**: Author + date at line end
- **Hover**: Full commit message

Toggle: `Ctrl+Shift+P` → **SVN: Toggle Annotations**

### Repository History

Browse commits with file changes and diffs.

- **Repo History** view: Full commit log with filtering (author, date, text)
- **File History** view: Per-file revisions (right-click file → **Show Log**)
- **B badge**: Your BASE revision
- Explorer rename/delete auto-converts to `svn move`/`svn delete` (preserves history)

### File Locking

Prevent conflicts on binary files (CSVs, images, models).

| Badge | Meaning |
|-------|---------|
| `K` | Locked by you |
| `O` | Locked by someone else |
| `L` | Needs lock (read-only) |

Setup: right-click file → **Set Needs-Lock Property**

Commands: **Lock**, **Unlock**, **Manage Locks**, **Break Lock**

[Full locking guide →](docs/FILE_LOCKING.md)

### Sparse Checkout

Download only specific folders from large repos.

1. Open **Selective Download** panel in SCM sidebar
2. Click ghost folders to download
3. Choose depth: Full, Shallow, Files Only, Empty

## How To

| Task | How |
|------|-----|
| Compare with server | Right-click → **Open Changes with HEAD** |
| Resolve conflicts | Fix markers in file → right-click → **Resolve** |
| Switch branches | `Ctrl+Shift+P` → **SVN: Switch Branch** |
| Create patch | Right-click files → **Show Changes (Patch)** |
| Set line endings | Right-click → **Set Line Ending Style (EOL)** |
| Ignore files | Right-click → **Add to Ignore List** |
| External diff | Set `sven.diff.tool` to tool path |
| Merge branches | `Ctrl+Shift+P` → **SVN: Merge** |
| Cleanup | `Ctrl+Shift+P` → **SVN: Cleanup** |

## Configuration

### Settings

Open Settings (`Ctrl+,`) and search `sven`.

| Setting | Default | What it does |
|---------|---------|--------------|
| `sven.blame.autoBlame` | `true` | Show blame when opening files |
| `sven.commit.autoUpdate` | `none` | Run update before/after commit |
| `sven.diff.tool` | `null` | External diff tool path |
| `sven.remoteChanges.checkFrequency` | `300` | Remote check interval (seconds) |
| `sven.sourceControl.hideUnversioned` | `false` | Hide unversioned files |
| `sven.log.length` | `50` | Commits shown in history |

[All 70+ settings →](docs/SETTINGS.md)

### Troubleshooting

**"SVN not found"** → Set `sven.path` to full SVN path (e.g., `/usr/bin/svn`)

**Password prompts loop** → Set `sven.auth.credentialMode` to `extensionStorage`, restart

**Slow on large repos** → Enable sparse checkout, reduce `sven.log.length`

[Full troubleshooting →](docs/SECURITY_QUICK_REFERENCE.md)

## More Info

**Positron IDE:** Works automatically with Connections pane integration.

**Links:**
[Settings](docs/SETTINGS.md) ·
[Security](docs/SECURITY_QUICK_REFERENCE.md) ·
[File Locking](docs/FILE_LOCKING.md) ·
[Privacy](PRIVACY.md) ·
[Contributing](CONTRIBUTING.md) ·
[Changelog](CHANGELOG.md) ·
[Issues](https://github.com/vrognas/sven/issues)

---

Forked from [JohnstonCode/svn-scm](https://github.com/JohnstonCode/svn-scm)
