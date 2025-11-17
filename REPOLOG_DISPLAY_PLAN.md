# Repository Log File Display Improvement Plan

**Goal**: Change file display in repository log to match Git Graph style

---

## Current Display (repoLogProvider.ts:421-436)

```
[M icon] filename.ts
         path/to/directory
```

- Icon: Status icon (M, A, D) from `getActionIcon()`
- Label: `basename`
- Description: `path.dirname()`

## Desired Display (Git Graph style)

```
[file icon] filename.ts  path/to/directory • M
```

- Icon: File type icon (based on extension)
- Label: `basename`
- Description: `dirname + " • " + action badge`

---

## Implementation

### Changes to `src/historyView/repoLogProvider.ts` (lines 421-436)

**Before:**
```typescript
const pathElem = element.data as ISvnLogEntryPath;
const basename = path.basename(pathElem._);
ti = new TreeItem(basename, TreeItemCollapsibleState.None);
ti.description = path.dirname(pathElem._);
ti.tooltip = nm.parse(pathElem._).relativeFromBranch;
ti.iconPath = getActionIcon(pathElem.action); // Status icon
ti.contextValue = "diffable";
```

**After:**
```typescript
const pathElem = element.data as ISvnLogEntryPath;
const basename = path.basename(pathElem._);
const dirname = path.dirname(pathElem._);
const actionBadge = getActionBadge(pathElem.action); // M, A, D, etc.

ti = new TreeItem(basename, TreeItemCollapsibleState.None);
ti.description = dirname ? `${dirname} • ${actionBadge}` : actionBadge;
ti.tooltip = nm.parse(pathElem._).relativeFromBranch;

// Use resourceUri to get file type icon from VS Code
const cached = this.getCached(element);
const parsedPath = cached.repo.getPathNormalizer().parse(pathElem._);
if (parsedPath.localFullPath) {
  ti.resourceUri = parsedPath.localFullPath; // VS Code shows file icon
}

ti.contextValue = "diffable";
```

### New Helper Function

Add to `src/historyView/common.ts`:

```typescript
export function getActionBadge(action: string): string {
  switch (action) {
    case "A": return "A";
    case "D": return "D";
    case "M": return "M";
    case "R": return "R";
    default: return action;
  }
}
```

---

## Result

Files will display as:
- **[📄] App.tsx** `src/components • M`
- **[📄] utils.ts** `src/helpers • A`
- **[📄] old.js** `legacy • D`

---

## Testing

1. Open repository log
2. Expand a commit
3. Verify files show:
   - Correct file type icon (not status icon)
   - Filename as label
   - Path + status badge in description

---

**Effort**: 10 minutes
**Risk**: Low (cosmetic change only)
