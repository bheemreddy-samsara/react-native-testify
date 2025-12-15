/**
 * Parse --filter argument from CLI args.
 * Supports: --filter "Pattern" or --filter="Pattern"
 */
export function parseFilterArg(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--filter=')) {
      return arg.slice('--filter='.length);
    }
    if (arg === '--filter' && args[i + 1] && !args[i + 1].startsWith('-')) {
      return args[i + 1];
    }
  }
  return null;
}

/**
 * Convert glob pattern to regex.
 * Supports: * (any chars), ? (single char), ! prefix (exclude)
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/**
 * Filter components by pattern(s).
 * Supports comma-separated patterns and ! prefix for exclusion.
 *
 * Examples:
 *   "Button/*" - matches Button_Primary, Button_Secondary
 *   "Card_*,Badge_*" - matches Card_Simple, Badge_Success
 *   "!*_Disabled" - excludes anything ending with _Disabled
 *   "Button_*,!Button_Disabled" - Button variants except disabled
 */
export function filterComponents(
  components: string[],
  filterPattern: string | null,
): string[] {
  if (!filterPattern) {
    return components;
  }

  const patterns = filterPattern.split(',').map((p) => p.trim());
  const includePatterns: RegExp[] = [];
  const excludePatterns: RegExp[] = [];

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) {
      excludePatterns.push(globToRegex(pattern.slice(1)));
    } else {
      includePatterns.push(globToRegex(pattern));
    }
  }

  return components.filter((component) => {
    // If excluded, reject
    if (excludePatterns.some((re) => re.test(component))) {
      return false;
    }
    // If no include patterns, accept all non-excluded
    if (includePatterns.length === 0) {
      return true;
    }
    // Otherwise, must match at least one include pattern
    return includePatterns.some((re) => re.test(component));
  });
}
