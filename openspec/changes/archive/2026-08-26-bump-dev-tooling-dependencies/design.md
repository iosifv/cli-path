## Context

See `proposal.md — Why` for motivation. Three measurements taken while planning shape the approach,
and two of them make this change smaller than it first looks:

- **The reformat touches 38 files** — 22 `.js` under `cli-app/`, 16 `.ts` under `vercel-api/`.
  Large enough that a logic error could hide in it, small enough to verify mechanically.
- **Chai is used in exactly one file.** `cli-app/test/` contains a single suite,
  `key-manager.test.js`, which imports `{ assert }` — a *named* ESM import, across 22 assertions.
  Chai 5's headline breaking change was going ESM-only and dropping the CommonJS default export;
  this codebase never used that form. The 4 → 6 jump is therefore expected to be close to free,
  which is not what a two-major bump usually implies.
- **There is no `.mocharc`.** Mocha is invoked directly as `./node_modules/mocha/bin/mocha.js` with
  no config file and no options, so Mocha 11's config-related breaking changes have no surface to
  land on.

The one genuinely disruptive piece is Prettier, and its disruption is entirely whitespace.

## Goals / Non-Goals

**Goals:**

- Every `devDependency` that the Node floor was holding back moves to its current major.
- `cli-app/.prettierrc` stops contradicting both the root config and `CLAUDE.md`'s description of
  it, so formatting from inside `cli-app/` no longer needs a remembered `--config ../.prettierrc`
  workaround.
- The reformat is provably whitespace-only.

**Non-Goals:**

- Reviewing the reformat line by line. The design's job is to make that unnecessary; see the commit
  structure below.
- Improving the `.c8rc.json` thresholds. They get re-measured because reformatting moves line
  counts, not because coverage should be better. `fix-esm-coverage-reporting` deliberately set them
  to the measured baseline rather than an aspiration, and that call stands.

## Decisions

### `cli-app/.prettierrc` is deleted, not corrected

Prettier resolves config by walking up from the file being formatted, so deleting
`cli-app/.prettierrc` makes every file in the tier fall through to the root `.prettierrc` —
the file `CLAUDE.md` already calls the source of truth. Correcting the duplicate instead would
leave two files that must be kept in sync by hand forever, and the current state is precisely what
happens when that hand-sync is forgotten: root gained `printWidth: 100` and a `tabWidth` change
that the copy never received.

Note `vercel-api/.prettierrc` is currently *identical* to root and so is harmless today — but it is
the same latent trap. It is deleted too, for the same reason, in the same task.

*Alternative considered:* correct both copies to match root. Rejected — it preserves the failure
mode that produced this bug, and the repo's breadth-over-minimalism principle is about
*technologies*, not about redundant copies of one config file.

*Alternative considered:* keep per-tier configs and add a CI check that they match root. Rejected as
building machinery to defend a duplication that has no reason to exist.

### Reformatting is a separate commit from every version bump

The change lands as an ordered sequence where each commit is independently readable:

1. Delete the duplicate `.prettierrc` files, reformat with **Prettier 2** (the version already
   installed). This is the "fix the config bug" diff — real, attributable to the `tabWidth`/
   `printWidth` correction, and reviewable on its own.
2. Bump Prettier to 3, reformat again. This diff is *only* what Prettier 3 changed its mind about
   between majors, with the config-fix noise already absorbed by step 1.
3. Bump `mocha`, `chai`, `typescript`. No formatting in this commit at all.

Collapsing 1 and 2 would produce a single diff where "the config was wrong" and "the formatter
changed" are indistinguishable, and there would be no way to tell whether an unexpected
reformatting was a bug or a legitimate Prettier 3 behaviour change.

*Alternative considered:* one squashed commit, since the end state is identical. Rejected — the end
state being identical is exactly why the intermediate states are the only place the reasoning is
visible. This repo exists to be learned from.

### The reformat is verified by `git diff --ignore-all-space`, not by reading it

After each reformat commit, `git diff --ignore-all-space --ignore-blank-lines` against the previous
commit must come back **empty**. A non-empty result means Prettier changed something that is not
whitespace — a quote style, a trailing comma, a wrapped expression's semantics — and that is the
only part a human needs to look at.

This inverts the usual review: rather than reading 38 files hoping to spot the one real change, the
tool proves there are none, and any residue is small enough to read carefully. It is the same
instinct as `fix-esm-coverage-reporting` proving its coverage gate actually gates by deliberately
breaking it, rather than trusting that a green run meant it worked.

### `.c8rc.json` thresholds are re-measured and lowered if needed, never raised to fit

Reformatting changes physical line counts, so `statements`/`lines` percentages will shift by a
point or two in either direction with no change in what is actually tested. The task is to run
`yarn coverage`, read the new figures, and write those in — reproducing
`fix-esm-coverage-reporting`'s decision that the file records the measured baseline.

The trap to avoid is treating a *drop* as something to fix by adding tests (scope creep, and an
explicit non-goal) or by leaving the old number and letting CI fail. Both are worse than recording
what is true.

### An anti-pattern this change is careful not to re-enable

`archived-sls-api/ARCHIVED.md` records that the archived stack's problems were invisible because
nothing measured them — a full-table `Scan` that degraded silently, and a quota check whose race
never surfaced under light load. The parallel risk here is a formatting change that silently
alters behaviour and is never noticed because the diff was too large to read and the test suite
covers 19% of statements. The `--ignore-all-space` proof exists specifically so this change does
not rely on tests catching what review cannot.

## Risks / Trade-offs

**A logic change hides inside a 38-file whitespace diff.** → `git diff --ignore-all-space` must
come back empty after each reformat commit; anything it surfaces is read line by line. This is the
central control of the whole change.

**`cli-app`'s test suite covers ~19% of statements, so it cannot backstop the reformat.** →
Accepted, and the reason the whitespace proof carries the weight instead of the tests. Also why
`clip --help` and one real end-to-end command are run as a smoke check.

**Deleting `vercel-api/.prettierrc` changes nothing today** (it is byte-identical to root), so the
task looks pointless and may get skipped. → Recorded here explicitly as *deliberate*: it is removed
for the same latent-drift reason as `cli-app`'s, before it drifts too.

**`typescript@7` is a major with a genuinely different compiler in flight.** → `vercel-api` is 16
files of straightforward TypeScript with no build step of its own (Vercel compiles it), so
`yarn typecheck` exercising cleanly is a strong signal. If v7 rejects something v5 accepted, the
fallback is to pin at the latest v6 and record why — the same "try the newer one, record the
fallback" shape `bump-node-version-to-the-latest-stable-version` uses for Vercel's Node support.

**Prettier 3 changed `trailingComma`'s default from `es5` to `all`.** → Both configs set
`trailingComma: "es5"` explicitly, so the default change is inert here. Called out because it is
the single most-cited Prettier 3 break and its absence from the diff should not be read as the
bump having failed to apply.

## Migration Plan

Nothing is deployed or published by this change. `cli-app` publishes to npm only on the next
`yarn npm-publish`, and `devDependencies` never reach an installing user. `vercel-api` redeploys on
merge, but nothing in this change alters its runtime behaviour — `typescript` is compile-time and
Vercel runs its own build.

Rollback is `git revert` of the relevant commit. Because reformatting and version bumps are
separate commits, a problem with (say) `chai@6` can be reverted without undoing the formatting
work, and vice versa. That separability is the main practical payoff of the commit structure above.

## Open Questions

- **Should the root `.prettierrc` gain a `.prettierignore`?** Not required by anything here, but
  the reformat will be the first time anyone checks whether Prettier is reaching files it should
  not (`docs/swagger/dist/`'s vendored bundle, for one — 1MB of minified JS that Prettier would
  happily rewrite). Worth answering during task 2.1 by looking at what the first reformat actually
  touches; if it reaches vendored files, a `.prettierignore` becomes part of this change rather
  than a follow-up.
