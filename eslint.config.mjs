// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/*.min.js",
      ".bin/**",
      // Stryker sandbox + generated mutation reports (OPS-04c). Flat config
      // does not honor .gitignore; the sandbox contains a full tree copy,
      // which also makes typescript-eslint see two candidate project roots.
      ".stryker-tmp/**",
      "reports/**",
      // Session-local agent infrastructure (untracked); worktrees under it
      // hold full repo copies.
      ".claude/**",
      // Built-in rule fixtures (P2-01) are parsed as *data* by the tree-sitter
      // adapter, not compiled: deliberately unconventional source, references
      // to non-existent modules, and bare test globals. They are excluded from
      // every package tsconfig, so typed linting cannot resolve them either.
      "packages/rules-builtin/tests/fixtures/**",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },

  {
    files: ["**/*.{test,spec}.{ts,tsx}", "**/tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },

  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      // A `.cjs` file's entire point is CommonJS — the block above declares
      // `require` a real global for exactly this reason. Banning the import
      // style this extension exists to allow was never intentional; it just
      // never came up before a `.cjs` config needed to require() a sibling
      // (dependency-cruiser-rules.cjs, P2-06).
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  prettier,
);
