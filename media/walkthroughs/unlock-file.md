# Unlock Files

Release locks when you're done editing.

## Automatic Unlock

Committing a locked file **automatically releases the lock**.

This is the recommended workflow:

1. Lock file
2. Edit file
3. Commit → Lock released

## Manual Unlock

To unlock without committing:

1. Right-click the file
2. Select **SVN: Unlock**

## Steal Lock

If someone else holds the lock and is unavailable:

1. Right-click the file in Source Control view
2. Select **SVN: Steal Lock**
3. You now have the lock

⚠️ Use with caution — may cause lost work.

## Break Lock (Admin)

Repository admins can break any lock via **SVN: Break Lock** in the Source Control view context menu.

## Tip

Communicate with teammates before stealing locks.
