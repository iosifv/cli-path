> **Sequenced after `bump-node-version-to-the-latest-stable-version`.** `vitest@4` requires
> Node `^20 || ^22 || >=24`, which the current `[16.x, 18.x]` CI matrix satisfies at no point. Do
> not start group 2 until that change has landed and CI is green on the new matrix.
>
> Nothing in this change is already complete — all groups are outstanding.
>
> `cli-app` has **no test that exercises an HTTP client**, so `yarn test` passing proves almost
> nothing here. Verification is deliberately by running the real CLI. See `design.md — Context`.

## 1. Bump `cli-app`'s HTTP stack

- [ ] 1.1 In `cli-app/package.json`, bump `axios` (`^0.27.2`) and
      `@googlemaps/google-maps-services-js` (`^3.3.16`) **in the same edit** to their current
      versions — read `npm view <pkg> version` at implementation time rather than trusting
      `1.19.0`/`3.4.2` recorded here. Run `yarn install`, then verify with
      `cd cli-app && npm ls axios` that exactly **one** axios remains, that it is `1.x`, and that
      `@googlemaps/google-maps-services-js` and `retry-axios` both show it as `deduped` — a second
      copy at `0.27.2` means the bump achieved nothing (see `design.md — Context`)
- [ ] 1.2 Run `cd cli-app && yarn test && yarn coverage`; verify both exit `0` and the coverage
      figures are unchanged against `.c8rc.json`'s baseline. Treat this as a smoke test only, not
      as evidence the bump is safe — no test in the suite touches axios
- [ ] 1.3 Verify `reportAndExit()` in `cli-app/lib/clients/ClipApi.js:32-44` still reads a failure
      body under axios 1.x: run `clip location` against the live API with a deliberately
      unresolvable query (a 404 `NOT_FOUND`), then with a valid query while the stored Auth0 token
      is corrupted in configstore (a 401 `UNAUTHENTICATED`). Verify each prints the API's own
      `message` rather than a generic `HTTP <status>` fallback — a generic fallback means
      `error.response.data` came back unparsed, and verify the two cases print *differently*
      (`design.md` records why status blindness is the archived stack's anti-pattern)
- [ ] 1.4 Verify the Auth0 device flow end to end: run `clip` → Authenticate, leave the browser
      step unfinished for at least three poll cycles, and verify the spinner shows the
      `authorization_pending` description read from `err.response.data.error` at
      `cli-app/commands/authenticate.js:76` rather than crashing with
      `Cannot read properties of undefined`. Then complete the browser step and verify a token is
      stored and `/userinfo` resolves a profile. **This is the highest-risk path in the change** —
      a rejected request is its normal state, not an edge case
- [ ] 1.5 Verify `cli-app/lib/clients/GoogleApi.js:46-51,67-72` still maps errors under the bumped
      Google client: with the `google` engine selected via `clip config`, run a `direction` lookup
      and verify it returns the five-field shape `print.direction()` renders, and that a failing
      lookup still yields `{ error: ... }` rather than throwing on `e.response.data`. **If no
      Google Maps API key is available, record that here and skip** — `add-vercel-ors-api` narrowed
      its equivalent task the same way for the same reason (`design.md — Risks`)

## 2. Bump `vercel-api`'s toolchain

- [ ] 2.1 In `vercel-api/package.json`, bump `@vercel/node` (`^3.2.24`) and `vitest` (`^2.1.8`) to
      their current majors; run `yarn install` and verify `yarn audit` (or the repo's Dependabot
      view after push) no longer reports the `undici`, `tar` and `vite` advisories that reached
      the tier through them
- [ ] 2.2 Run `cd vercel-api && yarn typecheck`; verify it exits `0`. This is the real proof for
      the `@vercel/node` jump — all six consumers (`api/direction.ts`, `api/location.ts`,
      `api/healthcheck.ts`, `lib/guard.ts`, `lib/respond.ts`, `test/api.test.ts`) import only the
      `VercelRequest`/`VercelResponse` types, so a clean typecheck exercises the entire contract in
      use
- [ ] 2.3 Run `cd vercel-api && yarn test`; verify all suites pass under `vitest@4` with no
      config changes. If `vitest.config`-level changes *are* required, record what and why here —
      v4 changed defaults that a v2-era setup may rely on
- [ ] 2.4 Deploy to a Vercel **preview** (not `--prod`) and hit its `/api/healthcheck`; verify it
      answers `200` with `configured.routing_provider` and `configured.usage_counter` both `true`,
      matching what production reports today. Note `yarn deploy-prod` currently fails from inside
      `vercel-api/` because the linked project's Root Directory is set to `vercel-api` — see
      `design.md — Migration Plan`; deploy via the mechanism that actually works and record which

## 3. Stop counting alerts nobody can act on

- [ ] 3.1 Create `.github/dependabot.yml` declaring `npm` ecosystems for `/cli-app` and
      `/vercel-api` only, deliberately omitting `/archived-sls-api`. Verify against GitHub's schema
      (the file is validated on push; a malformed one surfaces in the repo's Insights → Dependency
      graph → Dependabot tab) and verify the archived tier's ~90 alerts stop being reported while
      `cli-app`/`vercel-api` alerts still are
- [ ] 3.2 Re-read the total open alert count after 1.1 and 2.1 have landed; verify it dropped by
      roughly the 40 actionable ones plus the ~90 archived ones, and record the actual
      before/after numbers here. A count that barely moved means the dedupe in 1.1 did not take

## 4. Correct the documentation

- [ ] 4.1 In the root `CLAUDE.md`, update any dependency claim this change invalidates — at minimum
      the `cli-app` stack description if it names `axios` versions. Verify no reference to
      `axios@0.27` or `@googlemaps/google-maps-services-js@3.3.x` remains outside archived
      OpenSpec content
- [ ] 4.2 Add a short note to `CLAUDE.md` recording that `.github/dependabot.yml` deliberately
      excludes `archived-sls-api/`, and why — otherwise the next person reads the exclusion as an
      oversight and "fixes" it. Verify it points at `archived-sls-api/ARCHIVED.md` for the freeze
      rationale rather than restating it

## 5. Close out

- [ ] 5.1 Run `cd cli-app && yarn test && yarn coverage` and
      `cd vercel-api && yarn test && yarn typecheck`; verify all four exit `0`
- [ ] 5.2 Run `clip status` against the globally-installed binary and verify it still reports
      correctly — it probes `./package.json` then `__dirname/../package.json`, a path this bump
      does not touch but which breaks loudly if a dependency resolution changed shape
- [ ] 5.3 Run `openspec validate bump-security-relevant-dependencies --type change --strict`;
      verify it passes with `specs` reported as skipped rather than missing
- [ ] 5.4 Confirm the two sibling changes (`bump-dev-tooling-dependencies`,
      `bump-interactive-surface-dependencies`) still describe only what is left after this one
      lands — in particular that neither still claims to bump `axios`, `@vercel/node` or `vitest`
