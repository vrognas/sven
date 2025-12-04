# Set Auto-Lock Property

Mark files that should always require locking before editing.

## What is svn:needs-lock?

A property that:

- Makes the file **read-only** by default
- Becomes writable only when locked
- Reminds users to lock before editing

## Set the Property

1. Right-click a file
2. Select **SVN: Toggle Needs-Lock**
3. Commit the property change

## Effect

After setting:

- File appears read-only in your editor
- Must lock to edit
- Lock icon indicates status

## Best For

- Binary files (images, videos, docs)
- Generated files that shouldn't be hand-edited
- Files with frequent merge conflicts

## Remove Property

Run **SVN: Toggle Needs-Lock** again to remove.

## Tip

Set this property on binary files at project setup time.
