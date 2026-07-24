import type { Language } from "@argus/core";

/**
 * File extension → source language. Only extensions the `@argus/ast` adapter
 * has a grammar wired for appear here. TSX/JSX are deliberately absent: the
 * adapter wires the `typescript`/`javascript` grammars, not the JSX dialects
 * (see `@argus/ast` `languages.ts`), so `.tsx`/`.jsx` would misparse. Python
 * is included — the parser supports it — even though the built-in rules are
 * TS/JS today; `.py` files simply yield no findings until Python rules exist.
 */
const EXTENSION_LANGUAGE: Readonly<Record<string, Language>> = Object.freeze({
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
});

/** The language for a file extension (including the leading dot), or `undefined`. */
export function languageForExtension(extension: string): Language | undefined {
  return EXTENSION_LANGUAGE[extension.toLowerCase()];
}
