## Context

See `proposal.md — Why` for the problem and the measured numbers. The constraints that shape the
approach:

`cli-app` is ESM (`"type": "module"`) and tested with mocha, deliberately — `openspec/config.yaml`
records that `vercel-api` uses vitest because "mocha needs a loader shim for TypeScript ESM", which
implies the mocha choice on the client side is settled and not up for renegotiation here.

The runtime floor is low. `cli-app/.nvmrc` pins 18 and
`.github/workflows/cli-app-test-build.yaml` runs a `[16.x, 18.x]` matrix. Any tool added here has
to run on Node 16.

And the repository is a learning playground whose stated goal is breadth. A coverage gate that
nothing runs is not breadth, it is decoration — which is the argument for finishing the job in CI
rather than only fixing the local command.

## Goals / Non-Goals

**Goals:**

- A coverage number that is true, and a gate that fails when it drops.
- No change to how tests are written or run. `yarn test` behaves exactly as it does today.
- Leave the ratchet in a state where raising it later is a one-line edit with an obvious meaning.

**Non-Goals:**

- Reporting formats, dashboards, or coverage badges. `text` locally and `lcov` on disk is what
  exists today and it is enough.
- Making the two tiers share a single coverage configuration. They share a tool; a shared config
  across a JS and a TS project buys nothing.

## Decisions

### `c8` over a loader shim for `nyc`

`nyc` can be made to see ESM, with `@istanbuljs/esm-loader-hook` and a `--experimental-loader` flag
threaded through the test command. `c8` needs none of it: V8 already records coverage for every
module it executes, ESM included, and `c8` reads that output. Fewer moving parts, no experimental
flags, and no dependency on a loader API that has changed repeatedly across Node releases.

It also converges with the other tier. `vercel-api` measures coverage through vitest, which uses
`c8` underneath. After this change both tiers produce coverage the same way, which is one fewer
thing to know about the repository.

The migration cost is near zero because `c8` deliberately reimplements `nyc`'s interface: the same
`--include`/`--exclude`/`--reporter`/`--check-coverage` flags, the same Istanbul report formats, and
it reads `.nycrc.json`. The measurement above was produced by pointing `c8` at the existing config
untouched.

*Alternative considered:* keeping `nyc` with the loader hook. Rejected — more configuration to
maintain in exchange for a tool that is no longer the ecosystem default for ESM.

*Alternative considered:* moving `cli-app` to vitest for symmetry with `vercel-api`. Rejected as
scope: it means rewriting every test off chai's `assert` and abandoning a working mocha suite, to
solve a problem that is entirely about measurement.

### Pin `c8` to the 9.x line

`c8@12`, the current release, declares `node: ^20.19.0 || ^22.12.0 || >=23`. The project targets
Node 18 and CI covers 16.x. Installing the current major would produce an engine failure on every
CI run, which trades a silent broken gate for a loud broken build.

`c8@9.1.0` declares `>=14.14.0`, covering the whole matrix. It is the newest line that does.

Recording the reason matters more than the number: the pin is a consequence of the Node target, not
a preference. Whoever eventually modernises the runtime should unpin `c8` in the same change, and
this note is where they will find out that the two are connected.

*Note:* the baseline figures in `proposal.md` were measured with `c8@12` on Node 22. They are
expected to hold on `c8@9` — both read the same V8 data — but confirming that on the pinned version
is an explicit task rather than an assumption, because the thresholds are derived from it.

### Thresholds record the baseline, and the gate goes into CI

The 70% figures are set to what the suite actually achieves, rounded down to the nearest whole
number so a trivial reordering cannot trip the gate.

The reasoning is about what a threshold is *for*. An aspirational threshold that fails on every run
teaches everyone to ignore the command — which is precisely how this defect survived: the command
did fail every time, and that was indistinguishable from the tool being broken. A threshold set at
the true baseline is a ratchet: it cannot be met by accident, it fails the moment coverage drops,
and raising it is a deliberate act with a visible diff.

Rounding down rather than to the exact figure is intentional. A threshold equal to the measured
value to two decimal places turns any refactor that removes a covered line into a build failure,
which makes the gate an obstacle instead of a signal.

The gate belongs in CI for the same reason. `openspec/config.yaml` and `CLAUDE.md` both note that
the mocha suite is not wired in and must be run locally; a gate that depends on someone remembering
is the state this change is trying to leave.

*Alternative considered:* thresholds at 0, reporting only. Rejected — it detects nothing, and the
0% it would tolerate is exactly the failure mode being fixed.

*Alternative considered:* excluding `commands/**` from measurement so the remaining code could be
gated near 70%. Rejected, though it is defensible: hiding the untested half makes the number
flattering rather than true, and the interactive dialogs in `commands/` are not permanently
untestable — they are untested. Excluding them would remove the visible reason to ever change that.

### `CLAUDE.md` is corrected in the same change

Two claims there are false: that `.nycrc.json` enforces 70%, and — once CI runs the suite — that
the mocha suite is not wired into CI.

Correcting documentation usually deserves its own change, but not here. `CLAUDE.md` is what an
agent reads before acting on this repository, so a false claim in it produces wrong work
immediately. Leaving it stale for the length of a review cycle has a cost that an ordinary docs
update does not.

### Anti-patterns from the archived stack this change avoids

`archived-sls-api/ARCHIVED.md` records failures of *verification*, and the pattern beneath two of
them is the one at work here:

- **The quota check read the count in middleware and wrote the row in the handler**, so concurrent
  requests at the limit all passed. The check existed, appeared to work, and enforced nothing.
- **`formatJSONError` returned `401` for every failure class**, so a client could not tell failures
  apart and stopped trying — the CLI branched on a body field for years as a result.

Both are the same shape as a coverage gate that reports 0% and fails unconditionally: a mechanism
that looks like enforcement, is trusted as enforcement, and enforces nothing. `ARCHIVED.md`'s
lesson for the counter was to make the check atomic and *test its return value*. The equivalent here
is that the tasks do not stop at "coverage runs" — they require the gate to be observed failing on
a deliberate regression before it is trusted.

## Risks / Trade-offs

**A 19% threshold looks like an endorsement of 19% coverage.** Someone reading `.c8rc.json` without
the history could take it as the standard the project holds itself to. → Mitigated by a comment in
the config pointing at this change, and by the ratchet being explicit in the proposal's Non-goals.
The alternative — a 70% threshold that has never once passed — is worse, and is the status quo.

**CI can now fail on a code defect for the first time.** Pushes to `main` that previously always
went green may not. → That is the point, but it is a change in what a red build means for this
repository, and worth expecting rather than being surprised by.

**Baseline figures were measured on a different `c8` major and a different Node than CI runs.** If
`c8@9` on Node 16 reports differently, thresholds derived from the `c8@12` numbers could fail
immediately. → Made an explicit task: re-measure on the pinned version before writing the
thresholds, and take the lowest figure across the matrix.

**Removing `nyc` may break something unnoticed.** → `grep` for `nyc` and `.nycrc` across the repo
is a task. The known references are `cli-app/package.json`, `cli-app/.nycrc.json` and `CLAUDE.md`.

## Migration Plan

No runtime impact — no published behaviour changes, and a coverage tool ships in `devDependencies`.
Nothing needs to be released for this to take effect; it is not user-visible and there is no reason
to publish `cli-app` for it.

Rollback is reverting the commit. The only durable artefact is CI configuration, which reverts with
it.

Sequencing matters in one place: the thresholds must be written from a measurement taken with the
pinned `c8` on the supported Node versions, not from the figures in `proposal.md`. Writing them
first would bake in numbers from a different tool version.

## Open Questions

- **Should coverage run on the whole CI matrix or just one Node version?** Running it on both 16.x
  and 18.x costs nothing and catches version-dependent gaps; running it once is simpler output.
  Either satisfies the goal, and it is trivially changeable later.
- **Should `lcov` output be uploaded anywhere?** Codecov or a similar service would make the ratchet
  visible over time, and fits the repository's breadth goal. Deliberately deferred: it adds an
  external service and a token to a change that currently adds neither.
