# Lock a File

Prevent others from editing while you work on a file.

## When to Lock

- Binary files (images, PDFs, Office docs)
- Files that can't be merged
- Critical files needing exclusive access

## How to Lock

**Option 1: Context Menu**

1. Right-click file in Explorer
2. Select **SVN: Lock**

**Option 2: Source Control**

1. Right-click file in Source Control view
2. Select **SVN: Lock**

## Lock Comment

You can add a comment explaining why you're locking:

- Helps teammates understand your intent
- Shows in lock information

## Check Lock Status

- Locked files show a lock icon
- Hover to see who holds the lock
- Run **SVN: Refresh** to update lock status

## Tip

Always lock binary files before editing to avoid conflicts.
