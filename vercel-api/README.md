# 🔺 vercel-api

The API tier for `cli-path`, hosted on Vercel and backed by
[OpenRouteService](https://openrouteservice.org/). It replaces
[`../archived-sls-api/`](../archived-sls-api/ARCHIVED.md) (AWS Lambda + Serverless Framework, now
frozen and undeployed).

It stands between the CLI and a map provider so a user can get directions without holding provider
credentials of their own, while a global monthly cap keeps the project's own usage inside the
provider's free tier.

## Why OpenRouteService

The archived stack proxied Google Maps, which bills past the free tier rather than refusing the
request — the call counter was the only thing between the project and a surprise invoice. ORS
hard-fails with `429` instead, so the cap here is a courtesy to the provider rather than the sole
line of financial defence. ORS also covers routing *and* geocoding under one key.

## Endpoints

All three live under `/api/`, matching Vercel's filesystem routing.

| Endpoint | Auth | Metered | Request | Response |
| --- | --- | --- | --- | --- |
| `POST /api/direction` | Bearer | yes | `{ origin, destination, profile? }` | `{ direction: { start, end, summary, distance, duration } }` |
| `POST /api/location` | Bearer | yes | `{ query }` | `{ formatted_address }` |
| `GET\|POST /api/healthcheck` | none | no | — | `{ configured, monthly_call_count, monthly_call_limit }` |

`healthcheck` is deliberately open and unmetered: a liveness probe that needs a bearer token is
useless for monitoring, and one that consumes quota is worse.

Every response carries `message` and `status_code`. Successful ones also carry
`monthly_call_count` / `monthly_call_limit`.

### `profile`

Optional on `/direction`, defaulting to `driving-car`. Accepts any ORS profile — `cycling-regular`,
`foot-walking`, `wheelchair`, and the rest. The CLI does not send it yet; it is an extension point
that costs nothing to leave open.

## Trying it out

Use **`cli-path.vercel.app/docs`**, not `iosifv.github.io/cli-path/swagger/` — same Swagger UI,
different origin, and that difference matters here. This API has no CORS headers (it was only
ever called from the CLI, a non-browser client, so this never came up), so "Try it out" only works
when the docs page is same-origin with the API. `/docs` on this deployment is a `vercel.json`
rewrite to the Swagger UI published at `docs/swagger/` — no separate copy lives here — which makes
it same-origin with `/api/*` on `cli-path.vercel.app` and the requests go through. The GitHub Pages
copy is cross-origin to the API, so its "Try it out" calls fail in the browser with a CORS error;
it's fine for reading the spec, just not for calling the live API.

Its "Authorize" button can fetch a bearer token itself via Auth0 (Authorization Code + PKCE against
the CLI's public `client_id`) instead of one being pasted in manually; see
`postman/schemas/index.yaml`'s `auth0` security scheme. That part works from either origin — it's
only the actual `/api/*` calls that require same-origin.

## The contract, and where it bends

`cli-app/lib/clients/ClipApi.js` reads `response.data.direction` and
`response.data.formatted_address`, and `cli-app/utils/style.js`'s `print.direction()` prints those
five direction fields verbatim. They are Google-shaped, and ORS is not, so `lib/format.ts` does the
bridging:

| Field | Google gave | ORS gives | How it is mapped |
| --- | --- | --- | --- |
| `start` / `end` | `legs[0].start_address` | the Pelias `label` of each geocoded endpoint | used directly |
| `summary` | a road-name string, `"A10 and A2"` | nothing equivalent | the two roads the route spends the most distance on, from `segments[].steps[].name` |
| `distance` | `"12.3 km"` | metres | `formatDistance()` |
| `duration` | `"1 hr 23 min"` | seconds | `formatDuration()` |

Two consequences worth knowing:

- **ORS routes between coordinates, not addresses.** One `/direction` call fans out to three ORS
  calls — two geocodes plus one route. It still costs *one* unit of the monthly cap; the cap counts
  client requests, not upstream calls.
- **Formatting happens server-side**, so the `clip` and `google` engines stay visually identical in
  the terminal and `print.direction()` needs no changes.

## Real HTTP status codes

The archived API returned `401` for every failure class, which is why the CLI used to branch on
`response.data.status_code`. This API sends real statuses, and `ClipApi.js` was updated in the same
change to match.

| Status | `status_code` | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | body failed schema validation |
| 401 | `UNAUTHENTICATED` | missing, malformed, rejected, or identity-less token |
| 404 | `NOT_FOUND` | nothing geocoded, or no route between the points |
| 405 | `METHOD_NOT_ALLOWED` | wrong verb |
| 429 | `QUOTA_EXCEEDED` | monthly cap reached, or ORS is rate-limiting us |
| 500 | `SERVER_ERROR` | unhandled |
| 502 | `PROVIDER_ERROR` | ORS or Auth0 unreachable or broken |
| 503 | `STORE_UNAVAILABLE` | the usage counter is unreachable |

## The call counter

`INCR` on a `calls:YYYY-MM` key in Upstash Redis. The archived DynamoDB version got this wrong
twice, and both mistakes are fixed deliberately:

- It counted with a full-table `Scan` on every request — O(all rows ever written), permanently
  degrading. `INCR` is O(1).
- It read the count in middleware and wrote the row in the handler, two non-atomic steps, so
  concurrent requests at the limit all passed. Here **the increment is the check**: `INCR` returns
  the new value, so exactly one caller can observe the value that crosses the cap.

A rejected request is refunded with `DECR`, as is a request whose upstream provider call fails — a
provider outage shouldn't cost anyone their budget.

**The counter never fails open.** If Redis is unreachable or unconfigured, requests get `503`
rather than sailing through unmetered. For local work without a Redis, set `CLIP_DISABLE_QUOTA=1`
explicitly; there is no implicit bypass.

## Setup

```bash
cd vercel-api
yarn                                  # install

vercel link                           # associate with a Vercel project
vercel install upstash --plan free    # provisions Redis, injects KV_REST_API_*
vercel env add ORS_API_KEY            # get one at https://account.heigit.org/

vercel deploy --prod
```

Then put the deployment URL into `CLIP_API_URL.vercel` in `cli-app/utils/constants.js`.

For local development:

```bash
cp .env.example .env                  # fill in ORS_API_KEY
yarn dev                              # vercel dev, serves on :3000
```

`cli-app`'s `localhost` environment already points at `http://localhost:3000/api/` — switch to it
with `clip config`.

## Commands

```bash
yarn dev          # vercel dev
yarn test         # vitest, test/*.test.ts
yarn test-watch   # vitest in watch mode
yarn coverage     # vitest --coverage
yarn typecheck    # tsc --noEmit
yarn format       # prettier
yarn deploy-prod  # vercel deploy --prod
```

Tests stub only the two network edges (`fetch`) and Redis, so `test/api.test.ts` exercises the real
validation → auth → quota → provider → response path.

> The suite is `vitest` rather than the `mocha` used in `cli-app`. Mocha needs a loader shim to run
> TypeScript ESM; vitest handles it with no configuration.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ORS_API_KEY` | yes | OpenRouteService key, used for both geocoding and routing |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | yes | Upstash Redis, injected by `vercel install upstash` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | — | accepted as an alternative to the pair above |
| `CLIP_MAX_MONTHLY_CALLS` | no | global cap, default `1000` |
| `CLIP_ORS_TIMEOUT_MS` | no | default `8000` |
| `CLIP_AUTH0_TIMEOUT_MS` | no | default `5000` |
| `CLIP_DISABLE_QUOTA` | no | `1` bypasses the counter — local development only |

## Layout

| Path | Role |
| --- | --- |
| `api/` | one file per endpoint, Vercel filesystem routing |
| `lib/guard.ts` | method → schema → identity → quota, in that order |
| `lib/ors.ts` | OpenRouteService client and the mapping onto the CLI's shape |
| `lib/format.ts` | metres/seconds → the strings `print.direction()` prints |
| `lib/counter.ts` | the atomic monthly cap |
| `lib/auth0.ts` | bearer token → identity, via `/userinfo` |
| `lib/respond.ts` | the response envelope and status table |
| `schemas/` | JSON Schemas — ajv validates against them, `json-schema-to-ts` types the handlers from them |

## Authentication

Unchanged from the archived stack: Auth0 (`iosifv.eu.auth0.com`), bearer token validated per
request against `/userinfo`. The CLI's device authorization flow
(`cli-app/commands/authenticate.js`) is provider-agnostic and survived the rebuild untouched.

A token that yields a 200 with no `sub` is treated as unauthenticated — that is the
missing-`scope` gotcha recorded in `docs/README.md`, and it should not admit an anonymous caller.
