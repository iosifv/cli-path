## Context

See `proposal.md — Why` for motivation. Four things measured while planning determine the whole
approach:

- **Inquirer's exposure is two API members, not fifty.** `inquirer.prompt` at 4 sites,
  `new inquirer.Separator()` at 5, and three prompt types (`list` ×8, `input` ×7, `confirm` ×1).
  A five-major gap sounds like a rewrite; the actual contact surface is small and consists of the
  parts least likely to have been removed.
- **`configstore` is reached through exactly one line.** `lib/KeyManager.js:64` —
  `new Configstore(storeName, {})`. Every other module goes through `KeyManager`. So the *code*
  risk is one constructor call; the *data* risk is everything the store holds.
- **`vhs/run-all.sh` is four lines and the first is `clip location purge`.** Unconditional, against
  the real configstore. There is no scratch mode and no confirmation.
- **`KeyManager.purgeLocations()` does not sync the module-scope `location` array it caches.**
  A known, documented accident from `cli-persistent-config`'s design notes: purging and re-adding
  in the *same* `node` process silently duplicates entries. This matters here because restoring a
  backup by hand is exactly that pattern.

## Goals / Non-Goals

**Goals:**

- Five majors land with no user-visible behavioural difference — same prompts, same colours, same
  spinner, same persisted data.
- The author's real saved locations and Auth0 token survive, provably, with a tested restore path
  if they do not.
- `cli-app`'s published `engines.node` states something true after the bump.

**Non-Goals:**

- Making the interactive dialogs *better*. Explicitly out of scope; see `proposal.md — Non-goals`.
- Fixing the `purgeLocations()` caching accident. It is a real bug, it is documented, and it is not
  this change's. Working *around* it during restore is in scope; fixing it is not.
- Making `vhs/run-all.sh` safe. Also a real problem, also not this change — though this change is
  the second one to be endangered by it, which is noted in `Open Questions`.

## Decisions

### `configstore` is bumped first, alone, against a backup — before any other dependency moves

The ordering is the mitigation. If `configstore@8` changes where or how the store is written, the
symptom is indistinguishable from "the CLI broke": the user is logged out and their locations are
gone. Establishing that *first*, with only one variable changed, means the answer is unambiguous.
Bundled with four other bumps it would be a guess.

Concretely: back up `~/.config/configstore/cli-path.json` to a path outside the repo, record its
exact contents (token present, N locations by name, engine, environment), bump only `configstore`,
then re-read all of it through `clip status` and `clip location show`.

*Alternative considered:* bump all five together and check state at the end. Rejected — it is
faster only if nothing goes wrong, and if something does, the recovery starts by re-deriving which
of five packages caused it, with the evidence already destroyed.

*Alternative considered:* test against a scratch store name (`new KeyManager(STORE_NAME + '-test')`,
the pattern the mocha suite uses). Rejected as insufficient on its own: a scratch store proves the
*code* works, but the risk is a *migration* — whether an existing v6-era file is still read by v8.
Only the real file, or a faithful copy of it, tests that. The scratch store is still used for the
destructive half of the check.

### The Node floor rises to what the dependencies actually require, and the sibling change is amended

`commander@15` needs `>=22.12.0`; `inquirer@14` needs `^20.17.0 || ^22.13.0 || >=23.5.0`. The
intersection with `bump-node-version-to-the-latest-stable-version`'s proposed `>=22` leaves
22.0–22.12 declared-supported but actually broken.

`engines.node` becomes `>=22.13.0` — the lowest value that satisfies both, and still a floor rather
than a lock to the newest release, preserving that change's stated reasoning. Its design.md is
amended to record *why* the number moved, rather than leaving two changes silently disagreeing
about what `cli-app` supports.

*Alternative considered:* hold `commander` at 14 and `inquirer` at 13 to keep the `>=22` floor.
Rejected — it optimises for a floor number nobody outside this repo has expressed a need for, at
the cost of staying behind on the two packages this change exists to move. Node 22.0–22.12 are
point releases of a line whose current patch is far ahead.

*Alternative considered:* drop `engines.node` entirely and let it fail at runtime. Rejected outright
— `bump-node-version-to-the-latest-stable-version` added it specifically so a mismatch fails at
`npm install` with a clear message instead of a cryptic runtime error, and that reasoning is sound.

### Verification is the VHS gifs, and they are treated as the integration test they already are

`CLAUDE.md` records that "VHS gifs double as informal integration tests: if the recorded run still
looks right, the flow works end to end." For this change that stops being informal — the gifs are
the only artefact that exercises a real terminal, a real prompt render, and real colour output.
`cli-app`'s 19%-statement suite touches no prompt at all.

So re-recording is not a documentation chore at the end; it is the verification step, and a gif
that looks wrong is a failed test.

### `vhs/run-all.sh` is never run without a fresh backup and explicit confirmation

Its first line is `clip location purge`, unconditional, against real data. It destroyed the
author's saved locations five times in a previous session. This change requires re-recording, so it
must run it — but every task that does is preceded by a backup step and an explicit
confirm-with-the-user step.

Restoring by hand has its own trap: `purgeLocations()` does not clear the module-scope cache, so
purge-then-re-add **in one process** duplicates entries. Restores are therefore done as separate
`node` invocations, one location per invocation.

*Alternative considered:* patch `run-all.sh` to skip the purge, or point it at a scratch store.
Genuinely tempting and probably correct — but it is a change to the recording harness, not a
dependency bump, and folding it in repeats exactly the scope-mixing these three changes were split
to avoid. Raised in `Open Questions` instead.

### An anti-pattern this change is careful not to re-enable

`archived-sls-api/ARCHIVED.md` records the quota check that **read state in one place and wrote it
in another**, non-atomically, so concurrent requests at the limit all passed. The shape of that bug
— state read and written through two paths that assume they are the only one — is exactly what
`KeyManager.purgeLocations()`'s unsynced module-scope cache reproduces locally. This change does
not fix it, but it explicitly refuses to *rely* on it: every restore-by-hand step is structured as
separate processes so no single process both purges and re-adds.

## Risks / Trade-offs

**`configstore@8` orphans the existing store and the author loses a live Auth0 token and real saved
locations.** → Group 1 backs up first, bumps `configstore` alone, and verifies read-back before any
other dependency moves. The backup path is recorded in the task so the restore is mechanical.

**`vhs/run-all.sh` purges real locations every time it runs, and this change must run it.** →
Backup-and-confirm precedes every invocation; restores are done as separate `node` processes to
dodge the `purgeLocations()` cache accident.

**Inquirer 14 may have dropped the legacy `inquirer.prompt` entry point entirely**, in favour of
`@inquirer/prompts`' per-prompt imports. → Task 2.1 establishes this before any call site is
touched. If the legacy shape is gone, the honest response is to stop and reconsider scope: migrating
9 call sites to a different package is the rewrite this change's non-goals exclude, and it deserves
its own change rather than being absorbed silently.

**A prompt renders subtly differently and it goes unnoticed** because the reviewer is comparing a
new gif against memory. → The old gifs are in git; comparison is against the committed versions,
not recollection.

**Five majors at once makes attribution hard if the CLI misbehaves.** → Mitigated by ordering:
`configstore` alone first (data risk), then `inquirer` + `commander` (dispatch and dialogs), then
`chalk` + `ora` (presentation only, and the two lowest-risk). Three checkpoints, not one.

**`chalk@6` requires Node `>=22` and `ora@9` requires `>=20`** — both satisfied by the new
`>=22.13.0` floor, so they add no further constraint. Noted so a future reader does not re-derive it.

## Migration Plan

No server-side deployment; `cli-app` is a published npm package.

The user-visible migration is the `engines.node` floor moving to `>=22.13.0`. Anyone on Node
22.0–22.12 who runs `npm install -g cli-path` after the next publish gets a clear engines mismatch
at install time rather than a runtime failure — the behaviour
`bump-node-version-to-the-latest-stable-version` designed for, now with a truthful number.

Publishing is **not** part of this change. The bumped dependencies reach users on the next
`yarn npm-publish`, which should be a deliberate act after the gifs have been reviewed.

Rollback is `git revert` plus `yarn install`. The one thing `git revert` cannot restore is a
destroyed configstore — hence the backup, which is the real rollback plan for the only irreversible
part of this change.

## Open Questions

- **Should `vhs/run-all.sh` stop purging real user data?** It has now endangered two separate pieces
  of work. A `--scratch` mode, or pointing the tapes at a `cli-path-demo` store name, would remove
  the hazard permanently. Deliberately not folded in here; worth its own small change.
- **Is `@inquirer/prompts` where this codebase should end up?** If task 2.1 finds the legacy
  `inquirer.prompt` API deprecated-but-working, this change proceeds — but the migration becomes a
  question with a deadline attached rather than a hypothetical.
- **Does `cli-table3` (`0.6.3` → `0.6.5`, patch) or `underscore` (`1.13.6` → `1.13.8`, patch) need
  anything?** Both are patch-level and were left out of all three changes' headline lists. Sweep
  them up here if they are genuinely trivial; split them out if either surprises.
