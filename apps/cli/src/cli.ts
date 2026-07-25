import process from "node:process";
import { run } from "./main.js";

/**
 * Process entry point (launched by bin/argus.mjs). Wires the real streams and
 * cwd into `run` and mirrors its exit code onto `process.exitCode`. All logic
 * lives in `run` and the commands; this shim is deliberately branch-free.
 */
const code = await run(process.argv.slice(2), {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
  cwd: process.cwd(),
  env: process.env,
  isTTY: process.stdout.isTTY === true,
});
process.exitCode = code;
