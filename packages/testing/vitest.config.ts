import { defineProjectConfig } from "./src/config.js";

export default defineProjectConfig({
  test: {
    name: "@argus/testing",
    setupFiles: ["./src/setup.ts"],
  },
});
