## Why

`cli-app` ships `axios@0.27.2`, which carries **22 open Dependabot alerts (10 high, 12 medium)**
against the one tier real users install globally from npm, plus 3 more on `follow-redirects`
underneath it. `vercel-api` carries another 18 (undici, tar, vite) — all transitive through
`@vercel/node@3` and `vitest@2`, so they clear by bumping those two rather than by touching
anything the API's own code calls.

Nothing here is a feature request; it is the security debt on the two tiers that are actually
deployed and installed. It is separated from the broader dependency modernisation (see
`bump-interactive-surface-dependencies` and `bump-dev-tooling-dependencies`) precisely so it can
land, and be reverted, on its own.

A second, unrelated problem shares this change because it is measured in the same number: of the
repo's ~198 open alerts, **roughly 90 sit in `archived-sls-api/yarn.lock`** — a tier `CLAUDE.md`
declares frozen, undeployed, and never to be touched. They can never be actioned, and they drown
the ~40 that can. GitHub is told to stop scanning that lockfile rather than the tier being edited.

## What Changes

- **`cli-app`'s `axios` moves `^0.27.2` → `^1.x`, and `@googlemaps/google-maps-services-js` moves
  `3.3.16` → `3.4.2` in the same step — neither can move alone.** `google-maps-services-js@3.3.16`
  declares `axios@^0.27.0` and currently *dedupes* onto `cli-app`'s own `axios@0.27.2`: one copy,
  three dependents (`cli-app`, the Google client, and `retry-axios` beneath it). Bumping `axios`
  by itself would leave the Google client pinning a second, still-vulnerable `0.27.2` alongside it
  and clear none of the alerts. `3.4.2` requires `axios@^1.5.1`, which is what makes the dedupe
  land on 1.x instead.
- **Every `error.response.data` reader is re-verified against axios 1.x**, because the bump moves
  the axios *underneath the Google client* too, not just the directly-imported one:
  - `lib/clients/ClipApi.js:33-35` — `reportAndExit()` reads `error.response.data.message`.
  - `commands/authenticate.js:76` — reads `err.response.data.error` **on every poll cycle of the
    Auth0 device flow**, where a 403 `authorization_pending` is the expected, load-bearing case,
    not an edge case. If 1.x changes when a body is parsed, authentication breaks outright.
  - `lib/clients/GoogleApi.js:49,70` — reads `e.response.data` from the Google client's axios.
- `vercel-api`'s `@vercel/node` moves `3.x` → `7.x` and `vitest` `2.x` → `4.x`, clearing the
  undici/tar/vite alerts. Only type imports (`VercelRequest`, `VercelResponse`) are consumed from
  `@vercel/node`, across six files.
- A new `.github/dependabot.yml` declares the ecosystems Dependabot should watch and **excludes
  `archived-sls-api/`**, so the alert count reflects tiers that can actually act on it.
- `CLAUDE.md`'s dependency notes are corrected to match what this change lands.

## Non-goals

- **Not the rest of the outdated dependencies.** `inquirer`, `commander`, `chalk`, `ora`,
  `configstore`, `prettier`, `mocha`, `chai`, `typescript` are all majors behind too, and are
  deliberately left to two sibling changes split by blast radius. Bundling the interactive-surface
  rewrite with a security bump makes neither reviewable nor separately revertable.
- **Not editing `archived-sls-api/`.** Its ~90 alerts are silenced by scoping what Dependabot
  scans, never by upgrading a frozen tier. `CLAUDE.md` is explicit that it is reference material.
- **Not a behaviour change.** Every observable behaviour of `clip` and the API is expected to be
  byte-identical before and after. Where axios 1.x forces a code edit, the edit's purpose is to
  *preserve* current behaviour, not to improve on it.
- **Not the `c8` unpin**, which belongs to `bump-node-version-to-the-latest-stable-version` — that
  pin exists for a Node-floor reason, not a security one.
- **Not the stale vendored Swagger UI** in `docs/swagger/dist/` (vendored Dec 2022 against a
  current `swagger-ui-dist@5.32.14`). Not a dependency in any `package.json`; separate concern.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Behaviour is intended to be identical before and after — this is dependency and tooling
maintenance. `.openspec.yaml` sets `skip_specs: true`, the same call
`fix-esm-coverage-reporting` and `bump-node-version-to-the-latest-stable-version` both made for
the same reason.

## Impact

**Sequencing** — depends on `bump-node-version-to-the-latest-stable-version` landing first.
`vitest@4` declares `engines.node ^20.0.0 || ^22.0.0 || >=24.0.0`, which the old `[16.x, 18.x]` CI
matrix satisfied at no point; that change has since landed `[22.x, 24.x]`, satisfying it at every
entry. `axios@1.x` itself has no such constraint, so the `cli-app` half is technically
independent — but it is kept in sequence so a CI failure has one candidate cause.

**Modified** — `cli-app/package.json` (`axios`, `@googlemaps/google-maps-services-js`) and
`cli-app/yarn.lock`; `vercel-api/package.json` (`@vercel/node`, `vitest`) and `vercel-api/yarn.lock`;
`cli-app/lib/clients/ClipApi.js`, `cli-app/commands/authenticate.js`,
`cli-app/lib/clients/GoogleApi.js` **only if** verification shows 1.x requires an edit to keep
behaviour identical; root `CLAUDE.md`.

**Added** — `.github/dependabot.yml`.

**Risk concentrates in the Auth0 device flow.** `authenticate.js`'s polling loop treats an axios
*rejection* as its normal path and reads `err.response.data.error` off it every five seconds. A
change in when 1.x populates that body turns sign-in into a crash. This is the one place where a
silent regression would not show up in the mocha suite (which stubs no network) and would reach
users directly.

**Verification gap** — `cli-app`'s test suite does not exercise either HTTP client against a real
or stubbed transport, so the axios bump cannot be proven correct by `yarn test` alone. Group 1's
tasks verify it by driving the real CLI against the live API and a deliberately-failing call.

**Deployment** — `vercel-api` redeploys on push (Vercel Git integration), so the `@vercel/node`
bump reaches production automatically once merged; `/api/healthcheck` is the post-deploy check.
