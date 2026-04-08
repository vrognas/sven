# Security Policy

## Reporting a Vulnerability

**Do NOT file public GitHub issues for security vulnerabilities.**

Report privately via [GitHub Security Advisories](https://github.com/vrognas/sven/security/advisories).

Include: extension version, SVN version, OS, steps to reproduce, and potential impact.

### Response Timeline

| Severity | Response | Fix |
|----------|----------|-----|
| Critical | 48 hours | 1-3 days |
| High | 48 hours | 7-14 days |
| Medium | 7 days | 30 days |
| Low | 7 days | Next release |

## Privacy

**This extension collects zero user data.** No telemetry, analytics, tracking, or crash reporting.

All operations are local. The only external requests are to your configured SVN repository. Author avatars are generated locally (letter-based, no network calls).

Open source — verify: `grep -rE "telemetry|analytics|posthog|segment" src/ package.json`

## Security Features

### Credential Protection

- **SVN credential cache**: Stored in `~/.subversion/auth/svn.simple/` (mode 600). Never passed via CLI arguments.
- **OS keychain**: macOS Keychain, Windows Credential Manager, or Linux Secret Service (encrypted).
- **SSH keys**: Recommended. Managed by SSH agent, never exposed to extension code.

### Error Sanitization

All error messages are sanitized before logging — passwords, tokens, paths, URLs, and IP addresses are redacted. Debug mode (`svn.debug.disableSanitization: true`) temporarily disables this; disable immediately after use.

## Best Practices

1. **Use SSH** (`svn+ssh://`) or **HTTPS** — avoid plain HTTP
2. Keep `svn.debug.disableSanitization` set to `false`
3. Keep your SVN client updated
4. In CI/CD, use SSH keys — never `--password` flags

## Security Testing

- Unit tests for credential handling, error sanitization, and XML injection prevention
- Static analysis via ESLint security rules
- Dependency scanning via `npm audit`

## Contact

- **Vulnerabilities**: [Security Advisories](https://github.com/vrognas/sven/security/advisories)
- **Questions**: [GitHub Issues](https://github.com/vrognas/sven/issues)
