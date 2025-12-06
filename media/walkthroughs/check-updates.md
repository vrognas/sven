# Check for Incoming Changes

Before starting work, see what others have committed.

## Manual Check

1. Open Source Control view
2. Click the **Refresh** icon in the Incoming Changes header
3. Or run **SVN: Refresh Remote Changes** from Command Palette

## Automatic Checks

Enable automatic polling in settings:

```json
"svn.sourceControl.checkForIncomingChanges": true,
"svn.sourceControl.checkForIncomingChangesInterval": 300
```

This checks every 5 minutes (300 seconds).

## What You'll See

- List of changed files on the server
- Revision numbers and authors
- Click to preview changes before updating
