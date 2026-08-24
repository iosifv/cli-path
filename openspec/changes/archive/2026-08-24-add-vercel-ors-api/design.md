## Context

See `proposal.md — Why` for motivation and `specs/` for the behaviour contract.

The constraint that shapes everything here is that the client half already existed and was not
being rewritten. `cli-app/lib/PathController.js` is an Adapter holding two interchangeable
clients, and `cli-app/utils/style.js`'s `print.direction()` renders exactly five fields —
`start`, `end`, `summary`, `distance`, `duration` — regardless of which client produced them.
Those fields are Google-shaped: `summary` is a road-name string like `"A10 and A2"`, and
`distance`/`duration` are pre-formatted human strings like `"1 hr 23 min"`, not magnitudes.

The `google` engine still exists and still produces exactly that shape from Google's own
response. So the new provider had to be bent to fit the existing shape, not the other way round —
otherwise the two engines would render differently and the Adapter would stop being an adapter.

`archived-sls-api/ARCHIVED.md` records three anti-patterns from the previous implementation that
this design deliberately avoids; they are called out at the relevant decisions below.

## Goals / Non-Goals

**Goals:**

- Keep the five-field contract byte-identical between the `clip` and `google` engines.
- Make the monthly cap correct under concurrency, and cheap at any usage level.
- Use real HTTP status codes, and update the client in the same change so nothing depends on the
  old workaround.
- Keep the provider swappable — the specs describe "the map provider", not OpenRouteService.

**Non-Goals:**

- Per-user quota or usage history. The archived tier had a usage table and a `/statistics`
  endpoint; neither is rebuilt. A single global cap is what protects the free tier, and per-user
  rows were never read for anything else.
- Caching provider responses. Worth doing if the cap ever binds; not yet justified.
- Changing the five-field contract. That is a two-sided change and out of scope here.

## Decisions

### Map provider: OpenRouteService over Google Maps

**Why:** Google bills past the free tier rather than refusing the request, so the call counter was
load-bearing for financial safety — a bug in it meant a bill. OpenRouteService hard-fails with
`429`. That converts the cap from a financial control into a courtesy, which is a much safer
posture for a hobby project whose API sits open behind an Auth0 login.

ORS also covers geocoding and routing under one key, so there is one credential to manage.

**Alternatives:** Mapbox (generous free tier, but still card-on-file and bills past it);
self-hosted OSRM + Nominatim (no quota at all, but an operational burden that dwarfs the feature).

### Geocode-then-route, and one request costs one unit

ORS routes between coordinates; the CLI sends free text. So a route lookup resolves both
endpoints and then routes between them — three provider calls for one client request.

The cap counts **client requests, not provider calls**. Counting provider calls would make the
budget depend on an implementation detail the user cannot see, and would mean a route silently
costs three times what an address lookup costs. The user-visible unit is the lookup.

**Trade-off:** the project's own ORS consumption is up to 3× the number the counter reports. The
cap must therefore be set with that multiple in mind — this is recorded on the cap's
configuration rather than hidden in the counter.

### `summary` is derived from step road names

ORS has no equivalent of Google's `routes[0].summary`. Every routing step carries the road `name`,
so the summary is built by aggregating distance per road name and taking the two roads the route
spends the most distance on, joined with "and".

**Why this rather than something simpler:** the alternative — returning the travel mode, or the
first road, or an empty string — would make the `clip` engine visibly worse than the `google`
engine on the same query, which breaks the Adapter's premise. Aggregating by distance reproduces
Google's actual output closely on real routes.

Unnamed ways (ORS uses `"-"`) are skipped, and the travel mode is the fallback when nothing is
named, so the field is never empty.

### Formatting happens server-side

ORS returns metres and seconds. Google returned formatted strings. The formatting lives in the
API rather than in the CLI so that `print.direction()` and the `google` client stay untouched and
the two engines remain pixel-identical.

**Alternative considered:** return raw magnitudes and format in the CLI. Cleaner in the abstract,
but it is a breaking change to both clients at once and buys nothing while only one provider needs
adapting.

### Counter: atomic increment, and the increment *is* the check

`INCR` on a `calls:YYYY-MM` key, with a TTL set on first write of the month so old keys self-clean.

This is a direct fix for two anti-patterns recorded in `ARCHIVED.md`:

- The archived `getMonthlyCount()` counted with a **full-table DynamoDB `Scan` on every request** —
  O(all rows ever written), degrading permanently as usage accumulated. `INCR` is O(1) forever.
- The archived quota check **read the count in middleware and wrote the row in the handler** — two
  non-atomic steps, so concurrent requests at the limit all passed the check. Here there is no
  read-then-write: `INCR` returns the new value, so exactly one caller can observe the value that
  crosses the cap. A rejected claim is released with `DECR`.

**Alternative considered:** Vercel Edge Config. Read-optimised, but writes go through the Vercel
API and are not atomic — it would reintroduce precisely the race being fixed.

### Refund on provider failure

A unit is claimed before the provider is called, then returned if the provider fails. Claiming
afterwards would let a burst of concurrent requests all pass the cap; claiming before and
refunding keeps the check atomic while not charging users for an outage.

Refunds are best-effort and swallow their own errors, so a failed refund cannot mask the error
that triggered it.

### Accounting never fails open

An unreachable or unconfigured usage store returns `503` rather than serving the request unmetered.
The archived counter returned `0` on error, which meant a store outage silently removed the cap
entirely — the opposite of what a safety control should do.

Local development without a store requires an explicit `CLIP_DISABLE_QUOTA=1`. Making the bypass
explicit means a misconfigured deployment fails loudly instead of quietly becoming unmetered.

### Real status codes, and the client updated in lockstep

The archived `formatJSONError` returned **401 for every failure class**, which is why the CLI
learned to branch on `response.data.status_code` instead of HTTP status. Fixing one side without
the other would break the client, so `ClipApi.js` was rewritten in the same change to branch on
HTTP status.

`status_code` is retained in the response body as a diagnostic string, but it is explicitly no
longer control flow.

### Auth: unchanged, but stricter on empty identities

The Auth0 `/userinfo` check carries over. One addition: a token that yields `200` with no `sub` is
treated as unauthenticated. `docs/README.md` records that omitting `scope` on the token request
silently yields an empty object from `/userinfo`; admitting such a caller would mean an anonymous
request reaching the provider on the project's key.

### Health check is unauthenticated and unmetered

A liveness probe that needs a bearer token is useless for monitoring, and one that consumes quota
is actively harmful. It reports configuration presence and current usage, never secrets.

### Validation with JSON Schema at runtime

The archived schemas served double duty — API Gateway validated against them, and
`json-schema-to-ts` derived handler types from them. On Vercel there is no gateway in front, so
the same schemas are compiled and validated in-process, preserving the pattern while restoring the
runtime check that would otherwise have been silently lost in the platform move.

## Risks / Trade-offs

- **ORS geocoding is less forgiving than Google's on vague input** → the CLI's saved-locations
  feature already encourages users to store resolved addresses, and a miss returns a clear `404`
  rather than a wrong route.
- **One lookup costs up to three ORS calls** → set the configured cap against ORS's own limits
  with that multiple in mind; `/healthcheck` exposes current usage for monitoring.
- **`summary` is heuristic, not authoritative** → it is presentational only; nothing routes on it,
  and it degrades to the travel mode rather than to an empty string.
- **A crash between claiming and refunding leaks one unit** → self-corrects at the month boundary,
  and the leak direction is conservative (under-serving, never over-serving).
- **The counter is a single global key** → a hot key at high traffic, which this project will never
  see. Revisit only if it does.
- **Deployment URL is a placeholder** → `CLIP_API_URL.vercel` currently holds a guessed hostname.
  Until it is replaced with the real deployment URL, the default `clip` engine cannot work.

## Migration Plan

There are no deployed clients to preserve compatibility with — the archived API is undeployed and
the published npm package points at dead endpoints — so this is effectively a clean slate.

The one real migration concern is local: `application_environment` is persisted in each user's
configstore, so retiring the `slsdev` name without a migration would leave upgrading users
resolving `undefined + path` at request time. `KeyManager.migrateEnvironment()` runs on every
construction and rewrites the stored value, driven by a `LEGACY_ENVIRONMENTS` map so future
renames follow the same route.

Rollback is `git revert` plus republishing the previous npm version; no data migration is involved
because no durable user data is written by this tier.

## Open Questions

- Should the cap be raised once real usage is observable? Deferred until the API is deployed and
  `/healthcheck` has reported a few weeks of actual numbers. Answering it changes a configured
  value, not the specs or the approach.
- Should route results be cached to stretch the cap? Only worth designing once the cap actually
  binds; caching keys and invalidation are a separate change.
