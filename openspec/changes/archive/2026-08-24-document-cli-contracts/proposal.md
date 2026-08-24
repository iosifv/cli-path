## Why

A user who authenticates with `clip` today gets a spinner that reports success, and then a
`clip status` that crashes. The device flow finishes its Auth0 half correctly, then POSTs to
`/authentication` — an endpoint the rebuilt API no longer serves — so `auth0_userinfo` is never
stored, and every later call to `KeyManager.getUser()` throws on the missing value.

That defect survived a full API rebuild because nothing describes what the CLI tier is supposed to
do. `openspec/specs/` is empty: the only specs in the repo are deltas for the API, written after
the fact. The client half — which is the published product, and which holds the contract the API
was built to satisfy — has no written contract at all. The five-field direction shape, the
configstore back-fill, the environment migration and the device flow all live only as code and as
prose in `CLAUDE.md`, where nothing validates them.

This change writes those contracts down as specs, and fixes the two defects that writing them down
exposed.

## What Changes

- Four new capability specs describing the `cli-app` tier as it is intended to behave. Requirements
  are drawn from the existing implementation, so most of them are already satisfied.
- **Fix**: `commands/authenticate.js` stops calling the removed `/authentication` endpoint and
  obtains the user's profile from Auth0's own `/userinfo` endpoint, using the access token it just
  received. Identity capture no longer depends on the API tier being reachable.
- **Fix**: `commands/status.js` no longer crashes when no profile is stored. An unauthenticated
  user sees a status line telling them to authenticate, which is what the command is for.
- No change to the five-field direction contract, to `PathController`'s engine selection, or to
  anything the `google` engine touches. Where the spec and the code disagree on anything other than
  the two fixes above, the code wins and the spec is corrected. Two corrections came out of the
  verification tasks in groups 3–6: `cli-command-dispatch`'s "unrecognised command" scenario no
  longer claims the CLI lists available commands (it only reports the name is unknown — commander's
  default behaviour), and its "Output is presented consistently" requirement now scopes the
  presentation-layer guarantee to labelled values, status lines and tables, carving out short
  confirmation messages, caught exceptions, and provider content handed back verbatim — the three
  categories `cli-app/commands/config.js` and `cli-app/commands/direction.js` write to the terminal
  directly.

## Non-goals

- **Not a refactor.** The specs describe the current design, including choices that would be made
  differently today (module-scope `KeyManager` singletons, a module-level `location` variable
  shared across instances, `process.exit()` from inside a client class). Recording behaviour is not
  endorsing the structure; changing it is separate work with its own change.
- **Not new CLI features.** No new commands, flags, or output.
- **Not the API tier.** `directions-api` and `usage-quota` already have specs under
  `changes/add-vercel-ors-api/`; this change does not touch them.
- **Not test coverage work.** Tasks verify each requirement against the code that exists.
  Extending `cli-app`'s mocha suite is out of scope, as is repairing coverage reporting —
  `yarn coverage` is broken independently of this change, recorded under `design.md — Risks /
  Trade-offs` and tracked separately.
- **Not a `docs/README.md` rewrite.** Documentation refresh is tracked as tasks 7.x of
  `add-vercel-ors-api`.

## Capabilities

### New Capabilities

- `cli-engine-adapter`: how the CLI reaches a map provider — the `setting_engine` selection, the two
  interchangeable clients, and the exact five-field shape `direction()` must resolve to so that
  rendering is identical whichever engine produced it.
- `cli-persistent-config`: what the CLI remembers between invocations and the guarantees around it
  — single ownership of the store, back-fill of missing keys on every construction, migration of
  retired environment names, and the deliberate split between a lookup that throws and one that
  returns null.
- `cli-device-authentication`: how a user proves who they are without typing credentials into a
  terminal — the Auth0 device authorization flow, the scope it must request, the polling cycle, and
  what is persisted on success.
- `cli-command-dispatch`: how an invocation reaches a command — the no-argument interactive mode
  versus git-style subcommands, and the requirement that both entry points reach the same
  behaviour.

### Modified Capabilities

None. No spec covers the `cli-app` tier today, so all four capabilities above are new.

## Impact

**New** — `openspec/changes/document-cli-contracts/specs/{cli-engine-adapter,
cli-persistent-config, cli-device-authentication, cli-command-dispatch}/spec.md`.

**Modified** — `cli-app/commands/authenticate.js` (drop the `/authentication` call, read Auth0
`/userinfo`), `cli-app/commands/status.js` (tolerate a missing profile),
`cli-app/utils/constants.js` (add the Auth0 `/userinfo` URL). Possibly
`cli-app/lib/KeyManager.js` if `getUser()` is made non-throwing rather than guarded at the call
site — a design decision recorded in `design.md`.

**Tests** — `cli-app/test/` gains coverage for the userinfo path; the suite is mocha and is not
wired into CI, so `yarn test` must be run locally.

**Dependencies** — none added. The fix uses `axios`, already a direct dependency.

**External services** — none added. Auth0 `/userinfo` is part of the same tenant
(`iosifv.eu.auth0.com`) the device flow already calls, and the access token already carries the
`openid profile` scope it requires.

**Interaction with `add-vercel-ors-api`** — that change is mid-flight (15/27 tasks). The
`/authentication` removal it describes is the direct cause of the defect fixed here. This change
does not block it, and the two can be archived independently.
