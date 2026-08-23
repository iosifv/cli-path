> Groups 1–4 were completed on 2026-08-21 and are checked to reflect the state of the repository.
> Groups 5–7 are the outstanding work: this change cannot be archived until the API is deployed
> and the CLI points at it.

## 1. API scaffolding

- [x] 1.1 Create `vercel-api/` as a TypeScript ESM project with `package.json`, `tsconfig.json`
      and `vercel.json`; verify `yarn typecheck` exits clean
- [x] 1.2 Add `utils/constants.ts` holding provider URLs, timeouts and the configurable cap;
      verify every value is overridable by environment variable
- [x] 1.3 Add `.env.example` documenting each variable, including the explicit local-only quota
      bypass; verify it lists every variable the code reads

## 2. Provider integration and the five-field mapping

- [x] 2.1 Implement `lib/format.ts` — metres to a scaled distance string, seconds to an
      hours/minutes string, and a road-name summary derived from routing steps; verify
      `test/format.test.ts` covers sub-kilometre, sub-100km, multi-day, unnamed-way and
      degenerate inputs
- [x] 2.2 Implement `lib/ors.ts` — forward geocoding, routing between coordinates, and the
      mapping onto `{ start, end, summary, distance, duration }`; verify `test/ors.test.ts`
      asserts coordinate order, header vs query-param auth, and the mapped output
- [x] 2.3 Distinguish a lookup miss from a provider outage from provider rate-limiting; verify
      the tests assert `NOT_FOUND`, `PROVIDER_ERROR` and `QUOTA_EXCEEDED` respectively
- [x] 2.4 Correct `summarizeRoads()` in `vercel-api/lib/format.ts` to split the several
      designations ORS packs into one step name ("Nieuwe Haagseweg, A4") and prefer the route
      number when a step carries both; verify against real captured steps from a live
      Amsterdam→Rotterdam call that the summary is `A4 and A13` rather than
      `A4 and Nieuwe Haagseweg, A4`, which named the same motorway twice and violated
      `specs/directions-api` — "a route spends most of its distance on two named roads → summary
      names those two roads"
- [x] 2.5 Classify the ORS `400` responses that mean "no route is possible" as `NOT_FOUND` rather
      than `PROVIDER_ERROR`, and name both resolved places in the message; verify against live ORS
      that Las Vegas→Queensland yields `NOT_FOUND`. ORS answers `400` with error code `2004` when a
      route would exceed its 6000km ceiling — not `404`, the only status the code special-cased — so
      `specs/directions-api` ("both endpoints resolve but no route exists → `404`") was violated,
      and the CLI reported an outage for a request the provider had correctly refused

## 3. Quota and access control

- [x] 3.1 Implement `lib/counter.ts` with an atomic monthly increment, first-write TTL, refund and
      a non-claiming read; verify `test/counter.test.ts` asserts exactly one caller is admitted at
      the boundary
- [x] 3.2 Make the counter fail closed when the store is unreachable or unconfigured; verify the
      tests assert a raised error rather than a permissive default
- [x] 3.3 Implement `lib/auth0.ts` including rejection of tokens that resolve to no subject;
      verify `test/api.test.ts` covers the empty-`/userinfo` case
- [x] 3.4 Implement `lib/guard.ts` ordering method, body, identity, then quota; verify the tests
      assert no quota is consumed by malformed or unauthenticated requests

## 4. Endpoints and client alignment

- [x] 4.1 Implement `api/direction.ts`, `api/location.ts` and `api/healthcheck.ts` with refunds on
      provider failure; verify `test/api.test.ts` passes (50 tests total across the suite)
- [x] 4.2 Implement `lib/respond.ts` mapping each outcome to a real HTTP status; verify the tests
      assert 400/401/404/405/429/502/503 are distinguishable
- [x] 4.3 Rewrite `cli-app/lib/clients/ClipApi.js` to branch on HTTP status; verify `yarn start
      --help` still runs and output goes through `utils/style.js`
- [x] 4.4 Rename `CLIP_SLS_API_URL` to `CLIP_API_URL` and add `LEGACY_ENVIRONMENTS` plus
      `KeyManager.migrateEnvironment()`; verify `cli-app` mocha tests assert `slsdev` is rewritten
      to `vercel` on the next construction
- [x] 4.5 Declare `axios` as a direct dependency of `cli-app`; verify it appears in
      `cli-app/package.json` rather than resolving through the Google SDK

## 5. Provisioning and deployment

- [x] 5.1 Obtain an OpenRouteService API key and record its documented free-tier limits; verify
      a manual geocode request against the key returns `200` — key obtained, held only in the
      gitignored `vercel-api/.env`; limits read from the account's own `x-ratelimit-*` headers
      (geocoding 1000/day, directions 2000/day, ~24h rolling) and recorded in
      `vercel-api/.env.example`; live geocode and route both returned `200`
- [x] 5.2 Run `vercel link` and `vercel install upstash --plan free`; verify `KV_REST_API_URL` and
      `KV_REST_API_TOKEN` appear in the project's environment — done through the Vercel dashboard
      rather than the CLI (the project is git-linked from `iosifv/cli-path` with root directory
      `vercel-api`); Upstash reachable, `PING` → `PONG`
- [x] 5.3 Set `ORS_API_KEY` via `vercel env add`; verify `vercel env ls` lists it for production —
      set in the dashboard; confirmed live by `/healthcheck` reporting `routing_provider: true`
- [x] 5.4 Choose a value for `CLIP_MAX_MONTHLY_CALLS` accounting for up to three provider calls per
      lookup; verify the chosen number against the ORS plan's documented monthly ceiling — set to
      **500**. ORS quotas are daily, not monthly: 1000 geocodes/day, and one `/direction` spends
      two, so 500 is the largest value at which spending the entire month's budget in a single day
      still lands exactly on the daily geocoding allowance and cannot induce a provider `429`
- [x] 5.5 Run `vercel deploy --prod`; verify `GET /api/healthcheck` on the deployment reports both
      `routing_provider` and `usage_counter` as configured — live at
      `https://cli-path-iosifv-projects.vercel.app/api/`, all three `configured` flags true. Two
      blockers cleared: `vercel.json` pinned `@vercel/node@3.2.24` which caps at Node 20 while the
      project runs 24.x, and Vercel Authentication was intercepting every request with a 302 to
      SSO. Guard verified live — 401/400/405 are distinguishable and five rejected requests left
      `monthly_call_count` at 0

## 6. Closing the loop with the client

- [x] 6.1 Replace the placeholder hostname in `CLIP_API_URL.vercel` in
      `cli-app/utils/constants.js` with the real deployment URL; verify `clip status` shows the
      `vercel` environment and a `clip location` lookup returns an address — set to
      `https://cli-path.vercel.app/api/`; `clip status` reports environment `vercel` and
      `✅ Signed in as Iosif V.`, and `location('Rijksmuseum')` returns
      "Rijksmuseum, Amsterdam, NH, Netherlands"
- [ ] 6.2 Exercise a full `clip direction` against the deployment and compare the rendered output
      against the `google` engine for the same query; verify both render five populated fields —
      **half done, and the other half may be unreachable.** The `clip` engine is verified: a live
      Amsterdam→Utrecht lookup renders through `print.direction()` as `S110 and A2` / `41.6 km` /
      `47 mins`, five populated fields. The comparison against `google` needs a Google Maps key,
      which `clip status` reports as unset — and not holding one is the entire reason the hosted
      engine exists. Either supply a key for a one-off comparison, or narrow this task to the
      `clip` engine alone
- [ ] 6.3 Publish a patched `cli-app` to npm and reinstall globally; verify `yarn npm-reinstall`
      followed by `clip status` reports the new version from the NPM folder

## 7. Documentation refresh

- [ ] 7.1 Rewrite `postman/schemas/index.yaml` to describe the deployed API — correct `servers`,
      the three current endpoints, the real status codes, and the response shapes; verify
      `docs/swagger/` renders it without validation errors
- [ ] 7.2 Update the architecture section of `docs/README.md` and regenerate
      `docs/clip-overview.drawio`; verify the described tiers match the repository
- [ ] 7.3 Refresh the `.insomnia/` and `.postman/` environment URLs; verify a request from each
      collection succeeds against the deployment
- [ ] 7.4 Re-record the VHS demo gifs against the live API; verify `cd vhs && ./run-all.sh`
      regenerates `docs/vhs/*.gif` and the recorded runs still look correct
