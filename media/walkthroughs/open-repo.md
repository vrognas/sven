# Open a Repository

You can either open an existing working copy or checkout a new repository.

## Open Existing Working Copy

1. **File > Open Folder**
2. Select a folder containing a `.svn` directory
3. The extension activates automatically

## Checkout New Repository

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **SVN: Checkout**
2. **Repository URL** — enter or pick from recent URLs (`http`, `https`, `svn`, `svn+ssh`)
3. **Parent directory** — choose where to place the checkout (defaults to `sven.defaultCheckoutDirectory`)
4. **Folder name** — defaults to the repo name from the URL
5. **Download depth** — pick how much to fetch:
   - **Shallow** (recommended) — files + empty subfolders; use Selective Download to add more later
   - **Folder Only** — empty placeholder, fastest
   - **Files Only** — root files, no subfolders
   - **Full** — everything recursively (can be slow for large repos)
   - Optionally select **Omit Externals** to skip `svn:externals`
6. After checkout, choose to **Open Repository** in a new window or **Add to Workspace**

## Verify Connection

Once opened, you should see:

- SVN status bar item (bottom left)
- Source Control view populated with your changes
