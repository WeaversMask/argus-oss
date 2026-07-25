import { builtinRules } from "@argus/rules-builtin";
import type { CliIO } from "./io.js";
import { EXIT_ERROR, EXIT_OK } from "./exit-codes.js";

/**
 * Describes one built-in rule: its id, name, default severity, docs link (when
 * present), and full description. An unknown id lists the known ids and exits
 * with an error — a mistyped rule is a usage error, not a silent no-op.
 */
export function runExplain(ruleIdArg: string, io: CliIO): number {
  const module = builtinRules.find((candidate) => candidate.rule.id === ruleIdArg);

  if (module === undefined) {
    io.stderr(`argus: unknown rule "${ruleIdArg}".\n`);
    io.stderr(`Known rules:\n`);
    for (const candidate of builtinRules) {
      io.stderr(`  ${candidate.rule.id}\n`);
    }
    return EXIT_ERROR;
  }

  const { rule } = module;
  io.stdout(`${rule.id}\n`);
  io.stdout(`  name:     ${rule.name}\n`);
  io.stdout(`  severity: ${rule.defaultSeverity} (default)\n`);
  if (rule.docsUrl !== undefined) {
    io.stdout(`  docs:     ${rule.docsUrl}\n`);
  }
  io.stdout(`\n${rule.description}\n`);
  return EXIT_OK;
}
