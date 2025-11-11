import picomatch from "picomatch";

/**
 * Pre-compiled matcher cache for performance optimization
 * Reduces O(n²) overhead by reusing picomatch instances
 */
interface PicomatchOptions {
  dot?: boolean;
  matchBase?: boolean;
}

interface MatcherCache {
  patterns: readonly string[];
  opts: PicomatchOptions;
  matchers: Array<{ pattern: string; isExclusion: boolean; matcher: picomatch.Matcher }>;
}

let cachedMatcher: MatcherCache | null = null;

function getCachedMatchers(
  patterns: readonly string[],
  opts: PicomatchOptions = {}
): MatcherCache["matchers"] {
  const optsKey = JSON.stringify(opts);

  // Check if cache is valid
  if (
    cachedMatcher &&
    cachedMatcher.patterns === patterns &&
    JSON.stringify(cachedMatcher.opts) === optsKey
  ) {
    return cachedMatcher.matchers;
  }

  // Build new cache
  const matchers = patterns.map(pattern => ({
    pattern,
    isExclusion: pattern[0] === "!",
    matcher: picomatch(pattern, opts)
  }));

  cachedMatcher = { patterns, opts, matchers };
  return matchers;
}

export function matchAll(
  path: string,
  patterns: readonly string[],
  opts: PicomatchOptions = {}
): boolean {
  if (!patterns.length) {
    return false;
  }

  const matchers = getCachedMatchers(patterns, opts);
  let match = false;

  for (const { isExclusion, matcher } of matchers) {
    // If we've got a match, only re-test for exclusions.
    // if we don't have a match, only re-test for inclusions.
    if (match !== isExclusion) {
      continue;
    }

    match = matcher(path);
  }

  return match;
}

export function match(pattern: string) {
  return picomatch(pattern);
}

/**
 * Clear the matcher cache (useful for testing or config changes)
 */
export function clearMatcherCache(): void {
  cachedMatcher = null;
}
