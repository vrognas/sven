/**
 * Input validation framework to prevent command injection attacks
 */

/**
 * Validates changelist names to prevent command injection
 * Allows only alphanumeric characters, hyphens, and underscores
 */
export function validateChangelist(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Valid accept actions for SVN merge operations
 */
const VALID_ACCEPT_ACTIONS = [
  'postpone',
  'base',
  'mine-conflict',
  'theirs-conflict',
  'mine-full',
  'theirs-full',
  'edit',
  'launch',
  'working'
] as const;

/**
 * Validates accept action parameter for merge operations
 * Uses strict allowlist to prevent command injection
 */
export function validateAcceptAction(action: string): boolean {
  if (!action || typeof action !== 'string') {
    return false;
  }
  return VALID_ACCEPT_ACTIONS.includes(action as typeof VALID_ACCEPT_ACTIONS[number]);
}

/**
 * Validates search patterns to prevent command injection
 * Rejects shell metacharacters that could be exploited
 */
export function validateSearchPattern(pattern: string): boolean {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }
  // Reject shell metacharacters: | ; $ ( ) [ ] { } ` \
  return !/[|;$()[\]{}`\\]/.test(pattern);
}

/**
 * Valid SVN revision keywords
 */
const VALID_REVISION_KEYWORDS = ['HEAD', 'PREV', 'BASE', 'COMMITTED'] as const;

/**
 * Validates revision parameter for SVN operations
 * Allows numeric revisions and standard SVN keywords
 */
export function validateRevision(revision: string): boolean {
  if (!revision || typeof revision !== 'string') {
    return false;
  }

  // Check if it's a valid keyword
  if (VALID_REVISION_KEYWORDS.includes(revision as typeof VALID_REVISION_KEYWORDS[number])) {
    return true;
  }

  // Check if it's a valid numeric revision (with optional + prefix)
  return /^\+?(0|[1-9]\d*)$/.test(revision);
}

/**
 * Validates file paths to prevent path traversal attacks
 * Rejects paths containing '..' segments or starting with '/'
 */
export function validateFilePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Reject paths with .. segments or absolute paths
  return !path.includes('..') && !path.startsWith('/') && !path.startsWith('\\');
}

/**
 * Validates URLs to prevent SSRF attacks
 * - Allows only: http, https, svn, svn+ssh protocols
 * - Rejects file:// URLs
 * - Blocks localhost, private IPs, and metadata endpoints
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Protocol validation: allow only safe protocols
    const allowedProtocols = ['http:', 'https:', 'svn:', 'svn+ssh:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Extract hostname for IP validation
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }

    // Block private IP ranges (SSRF prevention)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);

    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);

      // Validate octets
      if (a > 255 || b > 255 || c > 255 || d > 255) {
        return false;
      }

      // Block private IP ranges
      if (
        a === 10 ||                           // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
        (a === 192 && b === 168) ||           // 192.168.0.0/16
        (a === 169 && b === 254) ||           // 169.254.0.0/16 (link-local, AWS metadata)
        a === 127                             // 127.0.0.0/8 (loopback)
      ) {
        return false;
      }
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

export const validators = {
  changelist: validateChangelist,
  acceptAction: validateAcceptAction,
  searchPattern: validateSearchPattern,
  revision: validateRevision,
  filePath: validateFilePath,
  url: validateUrl
};
