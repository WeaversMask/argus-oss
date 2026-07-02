// Argus lint-staged config — SKIP-aware task selection.
//
// This file (not package.json) holds the config because the pre-commit
// SKIP contract requires env-aware tasks: SKIP=lint drops the ESLint task,
// SKIP=format drops the Prettier task, in a single lint-staged invocation.
// Prettier auto-fixes and re-stages; ESLint is check-only on staged files —
// auto-fixing lint findings would silently mutate logic-adjacent code.
import process from "node:process";

const skipped = new Set((process.env.SKIP ?? "").split(","));

const tasks = {};
if (!skipped.has("lint")) {
  tasks["*.{js,mjs,cjs,ts,tsx}"] = "eslint --max-warnings=0";
}
if (!skipped.has("format")) {
  tasks["*"] = "prettier --write --ignore-unknown";
}

export default tasks;
