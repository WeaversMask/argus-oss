import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Language } from "@argus/core";

/**
 * The npm package and prebuilt wasm artifact backing each supported
 * language. The native bindings those same packages ship are deliberately
 * never loaded — their build scripts are blocked (`allowBuilds` in
 * `pnpm-workspace.yaml`) and only the wasm files are consumed (ADR-0005).
 *
 * `tree-sitter-typescript` also ships `tree-sitter-tsx.wasm`; TSX is not a
 * core `Language` yet, so it is not wired up here.
 */
const GRAMMARS: Record<Language, { readonly pkg: string; readonly wasmFile: string }> = {
  typescript: { pkg: "tree-sitter-typescript", wasmFile: "tree-sitter-typescript.wasm" },
  javascript: { pkg: "tree-sitter-javascript", wasmFile: "tree-sitter-javascript.wasm" },
  python: { pkg: "tree-sitter-python", wasmFile: "tree-sitter-python.wasm" },
};

const require = createRequire(import.meta.url);

/**
 * Absolute path to the prebuilt grammar wasm for `language`, resolved from
 * the installed grammar package. Throws if the package is not installed —
 * `TreeSitterAstParser` converts that into a `ParseError`.
 */
export function grammarWasmPath(language: Language): string {
  const grammar = GRAMMARS[language];
  return join(dirname(require.resolve(`${grammar.pkg}/package.json`)), grammar.wasmFile);
}
