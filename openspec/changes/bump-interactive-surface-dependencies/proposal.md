## Why

The five packages that *are* `clip`'s user interface — `inquirer`, `commander`, `chalk`, `ora` and
`configstore` — are each three to five majors behind, all of them held there by the Node 16 floor
that `bump-node-version-to-the-latest-stable-version` removes. Unlike the two sibling changes, none
of this is security debt (`bump-security-relevant-dependencies` took those) and none of it is
invisible plumbing (`bump-dev-tooling-dependencies` took that). **Every package here can change
what a user sees or, in `configstore`'s case, what a user loses.**

That is why it is separated: it is the only one of the three whose verification is *looking at the
terminal*, and the only one that can destroy saved state.

| Package | Current | Latest | What it drives |
| --- | --- | --- | --- |
| `inquirer` | 9.1.4 | 14.1.0 | Every interactive dialog |
| `commander` | 9.4.1 | 15.0.0 | All git-style subcommand dispatch |
| `configstore` | 6.0.0 | 8.0.0 | **All persisted state** — tokens, saved locations, engine |
| `ora` | 6.1.2 | 9.4.1 | The Auth0 device-flow spinner |
| `chalk` | 5.2.0 | 6.0.0 | All colour in `utils/style.js` |

## What Changes

- **`configstore` `6` → `8`, gated behind an explicit data-safety check.** `lib/KeyManager.js` is
  the only module that touches persisted state, and it holds the user's Auth0 access token, Google
  token, saved locations, cached userinfo, engine and environment. A major bump that moves the
  store's on-disk path or format silently orphans all of it — the user re-authenticates and finds
  their saved locations gone. This is verified against a **backed-up real configstore** before
  anything else in the change proceeds.
- `inquirer` `9` → `14`. The exposure is narrower than the version gap suggests: the codebase uses
  exactly two API members — `inquirer.prompt` (4 sites) and `new inquirer.Separator()` (5 sites) —
  and only three prompt types (`list` ×8, `input` ×7, `confirm` ×1), all of which are core prompts
  that survive Inquirer's v10 rewrite onto `@inquirer/prompts`. Whether the legacy `inquirer.prompt`
  entry point still accepts this exact call shape at v14 is the thing to establish first.
- `commander` `9` → `15`, across the five `bin/clip*.js` programs. Usage is `program.command()`,
  `.description()`, `.action()`, `.parse()` and `bin/clip.js`'s deliberate
  `.version('use status command')` sentinel.
- `chalk` `5` → `6` and `ora` `6` → `9`, both consumed only through `utils/style.js` and
  `commands/authenticate.js`.
- **BREAKING (to the published floor): `cli-app`'s `engines.node` must rise above the `>=22` that
  `bump-node-version-to-the-latest-stable-version` sets.** `commander@15` requires `>=22.12.0` and
  `inquirer@14` requires `^20.17.0 || ^22.13.0 || >=23.5.0`. A package declaring `>=22` while
  depending on those is lying to anyone on 22.0–22.12. The floor moves to a value that is actually
  true, and `bump-node-version-to-the-latest-stable-version`'s reasoning for `>=22` is amended
  rather than silently contradicted.
- The VHS demo gifs are re-recorded, because they are the only artefact that shows whether the
  interactive dialogs still *look* right.

## Non-goals

- **Not a redesign of any dialog.** If Inquirer 14 renders a list slightly differently, that is
  accepted; if it renders it *wrongly*, that is a bug to fix. No prompt gains options, reordering
  or better copy under cover of this change.
- **Not migrating to `@inquirer/prompts`.** Inquirer's modern API is a different, more granular
  package set. Moving to it is a rewrite with real benefits and real risk, and it is not what
  "bump a dependency" means. Recorded in `design.md — Open Questions`.
- **Not the security or dev-tooling bumps**, which belong to the two sibling changes. In particular
  this change assumes `bump-dev-tooling-dependencies` has already reformatted the tier, so its own
  diff is rewrites rather than whitespace.
- **Not changing what `print.direction()` renders.** The five-field contract
  (`{ start, end, summary, distance, duration }`) that `cli-engine-adapter` describes is untouched;
  only the `chalk` calls that colour it move.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — with a caveat worth stating rather than hiding. This change *intends* no behavioural
difference, and any visible change in a prompt's rendering is treated as a regression to fix, not a
new requirement to document. The specs `cli-command-dispatch`, `cli-persistent-config` and
`cli-device-authentication` describe behaviour this change must **preserve**, and the task list
verifies against them. `.openspec.yaml` sets `skip_specs: true` on that basis.

If implementation finds a behaviour that genuinely cannot be preserved, that is the signal to stop
and amend the affected spec deliberately — not to let the change quietly redefine it.

## Impact

**Sequencing** — depends on `bump-node-version-to-the-latest-stable-version` (Node floor) and is
best run after `bump-dev-tooling-dependencies` (so reformatting noise is already absorbed).
Independent of `bump-security-relevant-dependencies`.

**Modified** — `cli-app/package.json` (five dependencies plus `engines.node`), `cli-app/yarn.lock`,
`lib/KeyManager.js` if `configstore@8` requires it, all five `bin/clip*.js` programs,
`commands/config.js`, `commands/location.js`, `commands/direction.js`, `commands/authenticate.js`,
`bin/clip.js`, `utils/style.js`, `docs/vhs/*.gif` and `*.mp4`, and root `CLAUDE.md`.

**The `configstore` bump can destroy real user data**, including the author's own saved locations
and live Auth0 token. Group 1 exists solely to prove it does not, before any other bump lands.

**⚠️ `vhs/run-all.sh` runs `clip location purge` unconditionally before every tape**, against the
*real* configstore, not a scratch one. It has already destroyed the author's saved locations
repeatedly in a previous session. The gif re-recording tasks require an explicit backup-and-confirm
step, and must not be run casually.

**Verification is visual and manual.** `cli-app`'s suite covers ~19% of statements and touches no
prompt, so nothing here is provable by `yarn test`. The gifs and hand-driven dialogs are the test.
