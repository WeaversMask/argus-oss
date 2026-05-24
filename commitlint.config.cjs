/**
 * Restricts commit types to the set enumerated in docs/plan/00-principles.md.
 * Conventional-commits format: type(scope?): subject
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "chore", "refactor", "docs", "test"]],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [1, "always", 100],
  },
};
