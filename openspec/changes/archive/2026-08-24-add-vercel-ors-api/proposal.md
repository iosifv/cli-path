## Why

The API tier that let `clip` users get directions without holding map-provider credentials was an
AWS Lambda + Serverless Framework stack proxying Google Maps. It carried an open-ended billing
risk: Google bills past the free tier rather than refusing the request, so a flawed call counter
was the only thing between the project and a surprise invoice. That stack is now frozen and
undeployed, leaving the CLI's default `clip` engine pointing at dead endpoints.

This change rebuilds the API tier on Vercel, backed by OpenRouteService, which hard-fails with
`429` instead of billing.

> Backfilled on 2026-08-21, after the implementation landed. Recorded here because the reasoning
> behind it otherwise lived only in a chat transcript.

## What Changes

- New API tier in `vercel-api/`: Vercel Functions, TypeScript, ESM.
- Map provider swapped from Google Maps to OpenRouteService for both geocoding and routing.
- Global monthly call cap moved from a DynamoDB table to an atomic Redis `INCR` counter.
- **BREAKING** (internal only — no deployed clients existed): the API now answers with real HTTP
  status codes instead of `401` for every failure class. `cli-app/lib/clients/ClipApi.js` was
  updated in the same change to branch on HTTP status rather than on `response.data.status_code`.
- **BREAKING** (internal only): the `slsdev` environment name is retired in favour of `vercel`,
  and `CLIP_SLS_API_URL` is renamed `CLIP_API_URL`. Because `application_environment` is persisted
  per user in configstore, `KeyManager.migrateEnvironment()` rewrites the stored value on the next
  CLI invocation.
- `/authentication` and `/statistics` endpoints are dropped. The former only echoed the Auth0
  check that every request already performs; the latter existed to read the DynamoDB usage table
  that no longer exists.
- `/healthcheck` becomes unauthenticated and unmetered.
- `axios` is declared as a direct dependency of `cli-app`. It was imported by two source files but
  resolved only transitively through `@googlemaps/google-maps-services-js`.

## Capabilities

### New Capabilities

- `directions-api`: the hosted endpoints the CLI calls — request/response contract, the mapping
  from an open routing provider onto the CLI's Google-shaped fields, authentication, and error
  semantics.
- `usage-quota`: the global monthly call cap that keeps the project inside its provider's free
  tier — how a call is claimed, refunded, and what happens when accounting is unavailable.

### Modified Capabilities

None. No spec previously existed for this project; both capabilities above are new.

## Impact

**New** — `vercel-api/`: `api/{direction,location,healthcheck}.ts`,
`lib/{guard,ors,format,counter,auth0,respond}.ts`, `schemas/`, `utils/constants.ts`, `test/`
(48 vitest tests), plus `package.json`, `tsconfig.json`, `vercel.json`, `.env.example`.

**Modified** — `cli-app/utils/constants.js` (`CLIP_API_URL`, `CLIP_ENVIRONMENTS`),
`cli-app/lib/clients/ClipApi.js` (HTTP status branching), `cli-app/lib/KeyManager.js`
(`LEGACY_ENVIRONMENTS`, `migrateEnvironment()`), `cli-app/commands/config.js`,
`cli-app/test/key-manager.test.js`, `cli-app/package.json`, `CLAUDE.md`.

**Dependencies** — adds `@upstash/redis` and `ajv`; drops the Google Maps SDK from the API tier
(`cli-app` keeps it for the `google` engine).

**External services** — requires an OpenRouteService API key and an Upstash Redis database
provisioned through the Vercel Marketplace. Auth0 (`iosifv.eu.auth0.com`) is unchanged; the CLI's
device authorization flow survived the rebuild untouched.

**Still stale** — `postman/schemas/index.yaml` and therefore `docs/swagger/`, plus the
`.insomnia/` and `.postman/` environments, all still describe the retired AWS API.
