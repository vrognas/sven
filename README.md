# Sven - Subversion for VS Code & Positron

[![Version](https://img.shields.io/badge/version-0.2.3-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Git-like SVN experience with staging, inline blame, file locking, and sparse checkout. Zero telemetry.

> **Requires:** [SVN](https://subversion.apache.org) installed. Windows users: enable **Command Line Tools** when installing [TortoiseSVN](https://tortoisesvn.net/).

## Why Sven?

| Pain Point | Sven Solution |
|------------|---------------|
| SVN has no staging | ✅ Git-like stage → commit workflow |
| "Who wrote this line?" | ✅ Inline blame annotations (GitLens-style) |
| Binary file conflicts | ✅ File locking with visual indicators |
| Giant repos are slow | ✅ Sparse checkout - download only what you need |
| Clunky diff tools | ✅ Beyond Compare, Meld, any external tool |

## Quick Start

### Open Existing Repository
1. **File → Open Folder** → select folder with `.svn`
2. SVN panel appears in Source Control sidebar

### Checkout New Repository
1. `Ctrl+Shift+P` → **SVN: Checkout**
2. Enter repository URL
3. Choose local folder

### Daily Workflow
```
1. Make changes        → Files appear in "Changes"
2. Click + to stage    → Files move to "Staged"
3. Ctrl+Enter          → Commit staged files
```

## Key Features

### Staging (Git-like)
Stage files before commit. No more accidental commits.

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

### File Locking
Prevent conflicts on binary files (CSVs, images, models).

| Command | Use Case |
|---------|----------|
| **Lock** | Claim exclusive edit rights |
| **Unlock** | Release when done |
| **Break Lock** | Admin override |

Visual: 🔒 = locked, 🔓 = needs lock (read-only)

### Sparse Checkout
Download only specific folders from large repos.

1. Open **Selective Download** panel in SCM sidebar
2. Click ☁️ ghost folders to download
3. Choose depth: Full, Shallow, Files Only, Empty

### Repository History
Browse commits with file changes, diffs, and filtering.

- **B badge** = your BASE revision
- **↻ Refresh** / **↓ Fetch** / **↓↓ Pull**
- Filter by author, date, text

### Smart Operations
Explorer actions auto-convert to SVN commands:
- **Rename** → `svn move` (preserves history)
- **Delete** → `svn delete` (proper removal)

## Essential Settings

Open Settings (`Ctrl+,`) and search `sven`.

| Setting | Default | What it does |
|---------|---------|--------------|
| `sven.blame.autoBlame` | `true` | Show blame when opening files |
| `sven.commit.conventionalCommits` | `false` | Conventional commit format |
| `sven.commit.autoUpdate` | `none` | Run update before/after commit |
| `sven.diff.tool` | `null` | External diff tool path |
| `sven.remoteChanges.checkFrequency` | `300` | Remote check interval (seconds) |
| `sven.sourceControl.hideUnversioned` | `false` | Hide unversioned files |
| `sven.log.length` | `50` | Commits shown in history |

[All 70+ settings →](docs/SETTINGS.md)

## Common Tasks

### Compare with server
Right-click file → **Open Changes with HEAD**

### Resolve conflicts
1. Fix conflict markers in file
2. Right-click → **Resolve**

### Switch branches
`Ctrl+Shift+P` → **SVN: Switch Branch**

### Create patch
Right-click files → **Show Changes (Patch)**

### Set line endings
Right-click file → **Set Line Ending Style (EOL)**

## Troubleshooting

**"SVN not found"**
- Set `sven.path` to full SVN path (e.g., `/usr/bin/svn`)

**Password prompts loop**
- Try `sven.auth.credentialMode`: `extensionStorage`
- Then restart extension host

**Slow on large repos**
- Enable sparse checkout
- Reduce `sven.log.length`

[Full troubleshooting →](docs/SECURITY_QUICK_REFERENCE.md)

## Positron IDE

Works automatically in [Positron](https://posit.co/products/ide/positron/):
- Connections pane integration
- Optimized for data science workflows
- All operations local (zero telemetry)

## Links

- [Full Settings Reference](docs/SETTINGS.md)
- [Security & Authentication](docs/SECURITY_QUICK_REFERENCE.md)
- [Privacy Policy](PRIVACY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Report Issue](https://github.com/vrognas/sven/issues)

---

**Credit:** Forked from [JohnstonCode/svn-scm](https://github.com/JohnstonCode/svn-scm)
