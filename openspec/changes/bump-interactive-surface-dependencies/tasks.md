> **Sequenced after `bump-node-version-to-the-latest-stable-version`** (Node floor) and best run
> after `bump-dev-tooling-dependencies` (so reformatting noise is already absorbed and this diff is
> only rewrites). Independent of `bump-security-relevant-dependencies`.
>
> Nothing here is already complete — all groups are outstanding.
>
> **⚠️ Two data-destroying hazards live in this change.** Read before starting:
> 1. `configstore@8` may orphan `~/.config/configstore/cli-path.json` — the real Auth0 token,
>    saved locations, engine and environment. Group 1 exists to prove it does not.
> 2. **`vhs/run-all.sh`'s first line is `clip location purge`**, unconditional, against real data.
>    It has already destroyed the author's saved locations five times in a prior session. Never run
>    it, or any tape, without a fresh backup and explicit confirmation from the user.
>
> **Restores must use separate `node` invocations, one location each.**
> `KeyManager.purgeLocations()` does not sync its module-scope cache, so purging and re-adding in
> one process silently duplicates entries (`design.md — Context`).

## 1. Prove `configstore@8` does not orphan real user state

- [ ] 1.1 Back up `~/.config/configstore/cli-path.json` to a path **outside the repo** and record
      its contents in this task: whether an Auth0 access token is present, the exact saved location
      names and count, the `setting_engine` value, and the `application_environment` value. Verify
      the backup file is byte-identical to the original (`diff` them) — everything below depends on
      this being a faithful copy
- [ ] 1.2 Bump **only** `configstore` (`^6.0.0` → `^8.x`) in `cli-app/package.json`; run
      `yarn install`. Change nothing else. Verify `npm ls configstore` reports a single `8.x`
- [ ] 1.3 Without re-authenticating, run `clip status` and `clip location show`. Verify **every**
      value recorded in 1.1 reads back identically — same token still valid, same locations by
      name, same engine, same environment. Any loss means `configstore@8` moved the store's path or
      format: restore from 1.1's backup, record the finding here, and stop rather than proceeding
      with four more bumps on top of a broken store
- [ ] 1.4 Verify `lib/KeyManager.js:64`'s `new Configstore(storeName, {})` call still compiles
      against v8's signature, and that `REQUIRED_KEYS` back-filling via `validateConfig()` still
      runs on construction — create a throwaway store
      (`new KeyManager(STORE_NAME + '-test-configstore-bump')`), confirm defaults are written, then
      `purgeAll()` it. This is the destructive half of the check and must use a scratch name, never
      the real store
- [ ] 1.5 Run `cd cli-app && yarn test`; verify the `key-manager` suite passes. **Commit here** —
      `configstore` alone, so a later revert can isolate it

## 2. Bump `inquirer` and `commander` (dispatch and dialogs)

- [ ] 2.1 **Before touching any call site**, establish whether Inquirer 14 still supports this
      codebase's exact usage: the legacy `inquirer.prompt(...)` entry point, `new
      inquirer.Separator()`, and the `list`/`input`/`confirm` types. Verify against Inquirer's own
      migration notes and a one-file spike. If the legacy entry point is **gone** (v10+ moved to
      `@inquirer/prompts`' per-prompt imports), stop and raise it — migrating 9 call sites to a
      different package is the rewrite `proposal.md — Non-goals` excludes, and needs its own change
- [ ] 2.2 Bump `inquirer` (`^9.1.4` → `^14.x`) and run `yarn install`. Drive **every** dialog by
      hand and verify each renders and returns correctly: `bin/clip.js`'s top-level list (including
      its `Separator`), `commands/config.js`'s three lists, `commands/location.js`'s add/delete/
      list flows, and `commands/direction.js`'s two prompts. Verify against the committed
      `docs/vhs/*.gif` — not from memory
- [ ] 2.3 Bump `commander` (`^9.4.1` → `^15.x`) and run `yarn install`. Verify all five programs
      still dispatch: `clip direction`, `clip location`, `clip config`, `clip status` and their
      subcommands (`location add|show|remove|purge|interactive`, `config set|remove`). Verify
      `clip --help` still works and that `bin/clip.js`'s deliberate
      `.version('use status command')` sentinel still prints that string rather than erroring —
      it exists because reading `package.json` breaks for a global binary (`CLAUDE.md`, Known
      gotchas)
- [ ] 2.4 Verify the no-args path specifically: `bin/clip.js` branches on
      `noArgs()` (`process.argv.length === 2`) into interactive mode, and on args into Commander's
      git-style sub-binary resolution. Verify **both** branches still work after a Commander major
      — this dual-mode dispatch is what `cli-command-dispatch` specifies
- [ ] 2.5 Run `cd cli-app && yarn test && yarn coverage`; verify both pass. **Commit here**

## 3. Bump `chalk` and `ora` (presentation only)

- [ ] 3.1 Bump `chalk` (`^5.2.0` → `^6.x`); run `yarn install`. Verify every helper in
      `cli-app/utils/style.js` still renders: `chalk.hex('#FFA500')` and `.hex().bold()`
      (`warning`, `statement`), `chalk.bold.red` (`error`), `chalk.gray`/`chalk.green` (`value`),
      `chalk.reset.dim` and `chalk.yellow` (the config prompt), and `chalk.bold` (`direction`).
      Verify colour actually appears in a real terminal — a chalk major that silently drops to
      level 0 renders plain text with no error
- [ ] 3.2 Bump `ora` (`^6.1.2` → `^9.x`); run `yarn install`. Verify the Auth0 spinner in
      `commands/authenticate.js` still works across its full lifecycle: `ora().start()`, assigning
      `spinner.spinner = 'bouncingBall'`, mutating `spinner.text` on each poll cycle, and
      `.succeed()` / `.fail()` / `.stop()`. Drive a real device-flow login to see all of them
- [ ] 3.3 Sweep the two patch-level stragglers `design.md — Open Questions` left undecided:
      `cli-table3` (`0.6.3` → `0.6.5`) and `underscore` (`1.13.6` → `1.13.8`). Verify
      `print.locationTable()` still renders correctly after the `cli-table3` bump. If either turns
      out to be non-trivial, drop it from this change and record why
- [ ] 3.4 Run `cd cli-app && yarn test && yarn coverage`; verify both pass. **Commit here**

## 4. Raise the published Node floor to something true

- [ ] 4.1 Set `cli-app/package.json`'s `engines.node` to `>=22.13.0` — the lowest value satisfying
      both `commander@15` (`>=22.12.0`) and `inquirer@14` (`^20.17.0 || ^22.13.0 || >=23.5.0`).
      Verify with `npm ls` that no installed dependency declares an `engines.node` the new floor
      fails to satisfy
- [ ] 4.2 Amend `bump-node-version-to-the-latest-stable-version`'s `design.md` where it reasons
      about `>=22`, recording that this change raised it to `>=22.13.0` and why. Verify the two
      changes no longer state different floors — a reader hitting the archived change first must
      not be told the wrong number
- [ ] 4.3 Verify the CI matrix (`[22.x, 24.x, 26.x]` from the Node change) still passes: `setup-node`
      resolves `22.x` to the latest 22 patch, which is well above `22.13.0`, so no matrix edit
      should be needed. Confirm rather than assume — if `22.x` ever resolved below the floor, CI
      would fail on a version the package claims to support

## 5. Re-record the VHS demo gifs (the real integration test)

- [ ] 5.1 **Back up `~/.config/configstore/cli-path.json` again** (state has changed since 1.1) and
      **confirm with the user before running anything under `vhs/`**. Verify the backup is current
      and readable. `run-all.sh`'s first line is `clip location purge` — this is not optional
      ceremony
- [ ] 5.2 Confirm the recording toolchain is current before blaming the code for a bad recording:
      verify `vhs --version` and that `ttyd` runs. A prior session lost time to `vhs@0.2.0` from
      2022 and a `ttyd` broken against a stale `libwebsockets` — if the gifs look wrong, rule the
      recorder out first
- [ ] 5.3 Note that `vhs/run-all.sh` drives the **globally installed** `clip`, not this working
      tree. Verify which binary is on `PATH` and that it reflects the bumped dependencies —
      `yarn npm-reinstall`, or a `npm install -g .` from `cli-app/`, before recording. A prior
      session recorded against a stale global binary and spent real time on the resulting confusion
- [ ] 5.4 Run `cd vhs && ./run-all.sh`; verify `docs/vhs/*.gif` and `*.mp4` regenerate. Compare each
      against its committed predecessor in git — every prompt, colour, table and spinner should look
      the same. **A gif that looks different is a failed test, not a new baseline** (`design.md —
      Decisions`)
- [ ] 5.5 Restore the saved locations from 5.1's backup, **one `clip location add` per `node`
      invocation** — `purgeLocations()` does not sync its module-scope cache, so restoring several
      in one process duplicates them. Verify `clip location show` lists exactly the names recorded
      in 1.1, with no duplicates

## 6. Correct the documentation and close out

- [ ] 6.1 Update root `CLAUDE.md` for anything this change invalidates: the `cli-app` dependency
      descriptions, and the Node floor if it is named there. Verify no superseded version number
      remains outside archived OpenSpec content
- [ ] 6.2 Verify the three specs this change must **preserve** still describe reality —
      `cli-command-dispatch` (dual-mode dispatch, three-edit rule for new commands),
      `cli-persistent-config` (KeyManager as sole state owner, `REQUIRED_KEYS` back-fill) and
      `cli-device-authentication` (device flow, spinner, `scope: 'openid profile'`). If any no
      longer matches, **stop** — that is a behavioural change this proposal declared it would not
      make, and it needs a deliberate spec amendment rather than silent absorption
- [ ] 6.3 Run `cd cli-app && yarn test && yarn coverage`; verify both exit `0` and coverage figures
      match `.c8rc.json`'s baseline
- [ ] 6.4 Run `openspec validate bump-interactive-surface-dependencies --type change --strict`;
      verify it passes with `specs` reported as skipped rather than missing
