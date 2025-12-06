# Update Working Copy

Pull the latest changes from the server into your local files.

## How to Update

1. Open Source Control view
2. Click **Update** in the SCM title bar
3. Or run **SVN: Update** from Command Palette

## What Happens

- Server changes merge into your local files
- Modified files are updated in-place
- Conflicts are marked if your changes overlap

## Handling Conflicts

If conflicts occur:

1. Files are marked with conflict status
2. Open the file to see conflict markers
3. Edit to resolve
4. Run **SVN: Resolve** to mark as resolved

## Tip

Update frequently to minimize merge conflicts.
