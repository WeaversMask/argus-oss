import pkg from "../package.json" with { type: "json" };

/** The CLI's version, read from its own `package.json` so the two never drift. */
export const CLI_VERSION: string = pkg.version;
