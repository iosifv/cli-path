# 🔺 vercel-api

The API tier for `cli-path`, hosted on Vercel. **Not built yet — this folder is a placeholder.**

It replaces [`../archived-sls-api/`](../archived-sls-api/ARCHIVED.md) (AWS Lambda + Serverless
Framework, now frozen and undeployed).

## What it needs to do

Stand between the CLI and a map provider, so a user can get directions without holding provider
credentials of their own — while a global call cap keeps the project's own usage inside a free tier.

The CLI already speaks this contract via `cli-app/lib/clients/ClipApi.js`, so the shape is fixed at
both ends:

- `POST /location` — `{ query }` → a formatted address
- `POST /direction` — `{ origin, destination }` → `{ start, end, summary, distance, duration }`
- `POST /healthcheck`

`cli-app/utils/style.js`'s `print.direction()` renders exactly those five direction fields, so any
provider's response has to be mapped onto them.

Authentication stays on Auth0 (`iosifv.eu.auth0.com`) with the device authorization flow the CLI
already implements.

## Decisions still open

- **Map provider.** Leading candidate is OpenRouteService — covers both routing and geocoding under
  one free key, and hard-fails with 429 rather than billing, unlike Google.
- **Storage for the call counter.** Leading candidate is Upstash Redis via the Vercel Marketplace
  (`vercel install upstash --plan free`); `INCR` on a `calls:YYYY-MM` key is atomic and O(1).
- Whether to keep per-user usage rows (and therefore the `/statistics` endpoint) at all.

See `archived-sls-api/ARCHIVED.md` for what's worth reusing from the old implementation, and what
isn't.
