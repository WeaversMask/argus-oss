/**
 * Minimal pure glob matcher for the domain's path patterns (layer
 * `patterns`, suppression `pathPattern`). The core stays
 * zero-infrastructure, so this is hand-rolled rather than a library:
 *
 * - `**` matches **zero or more whole path segments** — `packages/core/**`
 *   matches `packages/core`, `packages/core/a.ts`, and deeper. (Simpler
 *   than micromatch, which special-cases the zero-segment match;
 *   documented deviation.)
 * - `*` matches any run of characters **within** a segment (never `/`).
 * - `?` matches exactly one character within a segment.
 * - Everything else is literal, case-sensitive. No negation, braces, or
 *   extglobs — unsupported syntax matches literally.
 *
 * Paths are compared as given (project-root-relative, `/`-separated).
 * Iterative backtracking, no regex compiled from user input (no ReDoS
 * surface); worst case O(pattern × path).
 */
export function matchGlob(pattern: string, path: string): boolean {
  const patternSegments = pattern.split("/");
  const pathSegments = path.split("/");
  let p = 0;
  let t = 0;
  let starPattern = -1;
  let starPath = -1;
  for (;;) {
    const current = pathSegments[t];
    if (current === undefined) {
      break; // path fully consumed
    }
    const segment = patternSegments[p];
    if (segment === "**") {
      starPattern = p;
      starPath = t;
      p += 1;
    } else if (segment !== undefined && matchSegment(segment, current)) {
      p += 1;
      t += 1;
    } else if (starPattern !== -1) {
      // Backtrack: let the last `**` swallow one more segment.
      starPath += 1;
      t = starPath;
      p = starPattern + 1;
    } else {
      return false;
    }
  }
  while (patternSegments[p] === "**") {
    p += 1;
  }
  return p === patternSegments.length;
}

/** One segment against one pattern segment (`*`, `?`, literals). */
function matchSegment(pattern: string, text: string): boolean {
  let p = 0;
  let t = 0;
  let starIndex = -1;
  let starText = -1;
  for (;;) {
    const character = text[t];
    if (character === undefined) {
      break; // segment fully consumed
    }
    const patternCharacter = pattern[p];
    if (patternCharacter === "*") {
      starIndex = p;
      starText = t;
      p += 1;
    } else if (patternCharacter === "?" || patternCharacter === character) {
      p += 1;
      t += 1;
    } else if (starIndex !== -1) {
      starText += 1;
      t = starText;
      p = starIndex + 1;
    } else {
      return false;
    }
  }
  while (pattern[p] === "*") {
    p += 1;
  }
  return p === pattern.length;
}
