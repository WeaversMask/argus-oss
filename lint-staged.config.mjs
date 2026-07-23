// Argus lint-staged config — SKIP-aware task selection.
//
// This file (not package.json) holds the config because the pre-commit
// SKIP contract requires env-aware tasks: SKIP=lint drops the ESLint task,
// SKIP=format drops the Prettier task, in a single lint-staged invocation.
// Prettier auto-fixes and re-stages; ESLint is check-only on staged files —
// auto-fixing lint findings would silently mutate logic-adjacent code.
import process from "node:process";

const skipped = new Set(
  (process.env.SKIP ?? "").split(",").map((token) => token.trim().toLowerCase()),
);

const tasks = {};
if (!skipped.has("lint")) {
  // --no-warn-ignored: lint-staged passes staged paths explicitly, so a file
  // matching an eslint.config.mjs ignore (e.g. rules-builtin test fixtures)
  // would otherwise emit a "File ignored" warning that --max-warnings=0 turns
  // into a commit failure. The flag skips deliberately-ignored files silently
  // without weakening linting of everything else.
  tasks["*.{js,mjs,cjs,ts,tsx,mts,cts}"] = "eslint --max-warnings=0 --no-warn-ignored";
}
if (!skipped.has("format")) {
  tasks["*"] = "prettier --write --ignore-unknown";
}

export default tasks;
