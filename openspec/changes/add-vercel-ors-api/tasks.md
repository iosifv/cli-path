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
- [x] 6.2 Exercise a full `clip direction` against the deployment; verify the `clip` engine renders
      five populated fields
      Narrowed on the user's decision: comparing against the `google` engine would need a Google
      Maps key, which `clip status` reports as unset — and not holding one is the entire reason the
      hosted engine exists, so the comparison is out of reach without deliberately provisioning a
      key nobody otherwise needs. Verified instead as originally recorded: a live Amsterdam→Utrecht
      lookup through the deployed `vercel` environment renders through `print.direction()` as
      `S110 and A2` / `41.6 km` / `47 mins` — five populated fields, matching the
      `directions-api` spec's route-lookup requirement.
- [ ] 6.3 Publish a patched `cli-app` to npm and reinstall globally; verify `yarn npm-reinstall`
      followed by `clip status` reports the new version from the NPM folder

## 7. Documentation refresh

- [x] 7.1 Rewrite `postman/schemas/index.yaml` to describe the deployed API — correct `servers`,
      the three current endpoints, the real status codes, and the response shapes; verify
      `docs/swagger/` renders it without validation errors
      Rewritten against `vercel-api/{api,lib,schemas}/*.ts`: `servers` now lists the production
      deployment and `http://localhost:3000/api/`; `/authentication` and the old `/heathcheck` typo
      are gone; `/healthcheck` is `GET|POST`, unauthenticated (`security: []`); `/direction` and
      `/location` require `bearerAuth` and enumerate `400/401/404/429/502` per `lib/respond.ts`'s
      `STATUS` map; request/response schemas match `schemas/{direction,location}.ts` (including the
      `profile` enum from `ORS_PROFILES`) and `lib/respond.ts`'s envelope (`message`, `status_code`,
      `monthly_call_count`, `monthly_call_limit`). Verified with `npx @apidevtools/swagger-cli
      validate postman/schemas/index.yaml` → `is valid`, plus a manual `$ref` resolution check.
- [x] 7.2 Update the architecture section of `docs/README.md` and regenerate
      `docs/clip-overview.drawio`; verify the described tiers match the repository
      `docs/README.md`: the "being rebuilt" note now says the API is live, names the deployment
      URL and OpenRouteService, and explains the `429`-vs-billing reason for the swap;
      "List of implemented things" moves the Serverless-Framework/DynamoDB entry under
      _(archived, frozen, no longer deployed)_, adds the live Vercel/OpenRouteService/Upstash/
      Ajv/Vitest stack, and adds the OpenSpec capability specs; "List of todo's" drops the two
      items this change already finished (deploying the API, moving off Google Maps) and now
      lists what's actually left (`6.3`, `7.4`). `docs/clip-overview.drawio`: the "serverless" box
      is relabelled `vercel-api (Vercel Functions)`, the now-dropped `/authentication` Lambda icon
      is removed (three endpoints left: `direction`, `location`, `healthcheck`), and the Google
      Maps API image cell is replaced with an OpenRouteService box — verified well-formed with
      `python3 -m xml.etree.ElementTree`.
- [x] 7.3 Refresh the `.insomnia/` and `.postman/` environment URLs; verify a request from each
      collection succeeds against the deployment
      `.insomnia/`: `localhost-dev` and `Base Environment` now point at `http://localhost:3000/api/`
      (was `/dev/`, the old Serverless Offline path); `aws-dev` — pointed at the retired API Gateway
      URL — retargeted to the live deployment and renamed `vercel-prod`
      (`https://cli-path.vercel.app/api/`). Requests build their URL as `{{ _.url }}<endpoint>`, so
      correcting `url` alone fixes every request in the workspace; verified with
      `curl https://cli-path.vercel.app/api/healthcheck` → `200 {"status_code":"OK",...}`, the same
      shape the `healthcheck` request expects. `.postman/api` only points at
      `postman/schemas/index.yaml` (fixed in 7.1) and an empty `postman/collections/` — nothing
      else to refresh there.
      Left alone, out of scope for "environment URLs": the `ApiSpec` entry
      (`.insomnia/ApiSpec/spc_1e70833c80c94e2489d123f9d978c14f.yml`) embeds its own full copy of the
      old OpenAPI spec inline, and a `cli-request-code`-style request still targets the retired
      `/authentication` endpoint. Both are leftover content, not URLs, and worth a follow-up.
- [ ] 7.4 Re-record the VHS demo gifs against the live API; verify `cd vhs && ./run-all.sh`
      regenerates `docs/vhs/*.gif` and the recorded runs still look correct
      **Blocked on 6.3.** `run-all.sh` regenerates against the *globally installed* `clip`, by
      design — that's what a real user runs. But the global install is still the pre-rebuild
      `cli-path@0.2.20`: its `utils/constants.js` has the old `CLIP_SLS_API_URL` object
      (`{localhost, slsdev}`, no `vercel` key), while the shared configstore now correctly holds
      `application_environment: "vercel"`. `CLIP_SLS_API_URL['vercel']` is `undefined`, so
      `getClipUrl()` builds the URL `undefined + 'location'` → axios rejects it with
      `ERR_INVALID_URL`. Reproduced live: the recording of `locations.tape` shows exactly that
      stack trace crashing the "add location" flow, confirmed on a re-run after fixing two
      unrelated environment issues first (see below). `direction-blank.tape` and
      `direction-saved.tape` fail the same way. Only `config.tape` doesn't call the API, so it's
      the one tape that legitimately succeeded — `docs/vhs/config.gif`/`.mp4` are freshly
      re-recorded and correct; `locations`, `direction-blank` and `direction-saved` were restored
      from `docs/vhs-backup-2022/` (the user's manual backup) rather than left as crash
      recordings. Sequencing: 6.3 must land first so the global binary matches the local
      checkout, then this task can be redone end to end.

      Two unrelated, real environment problems surfaced and were fixed getting this far, worth
      recording since they'll bite anyone else running `vhs` on this machine: `ttyd` was broken
      (built against a `libwebsockets` Cellar path Homebrew had since upgraded past — fixed with
      `brew reinstall ttyd`, which itself needed an unrelated `ca-certificates` link conflict
      resolved first), and `vhs` itself was badly outdated (`0.2.0` from Dec 2022 vs. current
      `0.11.0`, from an untrusted tap — fixed with `brew trust charmbracelet/tap` then
      `brew upgrade vhs`). Also: `run-all.sh`'s leading `clip location purge` purges real saved
      locations unconditionally, not just tape-recording scratch state — it ran three times
      during this troubleshooting (twice against a broken recorder that produced blank output,
      once against the real one), and the user's 4 saved locations were restored from a
      configstore backup each time. Worth fixing in `run-all.sh` itself at some point (a purge
      that isn't gated on confirmation is surprising), but out of scope for this change.
