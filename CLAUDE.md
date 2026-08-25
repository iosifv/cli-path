# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`cli-path` is a terminal client (`cli-app/`, published to npm as `cli-path`, binary `clip`) plus an
API tier that exists **only** to serve it. The API's reason for existing is that a user should be
able to get directions without holding map-provider credentials of their own; the CLI ships pointed
at the hosted API by default, and a user who prefers their own key can flip an engine setting and
bypass it entirely.

**The API tier was replaced on 2026-08-21:**

| Folder | State |
| --- | --- |
| `cli-app/` | **Live.** The npm package. |
| `archived-sls-api/` | **Dead.** AWS Lambda + Serverless Framework. Frozen, undeployed, no users. Read `archived-sls-api/ARCHIVED.md` before touching it. |
| `vercel-api/` | **Built, not yet deployed.** Vercel Functions + TypeScript, backed by OpenRouteService. Needs `vercel install upstash`, an `ORS_API_KEY`, and a first `vercel deploy --prod`; the deployment URL then goes into `CLIP_API_URL.vercel`. |

Treat anything in `archived-sls-api/` as reference material, never as a live system. It is not
deployed and there are no clients to preserve compatibility with — this is a clean slate.

Equally important, and stated outright in `docs/README.md`: **the project is a deliberate learning
playground.** The author's goal is breadth — touching as many technologies as possible around the
small subject of making a maps API call — rather than a minimal implementation. That explains the
ratio of infrastructure to feature surface: Auth0 device flow, quota accounting, an OpenAPI spec,
synced Insomnia *and* Postman collections, VHS-recorded demo gifs, a Jekyll docs site, and GitHub
Actions all sit behind three or four endpoints. Treat that breadth as intentional. Suggestions to
collapse tiers or drop a redundant-looking tool usually work against the point of the repo.

**`docs/README.md` is the canonical architecture document** — richer than the root `README.md`,
which is an abridged copy. `docs/clip-overview.drawio` diagrams the system.

## The contract the new API must satisfy

This is the load-bearing constraint for `vercel-api/`. The client half already exists and defines
the shape at both ends.

`cli-app/lib/PathController.js` is an Adapter. It reads the `setting_engine` config key at
construction and instantiates one of two clients, which **must be interchangeable**:

- `lib/clients/ClipApi.js` (`'clip'`, the default) — POSTs to the hosted API with the stored Auth0
  bearer token. Base URL comes from `CLIP_API_URL[<application_environment>]` in
  `utils/constants.js`.
- `lib/clients/GoogleApi.js` (`'google'`) — talks to Google Maps directly with the user's own key.

Both expose `location(query)` and `direction(origin, destination)`. `direction` must resolve to:

```js
{ start, end, summary, distance, duration }
```

because `utils/style.js`'s `print.direction()` renders exactly those five fields regardless of
which engine produced them. Note these are Google-shaped: `summary` is a road-name string
("A10 and A2"), and `distance`/`duration` are pre-formatted human strings ("1 hr 23 min"), not raw
meters and seconds. **Any new provider's response has to be mapped onto this shape, or the shape has
to change on both sides at once.** `vercel-api/lib/format.ts` is where OpenRouteService's metres,
seconds, and step-level road names get bridged onto it — keep that mapping server-side so both
engines stay visually identical in the terminal.

`ClipApi.js` branches on real HTTP status (axios rejects on non-2xx). It used to branch on
`response.data.status_code != 'OK'`, a workaround for the archived API returning 401 for every
error; `vercel-api` sends real statuses, so that workaround is gone. `status_code` is still present
in every response body, but as diagnostics, not control flow.

`axios` is on `1.x`. It and `@googlemaps/google-maps-services-js` must move **together**: the
Google client declares its own axios range and dedupes onto `cli-app`'s copy, so bumping one alone
leaves a second, older axios installed beneath it and clears nothing. Three places read
`error.response.data` off a rejected request — `ClipApi.js`'s `reportAndExit()`,
`commands/authenticate.js`'s device-flow poll (where a rejection is the *normal* state on every
cycle, so an unparsed body would break sign-in outright), and `GoogleApi.js`'s two `.catch()`
blocks. Re-verify those three after any future axios bump; no test covers them.

`CLIP_API_URL` maps `localhost` and `vercel`. The `application_environment` value is **persisted in
each user's configstore**, so renaming a key without adding it to `LEGACY_ENVIRONMENTS` in
`lib/KeyManager.js` yields `undefined + path` at runtime. `KeyManager.migrateEnvironment()` runs on
every construction and already rewrites the retired `slsdev` value; add to that map rather than
renaming in place.

## Repository layout

| Path | Role |
| --- | --- |
| `cli-app/` | Client tier. Plain JS, ESM (`"type": "module"`), yarn. |
| `vercel-api/` | API tier. TypeScript, ESM, Vercel Functions, yarn. |
| `archived-sls-api/` | Frozen previous API tier. Reference only. |
| `docs/` | GitHub Pages site (jekyll-theme-midnight): architecture doc, drawio diagrams, swagger UI, demo gifs. |
| `postman/schemas/index.yaml` | OpenAPI 3.0 spec, rendered at `docs/swagger/`. Its `servers` URL is stale. |
| `.insomnia/`, `.postman/` | Git-synced API client collections. Their environment URLs are stale. |
| `vhs/` | charmbracelet/vhs `.tape` scripts; `cd vhs && ./run-all.sh` regenerates `docs/vhs/*.gif`. Needs `clip` installed globally, and runs `clip location purge` first. |

There is no root `package.json` — always `cd` into a sub-project first.

## Commands

### cli-app

```bash
cd cli-app
yarn                          # install
yarn start                    # node ./bin/clip.js — no args enters interactive mode
yarn test                     # mocha, test/*.test.js
yarn test --grep "Location"   # single suite/test by name
yarn coverage                 # c8; .c8rc.json gates at the measured baseline (19% stmts/lines,
                               # 53% functions, 65% branches) — see cli-app/.c8rc.json's "//" note
yarn npm-publish              # npm version patch && npm publish
yarn npm-reinstall            # reinstall the published global package to smoke-test it
yarn configstore-watch        # tail ~/.config/configstore/cli-path.json
```

Node pinned to 24 by `cli-app/.nvmrc`; CI matrix covers 22.x and 24.x. `package.json` declares
`engines.node: ">=22"` — note that npm treats `engines` as **advisory**: installing under an older
Node warns (`EBADENGINE`, naming required vs current) but still succeeds with exit 0, because
`engine-strict` is a setting only the installing user can turn on. `c8` is no longer pinned; the
`9.1.0` pin existed because `c8@12`+ needed Node 20+ while the floor was 16, and
`bump-node-version-to-the-latest-stable-version` removed that floor and unpinned it to `^12.0.0`.

**Node 26 is now unblocked but not yet adopted.** It was deferred because `mocha@10`'s transitive
`yargs@16.2.0` declares `"type": "module"` while shipping an extensionless `./yargs` file
containing `require()`; Node 26 loads it as ESM and the whole suite died with `ReferenceError:
require is not defined in ES module scope` before any test ran. `bump-dev-tooling-dependencies`
has since moved to `mocha@11` (yargs `17.7.3` — note `17.7.2` has the same defect), and the suite
was verified passing on Node 26 during that investigation. What remains is to bump `.nvmrc` to 26,
add `26.x` to both CI matrices, and establish whether Vercel Functions accepts
`engines.node: "26.x"` for `vercel-api` — which was never tested, since that tier settled on
`24.x` for production-safety reasons.

### vercel-api

```bash
cd vercel-api
yarn                          # install
yarn dev                      # vercel dev, serves on :3000
yarn test                     # vitest, test/*.test.ts
yarn typecheck                # tsc --noEmit
yarn deploy-prod              # vercel deploy --prod
```

Uses `vitest`, not the `mocha` of `cli-app` — mocha needs a loader shim for TypeScript ESM. Tests
stub only `fetch` and Redis, so `test/api.test.ts` covers the real request path.

`package.json` declares `engines.node: "24.x"`, matching the version the Vercel project already
runs, so the declaration documents the runtime rather than changing it. Before
`bump-node-version-to-the-latest-stable-version` there was no `engines` field at all and the
runtime was whatever Vercel's platform default happened to be. This tier is *not* blocked on Node
26 the way `cli-app` is (it has no mocha); typecheck and all tests pass under 26 locally. Whether
Vercel Functions accepts `engines.node: "26.x"` is still unverified.

`yarn dev` (`vercel dev`) currently fails with "must not recursively invoke itself" — Vercel reads
the `dev` script, which is itself `vercel dev`. Pre-existing and unrelated to any runtime change.

Local runs need either an Upstash Redis or an explicit `CLIP_DISABLE_QUOTA=1`; the counter refuses
to fail open. See `vercel-api/README.md`.

### archived-sls-api

Historical only — see `archived-sls-api/ARCHIVED.md`. Do not deploy it.

## cli-app internals

### Dual-mode dispatch

`bin/clip.js` branches on `noArgs()` (`process.argv.length === 2`):

- **No args** → interactive: an inquirer list whose `switch` cases call `commands/*` directly, then
  `process.exit(0)`.
- **With args** → commander git-style subcommands, where `clip direction` resolves to the sibling
  file `bin/clip-direction.js` (likewise `-location`, `-config`, `-status`), each its own
  `#!/usr/bin/env node` commander program.

So a new user-facing command means three edits: `commands/<name>.js`, `bin/clip-<name>.js`, and
*both* the `program.command(...)` list and the interactive `switch` in `bin/clip.js`.

Layering: `bin/` (arg parsing) → `commands/` (inquirer dialogs, orchestration) → `lib/` (state,
network) → `utils/`.

### Persistent state

`lib/KeyManager.js` wraps `configstore` (store `cli-path`) and is the only module that touches
persisted state — engine, environment, Auth0 device code and access token, Google token, saved
locations, cached userinfo. `REQUIRED_KEYS` declares every key with a default, and
`validateConfig()` back-fills missing ones on every construction, so new settings go there or they
won't exist for upgrading users. `get()` throws on a missing/falsy value, `getOrNull()` doesn't;
callers choose deliberately. Tests isolate with `new KeyManager(STORE_NAME + '-test-...')` plus
`purgeAll()` in `afterEach`.

### Authentication

`commands/authenticate.js` implements the Auth0 **device authorization flow** against
`iosifv.eu.auth0.com` — chosen so users authenticate in a browser rather than typing credentials
into a terminal. It requests a device code, prints `verification_uri_complete`, then polls
`oauth/token` on a 5-second cycle behind an ora spinner until a token returns; token and userinfo
are persisted through KeyManager. Auth0 fronts Google, GitHub, LinkedIn and Facebook.

This half is provider-agnostic and is expected to survive the API rebuild unchanged.

## Conventions

- Prettier 3, configured by the **root `.prettierrc` only**: no semicolons, single quotes, 2-space
  indent, 100 print width, es5 trailing commas. There are no per-tier configs — `cli-app/` and
  `vercel-api/` each had one and both were deleted. `cli-app`'s was never actually a duplicate of
  root (`tabWidth: 4`, no `printWidth`), which is what this line used to claim; it had barely been
  applied to the code, but it was a trap waiting to reformat the tier away from the documented
  conventions.
- `.prettierignore` at the root is load-bearing — **check it before running `prettier --write`
  from the repo root**. Without it Prettier reaches 122 files instead of 28, including the 8.2MB
  vendored `docs/swagger/dist/` bundles (it will expand the minified ones), the hand-customised
  `swagger-initializer.js`, the frozen `archived-sls-api/` tier, tool-managed
  `.insomnia/`/`.postman/`/`.claude/`, and the OpenSpec archive of past changes.
- All CLI output goes through `cli-app/utils/style.js` (`line`, `statement`, `value`, `status`,
  `error`, `direction`, `locationTable`) — don't `console.log` formatted output directly.
- CI (`.github/workflows/`) runs on pushes to `main`, split across two workflow files:
  `cli-app-test-build.yaml` installs `cli-app`'s dependencies, runs the mocha suite, runs the
  `c8` coverage gate, then `yarn start --help`; `cli-app-install.yaml` does the global npm-install
  smoke test (`npm install -g cli-path && clip --help`). Both run on the `[22.x, 24.x]` matrix.
  `sls-api-test.yaml.archived` is disabled by its extension and will not run.
- `.github/dependabot.yml` deliberately lists only `/cli-app` and `/vercel-api`. Omitting
  `archived-sls-api/` is intentional, not an oversight — that tier is frozen and undeployed (see
  `archived-sls-api/ARCHIVED.md`), so an update PR against it could never be merged on its merits.
  Note this scopes update **PRs** only: Dependabot *alerts* come from the dependency graph and
  cannot be filtered by directory.
- The archived tier's manifests are checked in as **`package.json.backup`** and
  **`yarn.lock.backup`** — deliberately, to keep them out of the dependency graph. They were
  generating 127 un-actionable alerts (of 147 total) against a tier nobody may change, drowning
  the ~20 real ones. Same trick as `sls-api-test.yaml.archived`. Contents are untouched; renaming
  them back restores the alerts. Reasoning is in `archived-sls-api/ARCHIVED.md`.
- VHS gifs double as informal integration tests: if the recorded run still looks right, the flow
  works end to end.

## Known gotchas

Recorded in `docs/README.md` as mistakes not to repeat:

- **Reading `package.json` for the app version** breaks once `clip` is a global binary, because cwd
  is wherever the user invoked it. `commands/status.js` probes `./package.json` (git checkout) then
  `__dirname/../package.json` (npm install) and labels which it found. This is also why
  `bin/clip.js` declares `.version('use status command')` instead of a real version.
- **Omitting `scope` on the Auth0 token request** succeeds, then silently yields an empty object
  from `/userinfo` later. `commands/authenticate.js` sends `scope: 'openid profile'`.
- (Archived-stack-specific, but instructive) **`required: []` in a lambda schema** deployed fine
  locally and failed API Gateway with `Invalid model schema specified`.

## Anti-patterns from the archived API worth not repeating

Documented in `archived-sls-api/ARCHIVED.md`, repeated here because they're easy to reintroduce:

- `getMonthlyCount()` counted usage with a **full-table DynamoDB `Scan`** on every request — O(all
  rows ever written), permanently degrading. A counter primitive (e.g. Redis `INCR` on a
  `calls:YYYY-MM` key) is O(1).
- The quota check **read the count in middleware and wrote the row in the handler** — two
  non-atomic operations, so concurrent requests at the limit all passed. Use an atomic
  increment and test its return value.
- `formatJSONError` returned **401 for every failure class**, which is why the CLI ignores HTTP
  status. Use real status codes.
