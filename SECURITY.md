# Security

## Credential Handling

### Password Security (SVN 1.9+)

For SVN version 1.9 and later, this extension uses **stdin password input** to prevent credential exposure in the process list. Passwords are never passed as command-line arguments, eliminating the risk of:

- Process list exposure (`ps`, `top`, Task Manager)
- System audit logs
- Process monitoring tools
- Shell history leakage

**Implementation:**
- Uses `--password-from-stdin` flag
- Writes password directly to process stdin
- Password immediately cleared from memory after use

### Password Security (SVN 1.6-1.8)

**WARNING:** For SVN versions 1.6 through 1.8, the `--password` command-line argument is used as a fallback because these versions do not support stdin password input.

**Security Implications:**
- Passwords may be visible in process listings
- Risk of exposure through system monitoring
- Temporary visibility in process arguments

**Mitigations:**
- Use SVN 1.9+ for production environments
- Enable SVN credential storage to avoid repeated password entry
- Use SSH keys for repository authentication when possible
- Limit process monitoring access

### Authentication Best Practices

1. **Upgrade to SVN 1.9+** for secure credential handling
2. **Use SVN credential storage** to cache credentials securely
3. **Prefer SSH authentication** over username/password when available
4. **Rotate credentials regularly** if using older SVN versions
5. **Monitor access logs** for unauthorized access attempts

### Credential Storage

This extension uses VS Code's `SecretStorage` API to store credentials securely:
- Credentials encrypted by VS Code
- Stored per repository URL
- Multiple accounts supported per repository
- Auto-retry on authentication failure

### Security Audit Trail

Password handling locations:
- `src/svn.ts:114-123` - exec() method
- `src/svn.ts:275-284` - execBuffer() method

Version check:
- `src/svn.ts:84` - supportsStdinPassword flag

## Reporting Security Issues

If you discover a security vulnerability, please email security@vrognas.dev instead of using the issue tracker.
