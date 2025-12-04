# Enable Sparse Checkout

For large repositories, download only the folders you need.

## What is Sparse Checkout?

- Download a subset of the repository
- Reduce disk usage and sync time
- Perfect for monorepos or large projects

## Enable Sparse Mode

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "svn sparse"
3. Enable **Svn > Sparse: Enabled**

Or add to settings.json:

```json
"svn.sparse.enabled": true
```

## What Happens

- **Selective Download** view appears in Source Control
- You can browse server contents without downloading
- Choose exactly which folders to include

## Tip

Enable sparse checkout before cloning large repositories for best results.
