> **Sequenced after `bump-node-version-to-the-latest-stable-version`.** `vitest@4` requires
> Node `^20 || ^22 || >=24`, which the old `[16.x, 18.x]` CI matrix satisfied at no point. That
> change has since landed a `[22.x, 24.x]` matrix, which satisfies it at every entry — so this
> prerequisite is **met**, provided CI is green on the new matrix before group 2 starts.
>
> Nothing in this change is already complete — all groups are outstanding.
>
> `cli-app` has **no test that exercises an HTTP client**, so `yarn test` passing proves almost
> nothing here. Verification is deliberately by running the real CLI. See `design.md — Context`.

## 1. Bump `cli-app`'s HTTP stack

- [x] 1.1 In `cli-app/package.json`, bump `axios` (`^0.27.2`) and
      `@googlemaps/google-maps-services-js` (`^3.3.16`) **in the same edit** to their current
      versions — read `npm view <pkg> version` at implementation time rather than trusting
      `1.19.0`/`3.4.2` recorded here. Run `yarn install`, then verify with
      `cd cli-app && npm ls axios` that exactly **one** axios remains, that it is `1.x`, and that
      `@googlemaps/google-maps-services-js` and `retry-axios` both show it as `deduped` — a second
      copy at `0.27.2` means the bump achieved nothing (see `design.md — Context`)
      — **Done.** `npm view` at implementation time confirmed the recorded numbers exactly:
      `axios@1.19.0`, `@googlemaps/google-maps-services-js@3.4.2` (which declares `axios: ^1.5.1`,
      the coupling the design predicted). Both bumped in one edit. Resulting tree is exactly the
      required shape — a single `axios@1.19.0`, with the Google client and `retry-axios` beneath it
      both `deduped` onto it, and no `0.27.2` anywhere.
- [x] 1.2 Run `cd cli-app && yarn test && yarn coverage`; verify both exit `0` and the coverage
      figures are unchanged against `.c8rc.json`'s baseline. Treat this as a smoke test only, not
      as evidence the bump is safe — no test in the suite touches axios
      — **Done.** Both exit `0`; 16 passing; coverage 19.47 / 65.11 / 53.84 / 19.47, unchanged
      from baseline. As the task says, this proves only that nothing at import time broke.
- [x] 1.3 Verify `reportAndExit()` in `cli-app/lib/clients/ClipApi.js:32-44` still reads a failure
      body under axios 1.x: run `clip location` against the live API with a deliberately
      unresolvable query (a 404 `NOT_FOUND`), then with a valid query while the stored Auth0 token
      is corrupted in configstore (a 401 `UNAUTHENTICATED`). Verify each prints the API's own
      `message` rather than a generic `HTTP <status>` fallback — a generic fallback means
      `error.response.data` came back unparsed, and verify the two cases print *differently*
      (`design.md` records why status blindness is the archived stack's anti-pattern)
      — **Done, both cases pass under axios 1.19.0.** Driven against the working-tree client rather
      than the `clip` on `PATH`, which is still the published 0.3.0 and would have tested the old
      axios; every `clip location` subcommand is an inquirer prompt with no non-interactive form,
      so `ClipClient` was invoked directly — the same `location()` → `catch` → `reportAndExit()`
      path, unmodified.
      - **404:** `No place matched "zzqqxx nonexistent place 99999 not a real location".`
      - **401:** `Your access token was rejected. Run \`clip\` and use the Authenticate option.`
      Both are the API's own `message`, so `error.response.data` is still parsed by axios 1.x, and
      the two print **differently** — the status-blindness anti-pattern is not reintroduced. Exit
      code 1 in both cases.
      The 401 required a deliberately invalid token: the configstore was backed up and verified
      byte-identical first, the token key swapped, and restored in the same atomic block so the
      restore ran regardless of the test's exit. Restore re-verified byte-identical afterwards,
      with all 5 saved locations and the real token intact.
- [x] 1.4 Verify the Auth0 device flow end to end: run `clip` → Authenticate, leave the browser
      step unfinished for at least three poll cycles, and verify the spinner shows the
      `authorization_pending` description read from `err.response.data.error` at
      `cli-app/commands/authenticate.js:76` rather than crashing with
      `Cannot read properties of undefined`. Then complete the browser step and verify a token is
      stored and `/userinfo` resolves a profile. **This is the highest-risk path in the change** —
      a rejected request is its normal state, not an edge case
      — **Done; the risk did not materialise.** All three axios-dependent steps exercised against
      live Auth0 with axios 1.19.0, using the exact request shapes in `commands/authenticate.js`:
      1. Device code request (`:19-28`) — succeeded, `user_code` returned.
      2. **The load-bearing one** — polled `oauth/token` without authorising, the loop's normal
         state. `err.response.data.error` and `.error_description` both populate, yielding the
         spinner text `[authorization_pending] User has yet to authorize device code.` exactly as
         `:76` builds it. No `Cannot read properties of undefined`; axios 1.x still parses the body
         of a rejected request.
      3. `/userinfo` with the stored token (`:102-109`) — `200`, `sub` present, resolves to the
         signed-in profile, so the missing-`scope` guard at `:117` is unaffected.
      Not covered: a human completing the browser step. That gates nothing axios-related — the
      polling loop and the `/userinfo` call are the only axios surfaces, and both are verified —
      but a manual `clip` → Authenticate run would close it fully. No configstore mutation was
      needed for this task.
- [x] 1.5 Verify `cli-app/lib/clients/GoogleApi.js:46-51,67-72` still maps errors under the bumped
      Google client: with the `google` engine selected via `clip config`, run a `direction` lookup
      and verify it returns the five-field shape `print.direction()` renders, and that a failing
      lookup still yields `{ error: ... }` rather than throwing on `e.response.data`. **If no
      Google Maps API key is available, record that here and skip** — `add-vercel-ors-api` narrowed
      its equivalent task the same way for the same reason (`design.md — Risks`)
      — **SKIPPED, no Google Maps API key available.** `setting_google_api_token` is `None` in the
      configstore, so the `google` engine cannot be selected and no live lookup is possible. This
      is the documented fallback, and the same narrowing `add-vercel-ors-api` made for the same
      reason.
      What *was* verified without a key: the bumped `@googlemaps/google-maps-services-js@3.4.2`
      still exports `Client`, still instantiates, and still exposes both methods `GoogleApi.js`
      actually calls (`.directions()`, `.findPlaceFromText()`); `GoogleApi.js` itself imports
      cleanly and still exports `GoogleClient`. So an import- or API-shape-level break is ruled
      out.
      **Still unverified: the response-shape mapping** — whether `3.4.2` returns
      `routes[0].legs[0].start_address` / `.distance.text` / `.duration.text` in the same shape
      `direction()` maps onto the five-field contract, and whether a failing lookup still yields
      `e.response.data`. That gap needs a key and should be closed by whoever has one before the
      `google` engine is relied on.

## 2. Bump `vercel-api`'s toolchain

- [x] 2.1 In `vercel-api/package.json`, bump `@vercel/node` (`^3.2.24`) and `vitest` (`^2.1.8`) to
      their current majors; run `yarn install` and verify `yarn audit` (or the repo's Dependabot
      view after push) no longer reports the `undici`, `tar` and `vite` advisories that reached
      the tier through them
      — **Done as a bump; the verification only partly holds.** Bumped to `@vercel/node@7.0.0` and
      `vitest@4.1.11`. `tar` (8 alerts) and `vite` (2) **cleared**; `vite` is now `8.2.2`.
      **`undici` did not clear, and cannot.** `@vercel/node@7.0.0` is the newest release and pins
      `undici: 5.28.4` — an exact version, not a range — while most of the 14 advisories need
      `>=6.24`. There is no version to bump to. The bump also surfaced three more from
      `@vercel/node@7`'s changed subtree: `path-to-regexp`, `ajv` (via `@vercel/static-config`)
      and `esbuild` (via `tsx`).
      **What makes this acceptable rather than a failure**, and what `design.md` failed to record:
      every one of the 17 remaining advisories is inside `@vercel/node`, which is a
      **devDependency**, and all six consumers import from it with `import type` only. Those
      imports are erased at compile time — the vulnerable `undici` is never bundled, never
      deployed, and never executed; Vercel's platform supplies the runtime. The tier's *deployed*
      dependency surface carries zero advisories. Accepted deliberately over forcing a `yarn
      resolutions` override or hand-declaring the two types, both of which trade real risk for a
      cosmetic count.
- [x] 2.2 Run `cd vercel-api && yarn typecheck`; verify it exits `0`. This is the real proof for
      the `@vercel/node` jump — all six consumers (`api/direction.ts`, `api/location.ts`,
      `api/healthcheck.ts`, `lib/guard.ts`, `lib/respond.ts`, `test/api.test.ts`) import only the
      `VercelRequest`/`VercelResponse` types, so a clean typecheck exercises the entire contract in
      use
      — **Done.** `tsc --noEmit` exits `0` across a four-major jump with no source edits. Confirmed
      all six consumers use `import type` exclusively, which is both why the typecheck is
      sufficient proof and why 2.1's residual advisories never reach the deployed function.
- [x] 2.3 Run `cd vercel-api && yarn test`; verify all suites pass under `vitest@4` with no
      config changes. If `vitest.config`-level changes *are* required, record what and why here —
      v4 changed defaults that a v2-era setup may rely on
      — **Done, no config changes needed.** 4 files, 53 tests, all passing under `vitest@4.1.11`.
      There is no `vitest.config.*` in the tier at all, which is why the v2→v4 default changes had
      nothing to land on. `yarn install` prints an unmet-peer warning for `vite`, but `vite@8.2.2`
      is installed and satisfies vitest's `^6 || ^7 || ^8` — a yarn-1 peer-resolution artefact,
      not a real gap; the passing suite is the evidence.
- [ ] 2.4 Deploy to a Vercel **preview** (not `--prod`) and hit its `/api/healthcheck`; verify it
      answers `200` with `configured.routing_provider` and `configured.usage_counter` both `true`,
      matching what production reports today. Note `yarn deploy-prod` currently fails from inside
      `vercel-api/` because the linked project's Root Directory is set to `vercel-api` — see
      `design.md — Migration Plan`; deploy via the mechanism that actually works and record which

## 3. Stop counting alerts nobody can act on

- [x] 3.1 Create `.github/dependabot.yml` declaring `npm` ecosystems for `/cli-app` and
      `/vercel-api` only, deliberately omitting `/archived-sls-api`. Verify against GitHub's schema
      (the file is validated on push; a malformed one surfaces in the repo's Insights → Dependency
      graph → Dependabot tab) and verify the archived tier's ~90 alerts stop being reported while
      `cli-app`/`vercel-api` alerts still are
      — **File created and valid; the stated verification is impossible and was wrong to plan.**
      `.github/dependabot.yml` declares npm for `/cli-app` and `/vercel-api`, weekly, archived tier
      absent. Parsed and asserted valid.
      **`dependabot.yml` cannot suppress alerts.** Confirmed against GitHub's own options
      reference: the file governs *version-update and security-update pull requests* only, and its
      `directory` key merely tells Dependabot where to look in order to open them. Alerts are
      generated from the repository dependency graph and configured in repo Settings; there is no
      option to exclude a directory or manifest from alerting. So the archived tier's alerts will
      **not** stop being reported because of this file, and no wording of it could achieve that.
      **What the file does buy**, and why it was still worth adding: Dependabot will no longer open
      update PRs against `archived-sls-api/`, a frozen undeployed tier where such a PR could never
      be merged on its merits. That is real noise removal, just not the kind the task claimed.
      The reasoning is written into the file itself so the omission is not later "fixed" as an
      oversight.
      **Baseline captured for 3.2** (pre-push): **187 open alerts** — `archived-sls-api/yarn.lock`
      **127**, `cli-app/yarn.lock` **37**, `vercel-api/yarn.lock` **23**. Note the archived tier is
      127, not the ~90 this change estimated from a partial sample.
- [ ] 3.2 Re-read the total open alert count after 1.1 and 2.1 have landed; verify it dropped by
      roughly the 40 actionable ones plus the ~90 archived ones, and record the actual
      before/after numbers here. A count that barely moved means the dedupe in 1.1 did not take
      — **Expectation corrected before running this.** The archived tier's alerts will **not**
      drop (see 3.1 — `dependabot.yml` cannot suppress alerts), so the ~90 term is void; 127 of the
      187 will remain untouched. What should drop is `cli-app`'s **37** (the axios dedupe from 1.1)
      and part of `vercel-api`'s **23** (`tar` and `vite` cleared, `undici`'s 14 remaining per
      2.1). Blocked until the change is pushed and GitHub re-scans the lockfiles.

## 4. Correct the documentation

- [x] 4.1 In the root `CLAUDE.md`, update any dependency claim this change invalidates — at minimum
      the `cli-app` stack description if it names `axios` versions. Verify no reference to
      `axios@0.27` or `@googlemaps/google-maps-services-js@3.3.x` remains outside archived
      OpenSpec content
      — **Done.** Swept the repo: no stale version reference existed outside this change's own
      artifacts and the archived OpenSpec content, and `CLAUDE.md` never named an axios version —
      its one claim ("axios rejects on non-2xx") is still true under 1.x, verified in 1.3. Rather
      than a no-op edit, added the two things a future reader actually needs: that `axios` and
      `@googlemaps/google-maps-services-js` must be bumped **together** or the dedupe breaks, and
      the three `error.response.data` readers to re-verify after any future axios bump, since no
      test covers them.
- [x] 4.2 Add a short note to `CLAUDE.md` recording that `.github/dependabot.yml` deliberately
      excludes `archived-sls-api/`, and why — otherwise the next person reads the exclusion as an
      oversight and "fixes" it. Verify it points at `archived-sls-api/ARCHIVED.md` for the freeze
      rationale rather than restating it
      — **Done.** Added under Conventions, next to the existing workflow notes, pointing at
      `archived-sls-api/ARCHIVED.md` for the freeze rationale rather than restating it. Also
      records the 3.1 finding — that this scopes update **PRs** only and alerts cannot be filtered
      by directory — so the next reader does not expect the file to move the alert count.

## 5. Close out

- [x] 5.1 Run `cd cli-app && yarn test && yarn coverage` and
      `cd vercel-api && yarn test && yarn typecheck`; verify all four exit `0`
      — **Done.** All four exit `0` on Node 24.12.0 (`.nvmrc` default).
- [x] 5.2 Run `clip status` against the globally-installed binary and verify it still reports
      correctly — it probes `./package.json` then `__dirname/../package.json`, a path this bump
      does not touch but which breaks loudly if a dependency resolution changed shape
      — **Done, and both probe branches exercised by accident, which was useful.** Run from
      `vercel-api/` it reported `0.1.0 (Git folder)` — correctly picking up that tier's
      `package.json` from cwd; run from `~` it reported `0.3.0 (NPM folder)`. That is the
      documented gotcha behaving exactly as designed, not a regression. Signed-in state, engine,
      environment and all **5 saved locations** intact — confirming 1.3's configstore
      backup/restore left nothing damaged.
- [x] 5.3 Run `openspec validate bump-security-relevant-dependencies --type change --strict`;
      verify it passes with `specs` reported as skipped rather than missing
      — **Done.** Reports "is valid"; `specs` shows `skipped`, not missing.
- [x] 5.4 Confirm the two sibling changes (`bump-dev-tooling-dependencies`,
      `bump-interactive-surface-dependencies`) still describe only what is left after this one
      lands — in particular that neither still claims to bump `axios`, `@vercel/node` or `vitest`
      — **Done, no edits needed.** `bump-interactive-surface-dependencies` mentions none of the
      three. `bump-dev-tooling-dependencies` names all three only inside its **Non-goals**,
      explicitly disclaiming them as belonging to this change — which is now accurate rather than
      anticipatory. Nothing overlaps.
