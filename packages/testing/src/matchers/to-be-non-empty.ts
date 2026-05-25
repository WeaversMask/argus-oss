import type { MatcherResult, MatcherState } from "vitest";

/**
 * Passes when the received value is a non-empty `string`, `Array`, `Map`,
 * `Set`, or plain object. The shape check is intentionally narrow — if you
 * need a different definition of "empty", use a direct `.toEqual` or write
 * a domain-specific matcher.
 */
export function toBeNonEmpty(this: MatcherState, received: unknown): MatcherResult {
  const pass = isNonEmpty(received);

  return {
    pass,
    message: () =>
      `Expected value ${this.isNot ? "not " : ""}to be non-empty, ` +
      `received ${this.utils.printReceived(received)}`,
    actual: received,
  };
}

function isNonEmpty(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Map || value instanceof Set) return value.size > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}
