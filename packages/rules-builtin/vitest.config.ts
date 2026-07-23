import { configDefaults } from "vitest/config";
import { defineProjectConfig } from "@argus/testing/config";

export default defineProjectConfig({
  test: {
    name: "@argus/rules-builtin",
    // Fixtures under tests/fixtures are parsed as data by the rules; some are
    // themselves named `*.test.ts` (the no-empty-test corpus) and must never
    // be collected as Vitest suites.
    exclude: [...configDefaults.exclude, "tests/fixtures/**"],
  },
});
