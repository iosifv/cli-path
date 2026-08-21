## Why

`cd cli-app && yarn coverage` prints 0% for every file and exits non-zero. It has done so for as
long as the package has been ESM — running it at `HEAD` in a clean worktree gives the identical
result — so anyone who tries it concludes their tests are not running, and anyone who does not try
it trusts a gate that has never once been enforced.

`nyc` 15.1.0 instruments modules through CommonJS `require` hooks. `cli-app` declares
`"type": "module"`, so nothing is ever instrumented and the 70% thresholds in `cli-app/.nycrc.json`
gate nothing at all. The root `CLAUDE.md` states that ".nycrc.json enforces 70%
statements/branches/lines/functions", which is the file Claude Code reads before touching this
repository — so the false claim is actively misleading, not merely stale.

Measuring properly for the first time, with `c8`, gives the real numbers:

| Metric | Actual | Threshold it was supposedly meeting |
| --- | --- | --- |
| Statements | 19.47% | 70% |
| Lines | 19.47% | 70% |
| Functions | 53.84% | 70% |
| Branches | 65.11% | 70% |

The entire mocha suite exercises one module. `lib/KeyManager.js` is at 95%; all five `commands/`,
both clients in `lib/clients/`, `lib/PathController.js` and `utils/style.js` are at 0%.

## What Changes

- `cli-app` measures coverage with `c8` instead of `nyc`. `c8` reads V8's own coverage data, so ESM
  needs no instrumentation and no loader shim.
- Thresholds are set to the **measured baseline** rather than the aspirational 70%, and the gate is
  wired into CI so the number can only go up. Each is set at or just below today's true figure.
- **BREAKING for the local workflow only**: `yarn coverage` starts exiting `0`. It has been exiting
  `1` unconditionally, so any habit or script that treats its failure as normal will need revisiting.
- The mocha suite runs in CI for the first time, in `.github/workflows/cli-app-test-build.yaml`,
  alongside the coverage gate. Today CI runs `yarn start --help` and a global-install smoke test,
  and never runs a test.
- The root `CLAUDE.md` is corrected: the coverage claim, and the CI section that states the mocha
  suite is not wired in.

## Non-goals

- **Not a campaign to reach 70%.** Getting there means testing interactive inquirer dialogs and
  network clients, which needs mocking infrastructure this repo does not have, and would press on
  exactly the structures — `process.exit()` from inside a client, module-scope singletons —
  that `document-cli-contracts` deliberately declined to endorse. Raising the bar is later,
  separate, incremental work.
- **Not new tests.** This change makes the existing suite measurable and enforced. It adds no test
  cases of its own; the baseline it records is whatever today's suite genuinely covers.
- **Not a Node version bump.** The current `c8` requires Node 20+, which the project does not
  target; this change pins a compatible release instead of modernising the runtime. Moving off the
  16.x/18.x matrix is its own change with its own consequences.
- **Not the `vercel-api` tier.** It already measures coverage through `vitest`, which is
  `c8`-backed. This change makes the two tiers agree on tooling but does not touch the API's
  configuration or thresholds.

## Capabilities

No capabilities are added or modified. Nothing about how `clip` behaves for a user changes — this
is test tooling and CI configuration. `.openspec.yaml` therefore sets `skip_specs: true` rather
than inventing a requirement to satisfy validation.

## Impact

**Modified** — `cli-app/package.json` (the `coverage` script, `nyc` out and `c8` in),
`cli-app/.nycrc.json` (replaced by `c8` configuration carrying the baseline thresholds),
`.github/workflows/cli-app-test-build.yaml` (run the suite and the gate), root `CLAUDE.md` (two
false statements corrected).

**Dependencies** — removes `nyc`, adds `c8` pinned to a release supporting Node 14.14+, because the
current major requires Node 20+ while `cli-app/.nvmrc` pins 18 and the CI matrix covers 16.x and
18.x.

**CI** — the test-build workflow gains a step that can fail. Until now nothing in CI could fail on
a code defect, only on an install or a `--help` invocation.

**Interaction with `document-cli-contracts`** — that change found this defect, recorded it under
`design.md — Risks / Trade-offs`, and amended its own tasks 2.4 and 7.3 to stop asserting a
coverage check that cannot pass. The two are independent: neither blocks the other, and this one
touches no file that one touches.
