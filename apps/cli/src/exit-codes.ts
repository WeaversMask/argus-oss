/**
 * Process exit codes, following the convention in the phase-02 spec:
 * `0` clean, `1` violations found, `2` operational error (bad usage, config
 * failure, path not found, or a file that could not be parsed/analysed).
 */
export const EXIT_OK = 0;
export const EXIT_VIOLATIONS = 1;
export const EXIT_ERROR = 2;
