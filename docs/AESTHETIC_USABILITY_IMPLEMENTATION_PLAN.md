# Aesthetic-Usability Implementation Plan

**Version**: 0.2.0
**Date**: 2025-12-25
**Parent**: [AESTHETIC_USABILITY_ANALYSIS.md](./AESTHETIC_USABILITY_ANALYSIS.md)

---

## Overview

Detailed implementation plans for addressing usability issues masked by aesthetic design. Each recommendation includes specific files, code patterns, and step-by-step changes.

---

## P0: Address Masked Critical Issues

### P0.1: Add Action Buttons to Errors ✅ COMPLETE

**Status**: Implemented in `command.ts:handleRepositoryOperation()` with 4 new detection methods.

**Problem**: Only 4 error types have action buttons; `actionableError.ts` functions exist but are NEVER CALLED.

**Current State**:

- `showLockedError()` → Never called
- `showAuthError()` → Never called
- `showOutOfDateError()` → Never called
- `showErrorWithOutput()` → Never called

Active system in `command.ts:handleRepositoryOperation()` handles only 3 cases inline.

**Top 10 Errors Needing Actions**:

| Error Code   | Type                   | Current      | Proposed Action            |
| ------------ | ---------------------- | ------------ | -------------------------- |
| E170001      | Authentication failed  | Message only | "Clear Credentials" button |
| E215004      | No credentials         | Message only | "Clear Credentials" button |
| E170013      | Network connection     | Message only | "Retry" button             |
| E175002      | Network timeout        | Message only | "Retry" button             |
| E200035      | Path locked (other)    | Message only | "Steal Lock" button        |
| E200036      | Path not locked        | Message only | "Lock File" button         |
| E200041      | Lock expired           | Message only | "Re-lock" button           |
| E261001/2    | Permission/access      | Message only | "Show Output" button       |
| E250006      | Version mismatch       | Message only | "Check SVN Version" button |
| Merge errors | Various merge failures | Raw error    | "Update First" button      |

**Implementation Steps**:

1. **Refactor `actionableError.ts`**:

```typescript
// src/util/actionableError.ts - ADD new error handlers

export async function showNetworkError(message: string): Promise<void> {
  const retry = "Retry";
  const result = await window.showErrorMessage(message, retry);
  if (result === retry) {
    await commands.executeCommand("sven.refresh");
  }
}

export async function showLockConflictError(
  message: string,
  filePath: string
): Promise<void> {
  const steal = "Steal Lock";
  const result = await window.showErrorMessage(message, steal);
  if (result === steal) {
    await commands.executeCommand("sven.stealLock", filePath);
  }
}

export async function showLockExpiredError(
  message: string,
  filePath: string
): Promise<void> {
  const relock = "Re-lock";
  const result = await window.showErrorMessage(message, relock);
  if (result === relock) {
    await commands.executeCommand("sven.lock", filePath);
  }
}
```

2. **Update `command.ts:handleRepositoryOperation()`**:

```typescript
// src/commands/command.ts - EXTEND error detection

private detectErrorType(error: Error): ErrorType {
  const message = error.message || "";
  const stderr = (error as any).stderr || "";

  // Auth errors (BEFORE generic network check)
  if (stderr.includes("E215004") || stderr.includes("E170001") ||
      stderr.includes("No more credentials")) {
    return ErrorType.Auth;
  }

  // Network errors
  if (stderr.includes("E170013") || stderr.includes("E175002")) {
    return ErrorType.Network;
  }

  // Lock conflicts
  if (stderr.includes("E200035")) return ErrorType.LockConflict;
  if (stderr.includes("E200036")) return ErrorType.NotLocked;
  if (stderr.includes("E200041")) return ErrorType.LockExpired;

  // ... existing checks
}
```

3. **Files to Modify**:
   - `src/util/actionableError.ts` - Add 6 new handlers
   - `src/commands/command.ts` - Extend `handleRepositoryOperation()`
   - `src/commands/lock.ts:54` - Use `showLockConflictError()`
   - `src/commands/unlock.ts` - Use `showLockExpiredError()`
   - `src/commands/merge.ts:50,56` - Use `showOutOfDateError()`
   - `src/historyView/common.ts` - Add "Show Output" to 8 errors

4. **Tests** (3 E2E):
   - Test auth error shows "Clear Credentials" button
   - Test network error shows "Retry" button
   - Test lock conflict shows "Steal Lock" button

---

### P0.2: Replace Modals with Inline Validation ✅ COMPLETE

**Status**: Converted 3 high-impact modals to non-modal. Added inline validation to commit webview.

**Problem**: 28+ modal dialogs block UI; 10 could be inline.

**High-Impact Candidates**:

| File                        | Line | Current                | Proposed                       |
| --------------------------- | ---- | ---------------------- | ------------------------------ |
| `messages.ts`               | 247  | Modal: empty message   | Inline validation in commit UI |
| `resolved.ts`               | 26   | Modal: resolve confirm | Quick-pick with file context   |
| `preCommitUpdateService.ts` | 101  | Modal: conflicts       | Inline notification + buttons  |
| `manageAutoProps.ts`        | 304  | Modal: import confirm  | Regular notification           |
| `sparseCheckoutProvider.ts` | 928  | Modal: large download  | Info banner in tree view       |

**Implementation Steps**:

1. **Empty Commit Message** (`src/messages.ts:247`):

```typescript
// BEFORE
const result = await window.showWarningMessage(
  "Commit message is empty. Continue?",
  { modal: true },
  "Commit Anyway"
);

// AFTER - Use input validation callback
sourceControl.inputBox.validateInput = value => {
  if (!value.trim() && !configuration.get("allowEmptyCommitMessage")) {
    return {
      message: "Commit message is empty",
      severity: InputBoxValidationSeverity.Warning
    };
  }
  return undefined;
};
```

2. **Resolve Conflict** (`src/commands/resolved.ts:26`):

```typescript
// BEFORE
const confirm = await window.showWarningMessage(
  `Mark ${basename} as resolved?`,
  { modal: true },
  "Resolve"
);

// AFTER - Use quick-pick with detail
const items: QuickPickItem[] = [
  {
    label: "$(check) Mark as Resolved",
    description: basename,
    detail: "Remove conflict markers and stage file"
  },
  {
    label: "$(x) Cancel",
    description: "Keep conflict state"
  }
];
const result = await window.showQuickPick(items, {
  title: "Resolve Conflict",
  placeHolder: "Choose action"
});
```

3. **Pre-commit Conflicts** (`src/services/preCommitUpdateService.ts:101`):

```typescript
// BEFORE
const choice = await window.showWarningMessage(
  "Update produced conflicts. Continue commit?",
  { modal: true },
  "Abort",
  "Commit Anyway"
);

// AFTER - Inline notification with progress
await window.withProgress(
  {
    location: ProgressLocation.Notification,
    title: "Conflicts detected during update",
    cancellable: true
  },
  async (progress, token) => {
    const action = await window.showWarningMessage(
      "Resolve conflicts before committing?",
      "Resolve Now",
      "Commit Anyway"
    );
    // ...
  }
);
```

4. **Import Auto-Props** (`src/commands/manageAutoProps.ts:304`):

```typescript
// BEFORE - Information message with modal (unusual)
await window.showInformationMessage(
  "Import auto-props from SVN client config?",
  { modal: true },
  "Import"
);

// AFTER - Regular notification
await window.showInformationMessage(
  "Auto-props imported successfully from SVN client config",
  "Show Rules"
);
```

5. **Files to Modify**:
   - `src/messages.ts:247` - Input validation
   - `src/commands/resolved.ts:26` - Quick-pick
   - `src/services/preCommitUpdateService.ts:101` - Progress notification
   - `src/commands/manageAutoProps.ts:304` - Remove modal flag
   - `src/treeView/dataProviders/sparseCheckoutProvider.ts:928` - Info banner

6. **Tests** (3 E2E):
   - Test empty commit shows inline validation warning
   - Test resolve uses quick-pick dialog
   - Test auto-props import shows regular notification

---

### P0.3: Auto-Trigger Onboarding ✅ COMPLETE

**Status**: Implemented in `source_control_manager.ts:promptWalkthrough()`. Shows once per installation.

**Problem**: 5 walkthroughs exist but no auto-trigger on first use.

**Current State** (`package.json:208-414`):

- Walkthroughs registered but only accessible via Help → Get Started
- New users see blank SCM panel

**Design Decision**: Prompt on first repository open (not first activation).

- Context-appropriate: user has an SVN repo open
- Less intrusive: doesn't bother users who installed but haven't opened SVN repo
- Follows VS Code patterns: Git extension shows help when you open a Git repo

**Implementation Steps**:

1. **Trigger on First Repository Open** (not activation):

```typescript
// src/source_control_manager.ts - ADD walkthrough prompt

private async onDidOpenRepository(repository: Repository): Promise<void> {
  // Existing code...

  // Check if user needs onboarding
  const repoCount = this.repositories.length;
  if (repoCount === 1) {
    await this.promptWalkthrough();
  }
}

private async promptWalkthrough(): Promise<void> {
  const hasCompletedSetup = this.context.globalState.get<boolean>("sven.setupComplete");
  if (hasCompletedSetup) return;

  // Show welcome notification with tour option
  const action = await window.showInformationMessage(
    "SVN repository detected. Need help getting started?",
    "Quick Tour",
    "Dismiss"
  );

  if (action === "Quick Tour") {
    await commands.executeCommand(
      "workbench.action.openWalkthrough",
      "vrognas.sven#gettingStarted"
    );
  }

  await this.context.globalState.update("sven.setupComplete", true);
}
```

2. **Files to Modify**:
   - `src/source_control_manager.ts` - Repository open handler + promptWalkthrough()
   - `package.json` - Ensure walkthrough IDs are stable

3. **Tests** (3 E2E):
   - Test first repo open shows onboarding prompt
   - Test "Quick Tour" opens walkthrough
   - Test subsequent repo opens skip onboarding

---

## P1: Reduce Cognitive Load

### P1.1: Consolidate Command Names ✅ COMPLETE

**Status**: Implemented with `src/constants/terminology.ts` and 30+ command title updates in `package.json`.

**Problem**: 80+ commands with inconsistent naming, ellipsis, capitalization.

**Naming Rules to Apply**:

| Rule           | Before                      | After                                |
| -------------- | --------------------------- | ------------------------------------ |
| Ellipsis       | "Set EOL Style"             | "Set line ending style..."           |
| Jargon         | "Open diff with BASE"       | "Open diff with your version (BASE)" |
| Capitalization | "Refresh branch changes"    | "Refresh"                            |
| Acronyms       | "EOL Style"                 | "Line ending style"                  |
| Consistency    | "Blame File" / "Show Blame" | "Show file annotations"              |

**Design Decision**: Keep SVN jargon in parentheses.

Users should learn official SVN terminology so they can:

- Look up SVN documentation
- Communicate with other SVN users
- Understand error messages from SVN CLI

Pattern: `"User-friendly term (SVN_TERM)"`

**Implementation Steps**:

1. **Create Terminology Map**:

```typescript
// src/constants/terminology.ts - NEW FILE

export const TERMINOLOGY = {
  // SVN jargon → User-friendly (keeps original in parentheses)
  BASE: "your version",
  HEAD: "server latest",
  PREV: "previous revision",
  WC: "local",
  changelist: "change group",
  EOL: "line ending",
  MIME: "file type",
  blame: "annotations",
  sparse: "selective download",
  "needs-lock": "require lock on edit"
} as const;

// Format: "User-friendly (SVN_TERM)"
export function humanize(
  term: keyof typeof TERMINOLOGY,
  includeOriginal = true
): string {
  const friendly = TERMINOLOGY[term];
  return includeOriginal ? `${friendly} (${term})` : friendly;
}
```

2. **Update `package.json` Command Titles** (batch):

```json
{
  "commands": [
    {
      "command": "sven.openDiffBase",
      "title": "Open diff with your version (BASE)"
    },
    {
      "command": "sven.openDiffHead",
      "title": "Open diff with server latest (HEAD)"
    },
    {
      "command": "sven.openDiffPrev",
      "title": "Open diff with previous revision (PREV)"
    },
    { "command": "sven.setEolStyle", "title": "Set line ending style..." },
    { "command": "sven.setMimeType", "title": "Set file type..." },
    {
      "command": "sven.setChangelist",
      "title": "Set change group (changelist)..."
    },
    { "command": "sven.blame", "title": "Show file annotations (blame)" },
    { "command": "sven.toggleBlame", "title": "Toggle annotations (blame)" },
    { "command": "sven.changeDepth", "title": "Set download scope (depth)..." }
  ]
}
```

**Note**: Parenthetical SVN terms help users:

- Search SVN docs: "What is BASE in SVN?"
- Understand CLI output: `svn diff -r BASE:HEAD`
- Communicate with team: "Check the HEAD revision"

3. **Standardize Ellipsis** (commands opening dialogs):

```
ADD "..." to:
- Set line ending style...
- Set file type...
- Set change group...
- Set download scope...
- Filter history...
- Manage watches...
- Manage line endings...
- Manage auto-properties...
```

4. **Files to Modify**:
   - `package.json` - All 80+ command titles
   - `src/constants/terminology.ts` - New file
   - `src/messages.ts` - Use terminology map in user-facing strings

5. **Tests** (3 E2E):
   - Test command palette shows user-friendly names
   - Test context menus use consistent ellipsis
   - Test no SVN jargon appears in UI

---

### P1.2: Create Terminology Glossary Command ✅ COMPLETE

**Status**: Implemented in `src/commands/showGlossary.ts` with 12 glossary entries.

**Problem**: Users unfamiliar with SVN don't understand BASE/HEAD/PREV.

**Implementation Steps**:

1. **Add Glossary Command**:

```typescript
// src/commands/showGlossary.ts - NEW FILE

import { window } from "vscode";

const GLOSSARY = [
  {
    term: "BASE (Your Version)",
    definition: "The last version you downloaded from the server"
  },
  {
    term: "HEAD (Server Latest)",
    definition: "The most recent version on the SVN server"
  },
  {
    term: "Working Copy",
    definition: "Your local folder containing checked-out files"
  },
  {
    term: "Revision",
    definition: "A numbered snapshot of the repository at a point in time"
  },
  {
    term: "Change Group (Changelist)",
    definition: "A named set of files to commit together"
  },
  {
    term: "Sparse/Selective Download",
    definition: "Download only specific folders instead of entire repository"
  },
  {
    term: "Lock",
    definition:
      "Reserve a file so others cannot edit it (useful for binary files)"
  },
  {
    term: "Annotations (Blame)",
    definition: "Show who last edited each line of a file"
  }
];

export async function showGlossary(): Promise<void> {
  const items = GLOSSARY.map(g => ({
    label: g.term,
    detail: g.definition
  }));

  await window.showQuickPick(items, {
    title: "SVN Terminology",
    placeHolder: "Search terms...",
    matchOnDetail: true
  });
}
```

2. **Register Command**:

```json
// package.json
{
  "command": "sven.showGlossary",
  "title": "SVN: Show Terminology Help"
}
```

3. **Files to Modify**:
   - `src/commands/showGlossary.ts` - New file
   - `src/commands.ts` - Register command
   - `package.json` - Add command definition

4. **Tests** (3 E2E):
   - Test command opens glossary quick-pick
   - Test search filters terms correctly
   - Test all jargon terms are defined

---

### P1.3: Update Progress Dynamically ✅ ALREADY COMPLETE

**Status**: Already implemented in sparse checkout with file monitors, folder monitors, speed tracking, and ETA updates (lines 1135-1172).

**Problem**: Progress shows initial ETA but doesn't update as download progresses.

**Location**: `src/treeView/dataProviders/sparseCheckoutProvider.ts:985-993`

**Design Decision**: Update message only (VS Code API limitation).

- Title is static after `withProgress()` creation—cannot be changed
- Message can be updated via `progress.report({ message })`
- Pattern: Title = `"Downloading {name}"`, Message = `"5.2MB (52%) - 15s remaining"`

**Implementation Steps**:

1. **Create Dynamic Progress Helper**:

```typescript
// src/util/dynamicProgress.ts - NEW FILE

import { Progress, CancellationToken } from "vscode";

export class DynamicProgress {
  private startTime: number;
  private totalBytes: number;
  private lastUpdate: number = 0;

  constructor(
    private progress: Progress<{ message?: string; increment?: number }>,
    totalBytes: number
  ) {
    this.startTime = Date.now();
    this.totalBytes = totalBytes;
  }

  report(bytesCompleted: number): void {
    const now = Date.now();
    if (now - this.lastUpdate < 500) return; // Throttle to 2Hz
    this.lastUpdate = now;

    const elapsed = (now - this.startTime) / 1000;
    const rate = bytesCompleted / elapsed;
    const remaining = this.totalBytes - bytesCompleted;
    const eta = remaining / rate;

    const percent = Math.round((bytesCompleted / this.totalBytes) * 100);
    const etaStr = this.formatEta(eta);
    const sizeStr = this.formatSize(bytesCompleted);

    this.progress.report({
      message: `${sizeStr} (${percent}%) - ${etaStr} remaining`,
      increment: undefined // We're showing absolute progress in message
    });
  }

  private formatEta(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }
}
```

2. **Update Sparse Checkout Download**:

```typescript
// src/treeView/dataProviders/sparseCheckoutProvider.ts

await window.withProgress(
  {
    location: ProgressLocation.Notification,
    title: `Downloading ${item.name}`, // Simple initial title
    cancellable: true
  },
  async (progress, token) => {
    const dynamicProgress = new DynamicProgress(progress, estimatedSize);

    // During download, call:
    dynamicProgress.report(bytesDownloaded);
  }
);
```

3. **Files to Modify**:
   - `src/util/dynamicProgress.ts` - New helper
   - `src/treeView/dataProviders/sparseCheckoutProvider.ts` - Use helper

4. **Tests** (3 E2E):
   - Test progress message updates during download
   - Test ETA decreases as download progresses
   - Test throttling prevents excessive updates

---

## P2: Improve Discoverability

### P2.1: Single-Dialog Commit Flow

**Problem**: 6 decision points for single commit.

**Current Flow**:

```
1. Select changelist → 2. Select files → 3. Pre-commit update prompt
→ 4. Conflict prompt → 5. Message input → 6. Empty message warning
```

**Proposed Flow**:

```
1. Quick-pick commit dialog → 2. Commit
```

**Design Decision**: Use native VS Code quick-pick sequence (not webview).

- Follows VS Code UX patterns
- Keyboard-driven, no mouse required
- Faster than webview DOM rendering
- Familiar to Git extension users

**Implementation Steps**:

1. **Create Multi-Step Quick-Pick Commit Flow**:

```typescript
// src/commands/commitQuickPick.ts - NEW FILE

export async function commitWithQuickPick(
  repository: Repository
): Promise<void> {
  // Step 1: Show staged files with toggle options
  const stagedFiles = repository.staged;
  const fileItems = stagedFiles.map(f => ({
    label: `$(check) ${basename(f.resourceUri.fsPath)}`,
    description: f.type,
    detail: f.resourceUri.fsPath,
    picked: true,
    file: f
  }));

  const selected = await window.showQuickPick(fileItems, {
    title: "Commit (1/2): Select files",
    placeHolder: "All staged files selected",
    canPickMany: true
  });

  if (!selected || selected.length === 0) return;

  // Step 2: Enter commit message with inline validation
  const message = await window.showInputBox({
    title: "Commit (2/2): Enter message",
    placeHolder: "Commit message (Ctrl+Enter to commit)",
    prompt: `Committing ${selected.length} file(s)`,
    validateInput: value => {
      if (!value.trim()) {
        return "Commit message cannot be empty";
      }
      return undefined;
    }
  });

  if (!message) return;

  // Commit with selected files
  await repository.commit(
    message,
    selected.map(s => s.file)
  );
}
```

2. **Add Pre-commit Update as Setting** (not modal):

```typescript
// Check setting instead of prompting
const preCommitUpdate = configuration.get<boolean>("commit.preCommitUpdate");
if (preCommitUpdate) {
  await repository.update();
  // If conflicts, show inline notification (not modal)
  if (repository.hasConflicts) {
    const action = await window.showWarningMessage(
      "Conflicts detected. Resolve before committing?",
      "Resolve",
      "Commit Anyway"
    );
    // ...
  }
}
```

3. **Optional Webview Alternative** (future consideration):

For users who prefer visual file trees, a webview dialog could be added as
`svn.commit.useWebviewDialog` setting. Not in initial scope.

4. **Files to Modify**:
   - `src/commands/commitQuickPick.ts` - New quick-pick flow
   - `src/commands/commit.ts` - Route to quick-pick
   - `src/services/commitFlowService.ts` - Simplify to 2 steps
   - `package.json` - Add `svn.commit.preCommitUpdate` setting

5. **Tests** (3 E2E):
   - Test quick-pick shows staged files
   - Test inline message validation rejects empty
   - Test pre-commit update setting works

---

### P2.2: Unified Property Management ✅ COMPLETE

**Status**: Implemented `src/commands/manageProperties.ts` with 5 category quick-pick.

**Problem**: 6 separate commands for property management.

**Current**:

- Set EOL Style, Remove EOL Style, Manage EOL Styles
- Set MIME Type, Remove MIME Type, Manage Auto-Props

**Proposed**: Single "Manage Properties..." command opening tabbed dialog.

**Implementation Steps**:

1. **Create Properties Quick-Pick**:

```typescript
// src/commands/manageProperties.ts - NEW FILE

export async function manageProperties(uri: Uri): Promise<void> {
  const tabs = [
    { label: "$(symbol-property) Line Endings", id: "eol" },
    { label: "$(file-media) File Types", id: "mime" },
    { label: "$(gear) Auto-Properties", id: "autoprops" },
    { label: "$(eye-closed) Ignore Patterns", id: "ignore" },
    { label: "$(lock) Lock Settings", id: "lock" }
  ];

  const selected = await window.showQuickPick(tabs, {
    title: "Manage File Properties",
    placeHolder: "Select property category"
  });

  if (!selected) return;

  switch (selected.id) {
    case "eol":
      await commands.executeCommand("sven.manageEolStyles", uri);
      break;
    case "mime":
      await commands.executeCommand("sven.setMimeType", uri);
      break;
    // ...
  }
}
```

2. **Update Context Menus**:

```json
// package.json - Replace 6 items with 1
{
  "explorer/context": [
    {
      "command": "sven.manageProperties",
      "group": "svn@1",
      "when": "svnOpenRepositoryCount != 0"
    }
  ]
}
```

3. **Files to Modify**:
   - `src/commands/manageProperties.ts` - New unified command
   - `package.json` - Simplify context menus
   - Keep existing commands as sub-commands

4. **Tests** (3 E2E):
   - Test unified command shows all categories
   - Test each category opens correct sub-dialog
   - Test context menu is simplified

---

## P3: Maintain Visual Excellence

### P3.1: Document Design Decisions

**Deliverable**: `docs/DESIGN_SYSTEM.md`

**Contents**:

- Color palette (gitDecoration.\* mappings)
- Icon conventions (when to use which codicon)
- Badge system rules (single char, dual char, folder prefix)
- Dialog patterns (when modal vs inline)
- Error message format standard

### P3.2: User Testing Protocol

**Deliverable**: `docs/USER_TESTING_PROTOCOL.md`

**Contents**:

- Test with Git users unfamiliar with SVN
- Screen recording requirements
- Task scenarios (checkout, commit, resolve conflict)
- Metrics to collect (hesitations, errors, time-to-complete)

---

## Implementation Order

| Phase | Task                   | Effort | Dependencies | Status  |
| ----- | ---------------------- | ------ | ------------ | ------- |
| 1     | P0.1 Action buttons    | 4h     | None         | ✅ Done |
| 2     | P0.2 Inline validation | 6h     | None         | ✅ Done |
| 3     | P0.3 Auto-onboarding   | 2h     | None         | ✅ Done |
| 4     | P1.1 Command naming    | 8h     | None         | ✅ Done |
| 5     | P1.2 Glossary command  | 2h     | P1.1         | ✅ Done |
| 6     | P1.3 Dynamic progress  | 3h     | None         | ✅ Done |
| 7     | P2.1 Commit dialog     | 12h    | P0.2         | Pending |
| 8     | P2.2 Property mgmt     | 4h     | None         | ✅ Done |
| 9     | P3.1 Design docs       | 4h     | All above    | Pending |

**Total Estimated Effort**: ~45 hours

---

## Success Metrics

| Metric                      | Before          | After Target                      |
| --------------------------- | --------------- | --------------------------------- |
| Error types with actions    | 4               | 15                                |
| Modal dialogs               | 28              | <15                               |
| Commit flow steps           | 6               | 2                                 |
| Commands with ellipsis bugs | 12              | 0                                 |
| Unexplained jargon in UI    | 15+ (raw terms) | 0 (all have user-friendly prefix) |

---

## Design Decisions (Resolved)

1. **Commit dialog**: Use native quick-pick sequence (not webview)
   - Webview can be added later as optional `svn.commit.useWebviewDialog` setting
2. **SVN jargon**: Keep in parentheses for documentation lookup
   - Pattern: `"User-friendly term (SVN_TERM)"`
   - Example: `"Open diff with your version (BASE)"`
3. **Auto-onboarding**: Prompt on first repository open (not first activation)
   - Context-appropriate: user has an SVN repo, so they'll actually use extension
   - Less intrusive: doesn't bother users who installed but haven't opened SVN repo
   - Follows VS Code patterns: Git extension doesn't show help until you open a Git repo
4. **Dynamic progress**: Update message only (VS Code API limitation)
   - Title is static after `withProgress()` creation
   - Message can be updated via `progress.report({ message })`
   - Pattern: Title = `"Downloading {name}"`, Message = `"5.2MB (52%) - 15s remaining"`

---

**Document Version**: 1.2
**Last Updated**: 2025-12-25
