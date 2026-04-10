# Verify SVN Installation

SVN (Subversion) command-line tools must be installed for this extension to work.

## Check Installation

Open a terminal and run:

```bash
svn --version
```

You should see version information like:

```
svn, version 1.14.x (r1234567)
```

**Note:** SVN >= 1.6 is required. The extension will not activate with older versions.

## Install SVN

If not installed:

- **Windows**: Download from [TortoiseSVN](https://tortoisesvn.net/) (includes CLI) or [Apache builds](https://subversion.apache.org/packages.html#windows)
- **macOS**: `brew install svn`
- **Linux**: `apt install subversion` or `yum install subversion`
