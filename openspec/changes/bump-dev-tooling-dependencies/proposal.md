## Why

The tooling that formats and tests this repo is two to four majors behind: `prettier@2.8.1` against
`3.9.6`, `mocha@10.2.0` against `11.8.0`, `chai@4.3.7` against `6.2.2`, and `typescript@5.9.3`
against `7.0.2` in `vercel-api`. None of it ships to a user — it is all `devDependencies` — so
unlike `bump-security-relevant-dependencies` there is no security pressure here. The pressure is
that every one of these was blocked by the Node 16 floor (`mocha@11` needs `^18.18 || ^20.9 || >=21`,
`chai@6` needs `>=18`), and once `bump-node-version-to-the-latest-stable-version` removes that
floor, leaving them pinned is a choice nobody made deliberately.

There is also a live, already-biting bug in the same area. **`cli-app/.prettierrc` is not what
`CLAUDE.md` says it is.** `CLAUDE.md` describes the Prettier config as "root `.prettierrc`,
duplicated in `cli-app/`", but the two files disagree:

| Setting | root `.prettierrc` | `cli-app/.prettierrc` |
| --- | --- | --- |
| `tabWidth` | `2` | **`4`** |
| `printWidth` | `100` | **absent** (defaults to 80) |

Running Prettier from inside `cli-app/` therefore reformats the entire tier away from the
conventions the repo documents — a trap the OpenSpec project context already warns about
("always pass `--config ../.prettierrc`"), which is a workaround for a file that should simply be
correct. Fixing it under a Prettier major bump is the right moment, because that bump reformats
everything anyway and the two diffs would otherwise be impossible to tell apart.

## What Changes

- **`cli-app/.prettierrc` is corrected to match the root config** (`tabWidth: 2`, `printWidth: 100`)
  — or deleted outright so Prettier resolves the root file, whichever `design.md` settles on. This
  lands **before** the Prettier bump, as its own commit, so the "fix the config" diff and the
  "Prettier 3 changed its mind" diff stay separable.
- `prettier` moves `^2.7.1` → `^3.x` in **both** `cli-app` and `vercel-api`, and both tiers are
  reformatted. **This produces a very large diff touching nearly every source file** and is the
  reason this change exists separately from its two siblings.
- `mocha` moves `^10.2.0` → `^11.x` and `chai` `^4.3.7` → `^6.x` in `cli-app`. Chai 5 went
  ESM-only and dropped the `chai.expect` CommonJS default export; `cli-app` is already
  `"type": "module"`, so this is expected to be cheap, but the suite's import style has to be
  checked rather than assumed.
- **The `mocha` bump is what unblocks Node 26**, which raises this change's priority above
  "tidy-up". `bump-node-version-to-the-latest-stable-version` set out to target Node 26 and had to
  retarget to 24, because `mocha@10`'s transitive `yargs@16.2.0` declares `"type": "module"` while
  shipping an extensionless `./yargs` file containing `require()` — Node 26 loads it as ESM and the
  suite dies with `ReferenceError: require is not defined in ES module scope` before running a
  single test. Verified during that change: `mocha@11.8.0` (transitive `yargs@17.7.3`) fixes it,
  16 passing on Node 26. Note `yargs@17.7.2` has the **same** defect — only the `17.7.3` patch is
  good, so this must be re-measured rather than assumed at implementation time.
- `typescript` moves `^5.6.3` → `^7.x` in `vercel-api`.
- `cli-app`'s `.c8rc.json` coverage baseline is re-measured, not re-asserted: reformatting changes
  line counts, so the recorded statement/line percentages will move even though no logic did.
- `CLAUDE.md`'s Prettier description is corrected to describe reality.

## Non-goals

- **Not the runtime dependencies.** `inquirer`, `commander`, `chalk`, `ora` and `configstore` are
  the user-facing interactive surface and belong to `bump-interactive-surface-dependencies`, which
  needs VHS re-recording to verify. Nothing in this change alters what `clip` prints.
- **Not the security bumps.** `axios`, `@vercel/node` and `vitest` belong to
  `bump-security-relevant-dependencies`. `vitest` in particular is *not* bumped here despite being
  dev tooling, because its alerts make it that change's problem.
- **Not `c8`**, whose unpin belongs to `bump-node-version-to-the-latest-stable-version` — that pin
  exists for a Node-floor reason and was explicitly deferred to the change that removes the floor.
- **Not adopting new Prettier 3 options** (`experimentalTernaries`, changed `objectWrap`
  defaults, etc.) beyond what is needed to keep the existing style. The goal is the same code,
  formatted by a newer formatter.
- **Not adding tests.** `document-cli-contracts` and `fix-esm-coverage-reporting` both ruled test
  expansion a non-goal; this change does not reverse that.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Nothing a user of `clip` or the API can observe changes — this is formatter, test-runner and
compiler maintenance. `.openspec.yaml` sets `skip_specs: true`, matching
`fix-esm-coverage-reporting`, `bump-node-version-to-the-latest-stable-version` and
`bump-security-relevant-dependencies`.

## Impact

**Sequencing** — depends on `bump-node-version-to-the-latest-stable-version` (the Node 16 floor
blocked `mocha@11` and `chai@6`; that change has landed a `[22.x, 24.x]` matrix, so the floor is
gone). Independent of `bump-security-relevant-dependencies`; either may land first. Best done
*before* `bump-interactive-surface-dependencies`, so that change's diff is its own rewrites rather
than reformatting noise on top of them.

**Unblocks Node 26.** Once `mocha@11` lands, `.nvmrc` and both CI matrices can add `26.x` — the
step `bump-node-version-to-the-latest-stable-version` deliberately deferred. That follow-up also
still has to establish whether Vercel Functions accepts `engines.node: "26.x"` for `vercel-api`,
which was left unverified because that tier settled on `24.x` for production-safety reasons.

**Modified** — `cli-app/.prettierrc` (corrected or deleted), `cli-app/package.json`,
`vercel-api/package.json`, both `yarn.lock` files, `cli-app/.c8rc.json` (re-measured baseline),
root `CLAUDE.md`, and **nearly every `.js` file under `cli-app/` and `.ts` file under
`vercel-api/`** as a result of reformatting.

**The diff is the risk.** A reformat touching every file is exactly the kind of change a real
logic error hides inside. Mitigation is procedural — reformatting is committed separately from the
version bumps, and `git diff --ignore-all-space` is used to prove no non-whitespace change slipped
in — and is detailed in `design.md`.

**Review burden** — this change is intentionally the least interesting and most disruptive of the
three. It should be reviewed by running the tests and reading the *commit structure*, not by
reading every line of the reformat.
