import { describe, expect, it } from "vitest";
import { Engine } from "../../src/index.js";
import {
  NODE_TYPES,
  activationOf,
  collectNodes,
  inputOf,
  moduleOf,
  syntheticTree,
} from "../helpers.js";
import { BASELINE } from "./baseline.js";

/**
 * P1-04 acceptance criterion, as an executable benchmark: a no-op file of
 * 1000 nodes with 50 registered rules runs in <50ms — asserted locally,
 * where `CI` is unset (truthiness, not presence: `CI=""` keeps the strict
 * budget — P1-03 review nit, kept).
 *
 * On CI the budget is `BASELINE.medianMs × 20` instead: shared runners are
 * slower and noisier than the reference M2, so CI gates on gross
 * regressions only (maintainer-approved 2026-07-07). The factor still
 * catches the failure modes that matter — an accidental once-per-rule walk
 * is ~50×, an accidental quadratic far more. Median of 25 runs damps
 * runner noise.
 */
const LOCAL_BUDGET_MS = 50;
const CI_GROSS_REGRESSION_FACTOR = 20;
const BUDGET_MS = process.env["CI"]
  ? BASELINE.medianMs * CI_GROSS_REGRESSION_FACTOR
  : LOCAL_BUDGET_MS;
const WARMUP_RUNS = 5;
const MEASURED_RUNS = 25;

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

describe("engine benchmark (P1-04 acceptance)", () => {
  it(
    `dispatches ${String(BASELINE.rules)} no-op rules over ${String(BASELINE.nodes)} nodes in <${BUDGET_MS.toFixed(0)}ms (median of ${String(MEASURED_RUNS)})`,
    { timeout: 30_000 },
    async () => {
      const engine = new Engine();
      const activations = Array.from({ length: BASELINE.rules }, (_, index) => {
        const id = `bench-rule-${String(index).padStart(2, "0")}`;
        // Every rule gets one typed listener plus a wildcard listener, so
        // each of the 1000 nodes dispatches all 50 rules — the honest
        // worst case for the criterion, not a mostly-idle dispatch table.
        engine
          .register(
            moduleOf(id, {
              [NODE_TYPES[index % NODE_TYPES.length]!]: () => {
                /* no-op */
              },
              "*": () => {
                /* no-op */
              },
            }),
          )
          ._unsafeUnwrap();
        return activationOf(id);
      });

      const tree = syntheticTree(BASELINE.nodes);
      expect(collectNodes(tree)).toHaveLength(BASELINE.nodes);
      const input = inputOf(tree, activations);

      for (let i = 0; i < WARMUP_RUNS; i += 1) {
        (await engine.run(input))._unsafeUnwrap();
      }

      const samples: number[] = [];
      for (let i = 0; i < MEASURED_RUNS; i += 1) {
        const startedAt = performance.now();
        const result = await engine.run(input);
        samples.push(performance.now() - startedAt);
        expect(result.isOk()).toBe(true);
      }

      const medianMs = median(samples);
      console.log(
        `engine ${String(BASELINE.nodes)} nodes × ${String(BASELINE.rules)} rules: median ${medianMs.toFixed(2)}ms, min ${Math.min(...samples).toFixed(2)}ms, max ${Math.max(...samples).toFixed(2)}ms over ${String(MEASURED_RUNS)} runs (budget ${BUDGET_MS.toFixed(0)}ms, baseline ${String(BASELINE.medianMs)}ms)`,
      );
      expect(medianMs).toBeLessThan(BUDGET_MS);
    },
  );
});
