import { describe, expect, it } from "vitest";
import { TreeSitterAstParser } from "../../src/index.js";
import { someFile } from "../helpers.js";

/**
 * P1-03 acceptance criterion, as an executable benchmark: parsing a
 * 1000-line TypeScript file completes in <100ms on M2 (maintainer-approved
 * 2026-07-07 — the number must be asserted, not documented). Includes the
 * full port path: wasm parse + conversion to frozen domain nodes.
 *
 * On shared CI runners the budget is widened to 500ms — the phase notes
 * sanction gating CI on gross regressions only; the precise M2 number is
 * asserted locally, where `CI` is unset.
 */
// Truthiness, not presence: `CI=""` in a local shell must keep the strict
// budget (review nit, P1-03).
const BUDGET_MS = process.env["CI"] ? 500 : 100;
const WARMUP_RUNS = 3;
const MEASURED_RUNS = 15;

function generateTypescript(minLines: number): string {
  const blocks: string[] = [];
  for (let i = 0; blocks.length * 10 < minLines; i += 1) {
    blocks.push(
      [
        `export interface Payload${String(i)} {`,
        `  readonly id: number;`,
        `  readonly tags: readonly string[];`,
        `}`,
        ``,
        `export function process${String(i)}(payload: Payload${String(i)}, scale = ${String(i)}): number {`,
        `  const weight = payload.tags.filter((tag) => tag.length > ${String(i % 7)}).length;`,
        `  return payload.id * scale + weight;`,
        `}`,
        ``,
      ].join("\n"),
    );
  }
  return blocks.join("\n");
}

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

describe("parse benchmark (P1-03 acceptance)", () => {
  it(
    `parses a 1000-line TypeScript file in <${String(BUDGET_MS)}ms (median of ${String(MEASURED_RUNS)})`,
    { timeout: 30_000 },
    async () => {
      const source = generateTypescript(1000);
      expect(source.split("\n").length).toBeGreaterThanOrEqual(1000);

      const parser = new TreeSitterAstParser();
      const file = someFile("bench/generated-1000.ts");
      for (let i = 0; i < WARMUP_RUNS; i += 1) {
        (await parser.parse(file, source, "typescript"))._unsafeUnwrap();
      }

      const samples: number[] = [];
      for (let i = 0; i < MEASURED_RUNS; i += 1) {
        const startedAt = performance.now();
        const result = await parser.parse(file, source, "typescript");
        samples.push(performance.now() - startedAt);
        expect(result.isOk()).toBe(true);
      }

      const medianMs = median(samples);
      console.log(
        `parse 1000-line TS: median ${medianMs.toFixed(1)}ms, min ${Math.min(...samples).toFixed(1)}ms, max ${Math.max(...samples).toFixed(1)}ms over ${String(MEASURED_RUNS)} runs (budget ${String(BUDGET_MS)}ms)`,
      );
      expect(medianMs).toBeLessThan(BUDGET_MS);
    },
  );
});
