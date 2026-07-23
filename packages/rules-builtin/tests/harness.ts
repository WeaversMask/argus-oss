import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Result } from "neverthrow";
import { filePath } from "@argus/core";
import type { Language, RuleExecutionError, Severity, Violation } from "@argus/core";
import { TreeSitterAstParser } from "@argus/ast";
import { Engine } from "@argus/rule-engine";
import type { RuleModule } from "@argus/rule-engine";

/**
 * Test harness for the built-in rules: parse real source with the real
 * tree-sitter adapter, run it through a real `Engine` with the rule under
 * test activated, and return the violations. No mocking of own code
 * (principles §Testing) — this exercises the exact path `argus check` will.
 *
 * One parser instance per process: grammar wasm is unfreeable, so churn leaks
 * (P1-03 / HANDOVER wiring note).
 */
const parser = new TreeSitterAstParser();

const EXT_LANGUAGE: Readonly<Record<string, Language>> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
};

/** Maps a file path's extension to its parse language; defaults to TypeScript. */
export function languageForPath(path: string): Language {
  const ext = path.slice(path.lastIndexOf(".") + 1);
  return EXT_LANGUAGE[ext] ?? "typescript";
}

export interface RunOptions {
  readonly file?: string;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly severity?: Severity;
  readonly language?: Language;
}

/** Parses `source` and runs `module` over it, returning the raw engine `Result`. */
export async function runRuleResult(
  module: RuleModule,
  source: string,
  opts: RunOptions = {},
): Promise<Result<readonly Violation[], RuleExecutionError>> {
  const file = filePath(opts.file ?? "src/fixture.ts")._unsafeUnwrap();
  const language = opts.language ?? languageForPath(opts.file ?? "src/fixture.ts");
  const parsed = (await parser.parse(file, source, language))._unsafeUnwrap();

  const engine = new Engine();
  engine.register(module)._unsafeUnwrap();
  return engine.run({
    parsed,
    activations: [
      {
        ruleId: module.rule.id,
        severity: opts.severity ?? module.rule.defaultSeverity,
        options: opts.options ?? {},
      },
    ],
  });
}

/** Parses `source` and runs `module` over it, returning the reported violations. */
export async function runRule(
  module: RuleModule,
  source: string,
  opts: RunOptions = {},
): Promise<readonly Violation[]> {
  return (await runRuleResult(module, source, opts))._unsafeUnwrap();
}

export interface Fixture {
  readonly name: string;
  readonly source: string;
  readonly language: Language;
  readonly file: string;
}

const FIXTURES_ROOT = join(import.meta.dirname, "fixtures");

/**
 * Loads every fixture file under `tests/fixtures/<category>/<rule>/<kind>`.
 * File extension drives the parse language, so a rule can mix `.ts` and `.js`
 * cases in one folder.
 */
export function loadFixtures(rulePath: string, kind: "valid" | "invalid"): readonly Fixture[] {
  const dir = join(FIXTURES_ROOT, rulePath, kind);
  return readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .sort()
    .map((name) => {
      const rel = `src/${name}`;
      return {
        name,
        source: readFileSync(join(dir, name), "utf8"),
        language: languageForPath(name),
        file: rel,
      };
    });
}
