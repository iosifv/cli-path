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
- [ ] 1.5 Run the full device flow against `iosifv.eu.auth0.com` with `CLIP_API_URL` pointed at an
      address serving nothing; verify authentication completes and `clip status` names the user,
      proving identity capture no longer depends on the API tier

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

- [ ] 3.1 Confirm `cli-app/lib/PathController.js` selects a client from `setting_engine` and raises
      a clear error for an unrecognised value; verify by setting the key to a nonsense value and
      observing the reported message rather than a crash inside a client
- [ ] 3.2 Confirm `ClipApi.js` and `GoogleApi.js` both expose `location(query)` and
      `direction(origin, destination)` and nothing the controller calls that only one has; verify by
      reading both class bodies against `PathController`'s two pass-throughs
- [ ] 3.3 Confirm `direction()` resolves to exactly `start`, `end`, `summary`, `distance`,
      `duration` under each engine; verify by logging the resolved object from both and diffing the
      key sets
- [ ] 3.4 Confirm `cli-app/utils/style.js` `print.direction()` applies no unit conversion, rounding
      or number formatting; verify by reading it — it interpolates the five fields and pads for
      width only
- [ ] 3.5 Confirm the server performs the metres-and-seconds mapping, in `vercel-api/lib/format.ts`
      rather than in the client; verify `grep -rn "km\|mins\|hr" cli-app/lib/` finds no formatting
- [ ] 3.6 Confirm `reportAndExit()` in `cli-app/lib/clients/ClipApi.js` distinguishes a refusal from
      an unreachable service; verify by pointing `CLIP_API_URL` at a closed port for one case and at
      an endpoint returning `429` for the other, and observing two different messages
- [ ] 3.7 Confirm the `google` engine reports a missing key rather than calling the provider; verify
      by deleting `setting_google_api_token`, selecting the `google` engine, and observing the
      message before any network call

## 4. Verify persisted state (`cli-persistent-config`)

- [ ] 4.1 Confirm `cli-app/lib/KeyManager.js` is the only module touching `configstore`; verify
      `grep -rln "configstore" cli-app/ --exclude-dir=node_modules` names that file alone
- [ ] 4.2 Confirm `validateConfig()` back-fills every entry of `REQUIRED_KEYS` on construction;
      verify by removing a key from `~/.config/configstore/cli-path.json`, running any command, and
      observing it restored at its default
- [ ] 4.3 Confirm `get()` throws and `getOrNull()` does not; verify the existing assertions in
      `cli-app/test/key-manager.test.js` cover both
- [ ] 4.4 Confirm `migrateEnvironment()` rewrites a stored `slsdev` to `vercel` on the next
      construction; verify the existing `LEGACY_ENVIRONMENTS` test in
      `cli-app/test/key-manager.test.js` passes
- [ ] 4.5 Confirm every name in `CLIP_ENVIRONMENTS` resolves to a base URL in `CLIP_API_URL`
      (`cli-app/utils/constants.js`), so no environment offered by `clip config` can produce
      `undefined + path`; verify by selecting each in turn and reading the request URL
- [ ] 4.6 Confirm saved locations support add, list, get, delete and purge and that purging leaves
      other settings intact; verify with `clip location` followed by `clip status` reporting
      unchanged engine and environment
- [ ] 4.7 Confirm no command reads an optional value with the throwing form; verify by auditing
      `get(` call sites in `cli-app/commands/` — `config.js` already uses `getOrNull()` for the
      three values it offers as current settings

## 5. Verify authentication mechanics (`cli-device-authentication`)

- [ ] 5.1 Confirm the token request in `cli-app/commands/authenticate.js` sends
      `scope: 'openid profile'`; verify by removing it in a scratch run and observing the empty
      profile the recorded gotcha describes, then restoring it
- [ ] 5.2 Confirm both the user code and `verification_uri_complete` are printed before polling
      starts; verify by reading the terminal output of a real run
- [ ] 5.3 Confirm polling runs on a five-second cycle and reports the countdown and the reason for
      each failed check; verify against the ora spinner text during a run where approval is delayed
- [ ] 5.4 Confirm the access token is persisted under `KEY_NAME_AUTH0_ACCESS_TOKEN` and reused
      without re-prompting; verify a `clip location` lookup immediately after authenticating
      succeeds with no further interaction

## 6. Verify dispatch and presentation (`cli-command-dispatch`)

- [ ] 6.1 Confirm `noArgs()` in `cli-app/utils/validation.js` gates interactive mode and that
      `cli-app/bin/clip.js` exits `0` after the selected action; verify by running `clip` bare and
      selecting each menu entry
- [ ] 6.2 Confirm every `program.command(...)` entry in `bin/clip.js` has both a sibling
      `bin/clip-<name>.js` and a matching case in the interactive `switch`; verify by listing the
      three against each other — this is the three-edit rule from `CLAUDE.md`
- [ ] 6.3 Confirm an unknown subcommand is reported rather than ignored; verify `clip nonsense`
      prints commander's error and exits non-zero
- [ ] 6.4 Confirm `bin/clip-direction.js` exposes `quick` and `new` as named subcommands reaching
      the same functions the menu calls; verify `clip direction quick` and the menu's
      "Search with saved locations" produce the same flow
- [ ] 6.5 Confirm `commands/status.js` finds `package.json` from both a git checkout and a global
      install and labels which; verify by running `clip status` from `cli-app/` and then from an
      unrelated directory after `yarn npm-reinstall`
- [ ] 6.6 Confirm no command writes formatted output directly; verify
      `grep -rn "console.log" cli-app/commands/ cli-app/bin/` returns only unformatted diagnostics,
      and reconcile anything else against `utils/style.js`

## 7. Reconcile and close out

- [ ] 7.1 Resolve every discrepancy found in groups 3–6 by either correcting the spec or opening a
      separate change for the code; verify no requirement is left knowingly unsatisfied, per
      `proposal.md — What Changes` (outside the two fixes, the code wins)
- [ ] 7.2 Run `openspec validate document-cli-contracts --type change --strict`; verify it reports no
      errors, including that each of the four specs carries a `## Purpose` of sufficient length
- [ ] 7.3 Run `cd cli-app && yarn test`; verify the suite passes. Coverage is deliberately not
      checked here — `yarn coverage` is broken independently of this change, recorded under
      `design.md — Risks / Trade-offs`
- [ ] 7.4 Format touched files with `prettier --config ../.prettierrc`; verify the diff contains
      only intended changes — `cli-app/.prettierrc` is stale and reformats the whole codebase
- [ ] 7.5 Archive the change so the four specs land in `openspec/specs/`; verify
      `openspec list --specs` shows them as the repository's first main specs
