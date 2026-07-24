import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CliIO } from "../src/io.js";

/** A {@link CliIO} that records everything written, for assertions. */
export interface CaptureIO extends CliIO {
  /** Everything written to stdout so far, concatenated. */
  out(): string;
  /** Everything written to stderr so far, concatenated. */
  err(): string;
}

export function captureIO(cwd: string): CaptureIO {
  const outChunks: string[] = [];
  const errChunks: string[] = [];
  return {
    cwd,
    stdout: (text) => {
      outChunks.push(text);
    },
    stderr: (text) => {
      errChunks.push(text);
    },
    out: () => outChunks.join(""),
    err: () => errChunks.join(""),
  };
}

/** Creates a throwaway temp directory; returns it plus a cleanup function. */
export function tempDir(): { readonly dir: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "argus-cli-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
