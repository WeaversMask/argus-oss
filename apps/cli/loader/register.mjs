import { register } from "node:module";

// Registers the `.js`→`.ts` resolve hook (hooks.mjs) on Node's module loader.
// Passed to Node via `--import` from bin/argus.mjs so the hook is active
// before src/cli.ts (and the rest of the raw-TS workspace) is loaded.
register("./hooks.mjs", import.meta.url);
