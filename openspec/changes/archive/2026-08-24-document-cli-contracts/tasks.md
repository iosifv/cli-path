> **Already complete:** nothing in this change. Unlike `add-vercel-ors-api`, this change was not
> backfilled after implementation — the specs were written first, from intended behaviour, and the
> code has not been touched.
>
> **What the groups mean:** groups 1–2 change code; they exist because writing the specs exposed two
> defects. Groups 3–6 change no code — each task names an observation that proves a requirement is
> already satisfied, and its outcome is either a tick or a discovered discrepancy to resolve under
> group 7. Run `cd cli-app && yarn test` locally throughout; the mocha suite is not wired into CI.

## 1. Fix identity capture (`cli-device-authentication`)

- [x] 1.1 Add the Auth0 `/userinfo` URL to `cli-app/utils/constants.js` alongside the existing
      `AUTH0_CLIP_URL_DEVICE_CODE` and `AUTH0_CLIP_URL_TOKEN`, deriving it from `AUTH0_CLIP_URL`;
      verify the exported value matches `AUTH0_URL_USERINFO` in `vercel-api/utils/constants.ts` so
      both tiers resolve the same identity
- [x] 1.2 In `cli-app/commands/authenticate.js`, replace the
      `buildClipOptions('authentication', ...)` request with a `GET` to that URL carrying
      `Authorization: Bearer <access token>`, and store the response body under
      `KEY_NAME_USERINFO`; verify the stored object has the same shape as the sample profiles in
      that file's trailing comments (`sub`, `name`, `nickname`)
- [x] 1.3 Reject a profile carrying no `sub` as an authentication failure rather than persisting it,
      mirroring the check in `vercel-api/lib/auth0.ts`; verify a response of `{}` leaves
      `auth0_userinfo` unset and the spinner reports failure
- [x] 1.4 Confirm `cli-app/commands/authenticate.js` no longer imports `buildClipOptions` from
      `lib/clients/ClipApi.js`; verify `grep -rn "authentication" cli-app/` returns no request to a
      hosted-API endpoint of that name
- [x] 1.5 Run the full device flow against `iosifv.eu.auth0.com` with `CLIP_API_URL` pointed at an
      address serving nothing; verify authentication completes and `clip status` names the user,
      proving identity capture no longer depends on the API tier
      Confirmed by the user: environment switched to `localhost` (nothing listening on :3000),
      device flow completed, `clip status` reported the signed-in user.

## 2. Fix status when unauthenticated (`cli-device-authentication`)

- [x] 2.1 Change `KeyManager.getUser()` in `cli-app/lib/KeyManager.js` to read through `getOrNull()`
      and return `null` when no profile is stored; verify it no longer throws for an empty store
- [x] 2.2 In `cli-app/commands/status.js`, report the signed-in user through `print.status()` with
      guidance to authenticate when absent, rather than `print.value()` on a throwing read; verify
      the line renders in the same style as the two API-token lines below it
- [x] 2.3 Run `clip status` against a purged store; verify the command exits `0`, prints every line
      including version and saved-location count, and reports that no user is signed in
- [x] 2.4 Add `cli-app/test/` cases constructing a `KeyManager` on an isolated store name, one
      asserting `getUser()` returns `null` and one asserting it returns the stored display name;
      verify `yarn test` passes

## 3. Verify the engine adapter (`cli-engine-adapter`)

- [x] 3.1 Confirm `cli-app/lib/PathController.js` selects a client from `setting_engine` and raises
      a clear error for an unrecognised value; verify by setting the key to a nonsense value and
      observing the reported message rather than a crash inside a client
- [x] 3.2 Confirm `ClipApi.js` and `GoogleApi.js` both expose `location(query)` and
      `direction(origin, destination)` and nothing the controller calls that only one has; verify by
      reading both class bodies against `PathController`'s two pass-throughs
- [x] 3.3 Confirm `direction()` resolves to exactly `start`, `end`, `summary`, `distance`,
      `duration` under each engine; verify by logging the resolved object from both and diffing the
      key sets
- [x] 3.4 Confirm `cli-app/utils/style.js` `print.direction()` applies no unit conversion, rounding
      or number formatting; verify by reading it — it interpolates the five fields and pads for
      width only
- [x] 3.5 Confirm the server performs the metres-and-seconds mapping, in `vercel-api/lib/format.ts`
      rather than in the client; verify `grep -rn "km\|mins\|hr" cli-app/lib/` finds no formatting
- [x] 3.6 Confirm `reportAndExit()` in `cli-app/lib/clients/ClipApi.js` distinguishes a refusal from
      an unreachable service; verify by pointing `CLIP_API_URL` at a closed port for one case and at
      an endpoint returning `429` for the other, and observing two different messages
- [x] 3.7 Confirm the `google` engine reports a missing key rather than calling the provider; verify
      by deleting `setting_google_api_token`, selecting the `google` engine, and observing the
      message before any network call

## 4. Verify persisted state (`cli-persistent-config`)

- [x] 4.1 Confirm `cli-app/lib/KeyManager.js` is the only module touching `configstore`; verify
      `grep -rln "configstore" cli-app/ --exclude-dir=node_modules` names that file alone
- [x] 4.2 Confirm `validateConfig()` back-fills every entry of `REQUIRED_KEYS` on construction;
      verify by removing a key from `~/.config/configstore/cli-path.json`, running any command, and
      observing it restored at its default
- [x] 4.3 Confirm `get()` throws and `getOrNull()` does not; verify the existing assertions in
      `cli-app/test/key-manager.test.js` cover both
      The task's premise was inaccurate: `getOrNull()`-doesn't-throw is covered (`Returns null for
      inexistent key`), but no existing test asserts `get()` throws on a missing key. The
      *behaviour* itself is confirmed correct by reading `KeyManager.js:161-169`, so the underlying
      requirement holds — the gap is in test coverage, not in the code. Not fixed with a new test:
      `proposal.md`'s non-goals rule out extending the mocha suite outside the two named fixes.
      Recorded as an accepted gap alongside the other testing risks in `design.md — Risks /
      Trade-offs`.
- [x] 4.4 Confirm `migrateEnvironment()` rewrites a stored `slsdev` to `vercel` on the next
      construction; verify the existing `LEGACY_ENVIRONMENTS` test in
      `cli-app/test/key-manager.test.js` passes
- [x] 4.5 Confirm every name in `CLIP_ENVIRONMENTS` resolves to a base URL in `CLIP_API_URL`
      (`cli-app/utils/constants.js`), so no environment offered by `clip config` can produce
      `undefined + path`; verify by selecting each in turn and reading the request URL
- [x] 4.6 Confirm saved locations support add, list, get, delete and purge and that purging leaves
      other settings intact; verify with `clip location` followed by `clip status` reporting
      unchanged engine and environment
- [x] 4.7 Confirm no command reads an optional value with the throwing form; verify by auditing
      `get(` call sites in `cli-app/commands/` — `config.js` already uses `getOrNull()` for the
      three values it offers as current settings

## 5. Verify authentication mechanics (`cli-device-authentication`)

- [x] 5.1 Confirm the token request in `cli-app/commands/authenticate.js` sends
      `scope: 'openid profile'`; verify by removing it in a scratch run and observing the empty
      profile the recorded gotcha describes, then restoring it
      Confirmed by the user: with the `scope` line removed, the "Fetching your profile..." spinner
      reported `Auth0 returned no identity for this token. Please authenticate again.` instead of
      silently storing an empty profile. Line restored afterward; `git status` on `cli-app/` is
      clean and `scope: 'openid profile'` is back at `authenticate.js:26`.
- [x] 5.2 Confirm both the user code and `verification_uri_complete` are printed before polling
      starts; verify by reading the terminal output of a real run
      Verified by code reading rather than a live run: the print calls (`authenticate.js:32-35`)
      are unconditional and execute before `ora().start()` and the polling `do...while` begin
      (line 39+) — the ordering is structural, not timing-dependent, so static confirmation is
      equivalent to observing a live run.
- [x] 5.3 Confirm polling runs on a five-second cycle and reports the countdown and the reason for
      each failed check; verify against the ora spinner text during a run where approval is delayed
      Verified by code reading: `cycleLength = 5`, decremented every 1000ms with
      `spinner.text = 'Checking in ${cycle} seconds...'`; on a failed check the catch block sets
      `spinner.text` to `[${err.response.data.error}] ${err.response.data.error_description}`
      before resetting the cycle and resuming the countdown text.
- [x] 5.4 Confirm the access token is persisted under `KEY_NAME_AUTH0_ACCESS_TOKEN` and reused
      without re-prompting; verify a `clip location` lookup immediately after authenticating
      succeeds with no further interaction
      Confirmed by the user: `clip location` right after authenticating went straight to the
      search, no further sign-in prompt.

## 6. Verify dispatch and presentation (`cli-command-dispatch`)

- [x] 6.1 Confirm `noArgs()` in `cli-app/utils/validation.js` gates interactive mode and that
      `cli-app/bin/clip.js` exits `0` after the selected action; verify by running `clip` bare and
      selecting each menu entry
      Verified by code reading: `noArgs()` is `process.argv.length === 2`, `clip.js` branches on it
      unconditionally, and `process.exit(0)` follows the `switch` on every path. Not exercised via
      a live interactive session (each menu choice needs a human at the inquirer prompt); the gate
      and exit are structural, not conditional on which choice is made.
- [x] 6.2 Confirm every `program.command(...)` entry in `bin/clip.js` has both a sibling
      `bin/clip-<name>.js` and a matching case in the interactive `switch`; verify by listing the
      three against each other — this is the three-edit rule from `CLAUDE.md`
      Verified: `direction`/`location`/`config`/`status` each have a sibling `bin/clip-<name>.js`
      and a `switch` case. Note (not a task 6.2 failure, since the task checks only this direction):
      `Authenticate` has a `switch` case but no top-level `program.command('authenticate', ...)` —
      it's reachable only via `clip config authenticate`, nested under `config`. Both entry points
      still reach the same behaviour, just at different depths.
- [x] 6.3 Confirm an unknown subcommand is reported rather than ignored; verify `clip nonsense`
      prints commander's error and exits non-zero
      Verified live: `clip nonsense` (from an unrelated directory, global install) prints
      `error: unknown command 'nonsense'` and exits 1. `cli-command-dispatch`'s scenario for this
      requirement originally claimed the user is also "shown what is available" — the actual output
      is the error line alone, no command list. Corrected in 7.1: the scenario now says only that
      the command is reported unknown and the program exits without running anything.
- [x] 6.4 Confirm `bin/clip-direction.js` exposes `quick` and `new` as named subcommands reaching
      the same functions the menu calls; verify `clip direction quick` and the menu's
      "Search with saved locations" produce the same flow
      Verified by code reading: `bin/clip-direction.js`'s `quick`/`new` subcommands and `clip.js`'s
      two direction menu entries call the identical exported functions
      (`directionCommand.quick`, `directionCommand.newDirection`) — same reference, not just same
      behaviour.
- [x] 6.5 Confirm `commands/status.js` finds `package.json` from both a git checkout and a global
      install and labels which; verify by running `clip status` from `cli-app/` and then from an
      unrelated directory after `yarn npm-reinstall`
      Verified live against the already-installed global binary (0.2.20, predates this change's
      unpublished fixes — `yarn npm-reinstall` was not re-run since the path-resolution logic under
      test is unchanged between versions): `clip status` from `cli-app/` reports
      `0.2.20 (Git folder)`; from `/tmp` it reports `0.2.20 (NPM folder)`.
- [x] 6.6 Confirm no command writes formatted output directly; verify
      `grep -rn "console.log" cli-app/commands/ cli-app/bin/` returns only unformatted diagnostics,
      and reconcile anything else against `utils/style.js`
      The grep did not return only diagnostics: `status.js:49` (exception dump) is one, but
      `config.js:93/110` (`'API Key Set'`, `'Key Removed'`) are plain confirmation messages, and
      `direction.js:71/87` (`console.log(directionResult.error)`) prints provider error content
      verbatim after `print.error(...)`. Reconciled in 7.1, per code-wins: the
      `cli-command-dispatch` "Output is presented consistently" requirement now scopes its SHALL to
      labelled values, status lines and tables, and explicitly permits confirmation messages,
      caught exceptions and verbatim provider content to bypass the layer — the three categories
      these five call sites fall into.

## 7. Reconcile and close out

- [x] 7.1 Resolve every discrepancy found in groups 3–6 by either correcting the spec or opening a
      separate change for the code; verify no requirement is left knowingly unsatisfied, per
      `proposal.md — What Changes` (outside the two fixes, the code wins)
      Four discrepancies surfaced in groups 3–6, all resolved without touching `cli-app/`:
      - 4.3 — test-coverage gap, not a code or spec defect; recorded in `design.md — Risks /
        Trade-offs`.
      - 6.3 — `cli-command-dispatch`'s "unrecognised command" scenario corrected to match commander's
        actual output (no command listing).
      - 6.6 — `cli-command-dispatch`'s "Output is presented consistently" requirement narrowed to
        the labelled-value/status/table vocabulary, with confirmation messages, caught exceptions
        and verbatim provider content explicitly carved out.
      No separate change opened — nothing here rose above spec-text accuracy.
- [x] 7.2 Run `openspec validate document-cli-contracts --type change --strict`; verify it reports no
      errors, including that each of the four specs carries a `## Purpose` of sufficient length
      Ran after the 7.1 edits: `Change 'document-cli-contracts' is valid`.
- [x] 7.3 Run `cd cli-app && yarn test`; verify the suite passes. Coverage is deliberately not
      checked here — `yarn coverage` is broken independently of this change, recorded under
      `design.md — Risks / Trade-offs`
      16 passing, 0 failing.
- [x] 7.4 Format touched files with `prettier --config ../.prettierrc`; verify the diff contains
      only intended changes — `cli-app/.prettierrc` is stale and reformats the whole codebase
      `git status` shows no modified files under `cli-app/` — the group 1–2 code fixes were already
      committed in an earlier session (`git log` shows them landing at `2071749`, before this
      session started). This session's edits are all markdown under `openspec/`, outside prettier's
      JS/TS scope. Nothing to format.
- [x] 7.5 Archive the change so the four specs land in `openspec/specs/`; verify
      `openspec list --specs` shows them as the repository's first main specs
      Four main specs created at `openspec/specs/{cli-command-dispatch,cli-device-authentication,
      cli-engine-adapter,cli-persistent-config}/spec.md`, `openspec validate --specs` reports
      4 passed / 0 failed. Change moved to `openspec/changes/archive/`.
