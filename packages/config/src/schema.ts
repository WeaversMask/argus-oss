import { z } from "zod";
import { LANGUAGES, SEVERITIES, ruleId } from "@argus/core";

const SEVERITY_OR_OFF = [...SEVERITIES, "off"] as const;
const severityOrOffSchema = z.enum(SEVERITY_OR_OFF);

const SEVERITY_HINT = SEVERITY_OR_OFF.map((value) => `"${value}"`).join(" | ");

/**
 * One rule's setting: either shorthand (`style/no-let: error`) or the long
 * form with rule-specific options
 * (`style/no-let: { severity: error, options: { … } }`).
 *
 * The union carries a custom error: zod's generic invalid-union "Invalid
 * input" never tells the user the valid severity set, and this is the
 * most-edited field in the file (review finding, #26).
 */
export const ruleSettingSchema = z.union(
  [
    severityOrOffSchema,
    z.strictObject({
      severity: severityOrOffSchema,
      options: z.record(z.string(), z.unknown()).optional(),
    }),
  ],
  {
    error: () => `must be a severity (${SEVERITY_HINT}) or an object { severity, options }`,
  },
);

export type RuleSetting = z.infer<typeof ruleSettingSchema>;

/**
 * The `reviewtool.yaml` document schema (v1). Strict: unknown keys are
 * validation errors — a typoed key must fail loudly, not silently
 * deactivate a setting. Rule ids are validated through core's `ruleId`
 * factory so config and domain agree on the vocabulary.
 *
 * Deliberately absent in v1: `suppressions:` (needs id/`createdAt` design,
 * deferred to Phase 2 — see P1-05 work notes) and `layers:` (P3-01 owns
 * that section).
 */
export const rawConfigSchema = z
  .strictObject({
    /** Configs to inherit from, resolved relative to this file. Later entries and this file win. */
    extends: z.union([z.string(), z.array(z.string())]).optional(),
    /** Languages to scan. Defaults to every supported language. */
    languages: z.array(z.enum(LANGUAGES)).optional(),
    /** Glob patterns of paths to skip. */
    ignore: z.array(z.string()).optional(),
    /** Rule activations keyed by rule id. */
    rules: z.record(z.string(), ruleSettingSchema).optional(),
  })
  .superRefine((config, context) => {
    for (const key of Object.keys(config.rules ?? {})) {
      const parsed = ruleId(key);
      if (parsed.isErr()) {
        context.addIssue({
          code: "custom",
          path: ["rules", key],
          message: `invalid rule id: ${parsed.error.issues[0]?.message ?? "malformed"}`,
        });
      }
    }
  });

/** The validated shape of one config document, before merging and defaults. */
export type RawConfig = z.infer<typeof rawConfigSchema>;
