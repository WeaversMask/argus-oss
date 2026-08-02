# Phase &lt;N&gt; — Documentation Consolidation Audit

**Phase:** &lt;N&gt; — &lt;name&gt;
**Auditor:** &lt;agent-id&gt;
**Date:** YYYY-MM-DD
**Commit audited:** `<sha>` on `main`
**Verdict:** ✅ pass | ❌ fail — _a phase cannot be marked ✅ Complete until this reads pass_

> Copy this file to `docs/audits/phase-<NN>-doc-audit.md` and fill it in. The pass is the per-phase tier of the documentation cadence ([`../03-documentation.md`](../03-documentation.md)); the per-task tier is the `docs-delta` CI job.
>
> **Two rules that make the difference between an audit and a formality.**
>
> 1. **Every check below has an oracle — run it.** The commands are the point. "Looks fine" is not a result; a command's output is. Where a check is genuinely a judgement call (only §7 is), say what you read and what you concluded.
> 2. **Nothing stale survives the report.** Every finding is either fixed in the audit's own PR or filed as its own task with an ID. A "known stale, leaving it" line is a failed audit, not a documented one. Equally: **a first report that finds nothing means the pass was not really run** — the tree is never perfect, and an empty findings table is a result to distrust before you publish it.

---

## Scope

Tasks merged in this phase (from `IMPLEMENTATION.md` and `docs/progress.md`):

| Task ID | Title | PR  |
| ------- | ----- | --- |
|         |       |     |

---

## 1. Architecture map vs. the real package graph

**Oracle — dependency-cruiser is the source of truth, not the prose:**

```bash
pnpm exec depcruise apps packages --config .dependency-cruiser.cjs --output-type json | python3 -c "import json,sys; d=json.load(sys.stdin); print('modules:', len(d['modules'])); print('dependencies:', sum(len(m['dependencies']) for m in d['modules']))"
```

```bash
find packages apps -name package.json -not -path '*/node_modules/*' | sort | while read f; do node -e "const p=require('./$f');console.log(p.name,'|',Object.keys(p.exports||{}).join(' '))"; done
```

- [ ] Every workspace package listed by the command appears in [`../../architecture.md`](../../architecture.md)'s package table, and vice versa — **no package exists that the map does not name**
- [ ] The dependency directions the map asserts match the cruiser's actual edges (core depends on nothing internal; `packages/` never imports `apps/`; any rule the map claims is enforced exists in [`dependency-cruiser-rules.cjs`](../../../dependency-cruiser-rules.cjs))
- [ ] **Every countable claim in the map was counted.** Ports, adapters, fakes, rules, packages — if the prose says a number, run the count. (DOC-04's review caught "every port has a fake" when it was ten fakes for eleven ports; the claim had been true when written and quietly stopped being true.)

**Measured:** modules `<n>` · dependencies `<n>` · packages `<n>` · ports `<n>` · fakes `<n>`

**Result:**

## 2. Package and app READMEs vs. their actual public surface

**Oracle — the `exports` map in each `package.json`, and the package's own entry point.**

- [ ] Every package created or changed in this phase has a `README.md`
- [ ] Each README's "surface" section matches that package's real `exports` — nothing documented that is not exported, nothing exported that is undocumented
- [ ] Each README's stated role still matches what the package actually does after this phase's changes

**Result:**

## 3. User-facing capabilities vs. `guide/`

- [ ] Every user-facing capability this phase shipped has a line in [`../../guide/`](../../guide/) — walk the phase's task list, not the guide's table of contents (the guide cannot tell you what is missing from it)
- [ ] Commands, flags, exit codes and config keys documented there still match the implementation

**Result:**

## 4. First-of-a-pattern vs. `dev/` recipes

- [ ] Every pattern introduced for the **first** time this phase has a [`../../dev/`](../../dev/) recipe (the second instance is too late — the rationale is already lost)
- [ ] Existing recipes still describe the current shape of the pattern they teach

**Result:**

## 5. Decisions vs. ADRs

- [ ] Every architectural decision made this phase has an ADR in [`../../adr/`](../../adr/)
- [ ] Decisions recorded in tracker rows, handovers, or phase-file rulings that turned out to be architectural have been promoted to ADRs rather than left in prose
- [ ] No ADR is contradicted by what shipped (a superseded ADR is marked superseded, not silently wrong)

**Result:**

## 6. `docs/README.md`'s document map vs. the real tree

**Oracle:**

```bash
git ls-files 'docs/*.md' 'docs/*/*.md' | grep -v '^docs/handovers/' | sort
```

- [ ] Every document the map lists exists; every document that exists is either listed or deliberately excluded (say which)

**Link integrity — the whole tree, not just the map:**

```bash
node -e '
const {readFileSync,existsSync}=require("fs"),{execSync}=require("child_process"),{dirname,resolve}=require("path");
let bad=0;
for(const f of execSync("git ls-files \"*.md\"",{encoding:"utf8"}).trim().split("\n"))
  for(const m of readFileSync(f,"utf8").matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)){
    const r=m[1]; if(/^(https?:|mailto:|#)/.test(r))continue;
    const t=r.split("#")[0]; if(!t)continue;
    if(!existsSync(resolve(dirname(f),decodeURI(t)))){console.log("BROKEN",f,"->",r);bad++;}
  }
console.log(bad?bad+" broken link(s)":"OK: all relative links resolve");
process.exit(bad?1:0);'
```

- [ ] Zero broken relative links, or every survivor filed with a task ID

**Result:**

## 7. `docs/progress.md` reads as a story

The one judgement call in this audit. Read **only** this phase's section of [`../../progress.md`](../../progress.md), as someone who has never seen the repo.

- [ ] Every merged task in scope has an entry, dated and PR-linked
- [ ] Each entry says what a reader can **do** now that they could not before — not which files moved
- [ ] Read end to end, the section tells a coherent story of the phase rather than reading as a commit log

**Result:**

---

## Findings

Every row is fixed here or carries a task ID. No row is left as "known stale".

| #   | Severity       | Check | Finding | Disposition                       |
| --- | -------------- | ----- | ------- | --------------------------------- |
| 1   | major \| minor | §<n>  |         | fixed in this PR \| filed as <ID> |

## What this pass did not cover

Say it plainly — the next auditor inherits these.

-

## Sign-off

&lt;one paragraph: what the tree's documentation state actually is, and the one thing the next phase's auditor should look at first&gt;

— &lt;agent-id&gt;
