# Configuration

> `reviewtool.yaml` — what goes in it, how files inherit and layer, and what the errors mean. The schema ships with P1-05; rule names and CLI wiring arrive in Phase 2, so today this page documents the format itself.

Argus reads configuration from `reviewtool.yaml` (or `.yml`), discovered from the directory you run in upward — the nearest file wins, like ESLint.

## The file

```yaml
extends: ./shared/base.yaml # optional — string or list, relative paths

languages: # optional — default: all supported
  - typescript
  - python

ignore: # optional — glob patterns to skip
  - "dist/**"
  - "coverage/**"

rules: # optional — rule id → setting
  style/no-let: error # shorthand: a severity, or "off"
  architecture/no-god-objects: # long form with rule-specific options
    severity: warning
    options:
      maxLines: 300
```

- **Severities:** `info` · `warning` · `error` · `critical` · `"off"`. (Unquoted `off` also works — Argus parses YAML 1.2, where `off` is a plain string, not a boolean.)
- **Rule ids** are kebab-case with optional `/`-separated category segments.
- **Unknown keys are errors.** A typo like `rulez:` fails validation loudly instead of silently deactivating your settings.

## Inheritance — `extends:`

Works like ESLint's `extends`: each entry is resolved relative to the extending file, bases apply first, and the extending file wins. With a list, later entries beat earlier ones. Chains can nest; cycles are detected and reported as errors.

## Layering — multiple files in one tree

Config files may live at several levels (org root, team folder, repo, subfolder). Levels merge outermost-first, so the file nearest the code wins:

- `rules` merge **per rule id** — the nearest setting for a rule replaces farther ones _wholesale_ (severity and options together; options are never blended across levels).
- `languages` and `ignore` **replace** — arrays never concatenate, so a leaf config can always narrow what an outer level set.

## Errors point at the line

Every validation failure carries the file, 1-based line and column, and the path of the offending value:

```
Invalid configuration in team/reviewtool.yaml: team/reviewtool.yaml:4:5 languages.1 — Invalid option: expected one of "typescript"|"javascript"|"python"
```

Malformed YAML (including duplicate keys) reports the same way.

## Not yet in the schema

- `suppressions:` — planned; needs the suppression identity/timestamp design (Phase 2).
- `layers:` — arrives with layer enforcement (Phase 3).
- `extends` from npm packages (shared presets) — when a real preset exists.
