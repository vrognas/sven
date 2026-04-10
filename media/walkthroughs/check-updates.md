# Check for Incoming Changes

Before starting work, see what others have committed.

## Manual Check

1. Open Source Control view
2. Click the **Refresh** icon in the Incoming Changes header
3. Or run **SVN: Refresh Remote Changes** from Command Palette

## Automatic Checks

Include remote checks with every refresh:

```json
"sven.refresh.remoteChanges": true
```

## What You'll See

- List of changed files on the server
- Revision numbers and authors
- Click to preview changes before updating
