import { defineProjectConfig } from "@argus/testing/config";

export default defineProjectConfig({
  test: {
    name: "@argus/cli",
    coverage: {
      exclude: [
        // src/cli.ts is the process entry point: it reads process.argv, calls
        // run(), and sets process.exitCode. It carries no branching logic of
        // its own and is exercised end-to-end through bin/argus.mjs, not in
        // unit tests — run() (main.ts) and every command are covered directly.
        "src/cli.ts",
      ],
    },
  },
});
