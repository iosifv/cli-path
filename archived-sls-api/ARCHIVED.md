# ⚰️ archived-sls-api

**Status: dead. Frozen 2026-08-21. Not deployed, not maintained, not called by anything.**

This was the original API tier for `cli-path` — an AWS Lambda + API Gateway backend built with
Serverless Framework v3, which proxied the Google Maps API so CLI users wouldn't need their own
Google key. It is kept in the repo as a reference implementation and a record of the approach.

Its replacement lives in [`../vercel-api/`](../vercel-api/).

## What it was

| | |
| --- | --- |
| Service name | `clip-sls-api-2024` (an earlier incarnation was `clip-sls-api`) |
| Stage / region | `dev` / `us-east-1` |
| Runtime | `nodejs18.x`, TypeScript bundled with esbuild |
| Endpoints | `POST /healthcheck`, `/authentication`, `/location`, `/direction`, `/statistics` |
| Auth | Auth0 (`iosifv.eu.auth0.com`), bearer token validated per-request against `/userinfo` |
| Datastore | DynamoDB table `ClipApp-UsageLog` (partition `User`, sort `CreatedAt`) |
| Last local deploy artifacts | May 2024, see `.serverless/` (gitignored, local only) |

Two API Gateway deployments existed at different points:

- `g0bqnk3urf.execute-api.us-east-1.amazonaws.com/dev/` — referenced by `cli-app/utils/constants.js`
- `ri3kz3u55a.execute-api.us-east-1.amazonaws.com/dev/` — referenced by `postman/schemas/index.yaml`
  and the Insomnia environment

Both are considered dead. There are no active users to preserve compatibility for.

## Why it was replaced

The architecture was sound but the platform was heavier than the problem warranted, and the
dependency on Google Maps carried an open-ended billing risk: the DynamoDB call counter was the
only thing between the project and a surprise bill, since Google bills past the free tier rather
than refusing the request. The replacement targets an open routing provider that hard-fails
instead of charging.

## If you ever touch the AWS account again

- **`ClipApp-UsageLog` is declared inside `serverless.ts` as a stack resource.** Running
  `sls remove` deletes the table and all usage history with it. If you want the data, export it
  first, or add `DeletionPolicy: Retain` + `UpdateReplacePolicy: Retain` to the resource and
  deploy *that* before removing anything.
- The IAM statements in `serverless.ts` hardcode the table ARN, including the account id.
- CloudFormation stacks to look for: `clip-sls-api-2024-dev`, and possibly an older
  `clip-sls-api-dev`.

## Secrets

- `.env` (gitignored, never committed — verified) holds `GOOGLE_MAPS_API_KEY` and `AUTH0_TOKEN`.
  **The Google key is the one live liability in this folder.** Restrict or rotate it once nothing
  depends on it.
- `src/functions/*/mock.json` were tracked in git before commit `66b0c39`, and by design carried a
  real Auth0 bearer token written in by `update-auth0-token.js`. Those are short-lived user access
  tokens and expired long ago. Present in history; harmless.

## Running it (historical, for reference)

Required a real Auth0 token because the middleware authenticated every call:

```bash
yarn                              # install
yarn update-auth0-token <token>   # rebuild mock.json files from the .bak templates
yarn invoke-local-01-health       # then -02-auth, -03-location, -04-direction, -05-statistics
yarn sls offline                  # local API Gateway
yarn sls deploy                   # deploy
```

The CI workflow that ran `serverless info` against this stack is preserved, disabled, at
`.github/workflows/sls-api-test.yaml.archived`.

## Worth stealing for the replacement

- `src/functions/*/schema.ts` — JSON Schemas that served double duty as API Gateway request
  validation and as the source of the handler's TypeScript types via `json-schema-to-ts`.
- `src/libs/client-auth0.ts` — the Auth0 `/userinfo` check, reusable as-is.
- `src/libs/my-middleware.ts` — the auth + quota gate, though its middy wrapper is Lambda-specific.
- `src/libs/call-counter.ts` — note the flaws worth *not* reproducing: `getMonthlyCount()` does a
  full-table `Scan` on every request, and the read-then-write against the cap is not atomic, so
  concurrent requests can all pass the check at the limit.
