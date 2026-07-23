/** Parses input. */
export function parse(input: string): string;
export function parse(input: number): number;
export function parse(input: unknown): unknown {
  return input;
}
