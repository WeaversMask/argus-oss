/**
 * The side-effecting surface the CLI touches, injected so every command is a
 * pure function of `(args, io)` and fully testable without spawning a process
 * or capturing global streams. `cli.ts` wires the real `process` streams and
 * cwd; tests pass capturing fakes.
 */
export interface CliIO {
  /** Write to standard output (no trailing newline is added). */
  readonly stdout: (text: string) => void;
  /** Write to standard error (no trailing newline is added). */
  readonly stderr: (text: string) => void;
  /** The directory the command runs relative to. */
  readonly cwd: string;
}
