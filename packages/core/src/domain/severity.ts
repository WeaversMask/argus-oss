/** All severities, ordered from least to most severe. */
export const SEVERITIES = Object.freeze(["info", "warning", "error", "critical"] as const);

export type Severity = (typeof SEVERITIES)[number];

export function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}

/** Total order for sorting and filtering: info < warning < error < critical. */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITIES.indexOf(a) - SEVERITIES.indexOf(b);
}

export function severityAtLeast(value: Severity, floor: Severity): boolean {
  return compareSeverity(value, floor) >= 0;
}
