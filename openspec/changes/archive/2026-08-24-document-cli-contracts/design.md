## Context

See `proposal.md — Why` for motivation. The design-relevant facts:

`openspec/specs/` is empty. The only specs in the repo are the deltas under
`changes/add-vercel-ors-api/`, and they describe the API tier alone. So this change writes the
first specs that will describe an existing, shipped, published-to-npm codebase rather than one
being built — which is a different exercise, and the source of most of the decisions below.

Two constraints shape it. First, `cli-app` is the published product: `clip` is installed globally
from npm, so any requirement written here must hold for a program invoked from an arbitrary working
directory, by a user whose configstore was written by an older version. Second, the tier this
change documents is the one the API was built to satisfy — the five-field direction shape is
already recorded as a load-bearing constraint in `CLAUDE.md` and in `openspec/config.yaml`, and is
already honoured by `vercel-api/lib/format.ts`. Writing it as a spec is meant to make it checkable,
not to renegotiate it.

## Goals / Non-Goals

**Goals:**

- Specs that stay true if the implementation is restructured — the point of writing them is to
  catch the next `/authentication`-shaped break, and a spec pinned to today's function names cannot.
- A capability split along seams that already exist in the code, so a future change touching one
  area produces a delta against one spec rather than all four.
- Fixes scoped tightly enough that the change can be applied and archived without waiting on
  `add-vercel-ors-api` to be deployed.

**Non-Goals:**

- Deciding anything about the `google` engine's future. It is specified as one of two
  interchangeable sources because that is what it is, not as a commitment to keep it.
- Specifying the interactive dialogs' wording, ordering, or prompt style. Those are presentation,
  they change freely, and pinning them would make the spec a transcript.

## Decisions

### Specs describe behaviour, not the structure that currently produces it

The specs name no class, module or function. `PathController`, `KeyManager` and `ClipApi` appear
nowhere in them; they say "the CLI SHALL", "persisted state SHALL have exactly one owner".

The temptation with a backfill is to transcribe the code, which produces a spec that is trivially
satisfied and worthless — it can only ever confirm that the code is the code. Worse, it ossifies
accidents. This codebase has several: module-scope `KeyManager` instances constructed at import
time, a module-level `location` array shared between every instance, `process.exit(1)` called from
inside a network client. Those are all live behaviour, none of them is a requirement, and a spec
that recorded them would make fixing them look like a breaking change.

The test applied to each requirement: could the implementation be rewritten from scratch, and would
this sentence still have to be true? If not, it went into this document instead.

*Alternative considered:* documenting the architecture — modules, layers, call graph. Rejected
because that already exists, in `CLAUDE.md` and `docs/README.md`, and duplicating it into
`openspec/specs/` creates two documents that drift. Specs answer "what must remain true"; those
answer "how is it currently arranged".

### Four capabilities, flat, prefixed `cli-`

Split as `cli-engine-adapter`, `cli-persistent-config`, `cli-device-authentication`,
`cli-command-dispatch`.

The seams are the ones the code already has — provider access, persisted state, identity, and
dispatch are separately modifiable, and a change to one rarely touches another. Four also keeps
each spec short enough to read in one sitting, which matters more than usual here because nobody
will read them under deadline; they exist to be consulted.

The `cli-` prefix disambiguates tiers. `directions-api` and `usage-quota` are API-side and
unprefixed, so an unprefixed `engine-adapter` would sit beside them with nothing marking which half
of the system it constrains.

*Alternative considered:* nested paths — `cli/engine-adapter` alongside `api/directions-api`.
Rejected because it requires renaming the two existing capabilities, which are mid-flight in an
unarchived change; a prefix achieves the same legibility with no migration.

*Alternative considered:* one `cli-app` capability. Rejected: every future CLI change would produce
a delta against the same file, which is exactly the merge surface the delta format exists to avoid.

### The profile comes from Auth0, not from the API tier

`commands/authenticate.js` currently finishes by POSTing to the hosted API's `/authentication`
endpoint and storing the response as the user's profile. That endpoint no longer exists. The fix is
to ask Auth0 for the profile directly, with `GET /userinfo` and the access token the flow has just
obtained.

This is not merely the smallest fix, it is the correct layering. The endpoint never did anything the
CLI could not do for itself: it validated the bearer token by calling Auth0 `/userinfo` and returned
what came back. So the CLI was making a round trip through its own API to reach a service it can
reach directly — and, as a consequence, could not authenticate at all unless the API happened to be
deployed. `proposal.md` records that the endpoint was dropped because it "only echoed the Auth0
check that every request already performs"; the client half of that removal was simply missed.

`archived-sls-api/ARCHIVED.md` lists `src/libs/client-auth0.ts` under "worth stealing" as "reusable
as-is", and `vercel-api/lib/auth0.ts` did steal it. The CLI now uses the same endpoint with the same
method as the server-side check in `vercel-api/lib/auth0.ts`, so both halves agree on what a valid
identity is.

*Alternative considered:* decoding the `id_token` the device flow already returns. It avoids a
network round trip, but it means the CLI parsing and trusting a JWT it does not verify, and pulling
in a JWT library to do it — new dependency, new failure mode, and a second definition of identity
that can disagree with the server's. Rejected. The round trip happens once per authentication,
behind a spinner that is already polling on a five-second cycle; its cost is invisible.

### An empty profile is rejected client-side too

The CLI checks that the returned profile carries a `sub` before storing it, and treats its absence
as authentication failure.

This duplicates the check in `vercel-api/lib/auth0.ts`, deliberately. It is the recorded gotcha from
`docs/README.md`: omitting `scope` on the token request yields a `200` from `/userinfo` with an
empty object, so the failure is silent and surfaces much later as a confusing missing name. Catching
it at the moment of authentication puts the error next to its cause. The server keeps its own check
because it cannot trust the client to have made one.

### Missing identity is reported, not raised

`KeyManager.getUser()` reads the profile with `get()`, which throws on a missing value, and
`commands/status.js` calls it on a line outside its `try`. So `clip status` — the command a confused
user runs first — currently terminates on an uncaught error for anyone who has not authenticated.

`getUser()` will return `null` when no profile is stored, and the status command will report the
signed-in user through the same status-line style it already uses for the two API tokens, which is
built to display presence or absence.

The reasoning is about which lookup form fits: the existing `get()`/`getOrNull()` split (kept, and
specified) makes absence-is-an-error a deliberate choice by the caller. A status report is precisely
the case where absence is ordinary information — it is the command's job to say what is and is not
configured. The bug is not that `get()` throws; it is that a reporting command used the throwing
form.

*Alternative considered:* wrapping the call site in `try`/`catch`. Rejected — it leaves the same
trap set for the next caller, and exceptions-as-control-flow for an expected state is what produced
the bug.

### Tasks verify rather than implement, and say how

Most requirements here are already met, so their tasks name the observation that proves it —
running a command, exercising a flow, reading a specific behaviour — rather than "implement X".
Tasks that change code are confined to the two defects and are marked as such, per
`openspec/config.yaml`'s rule that tasks separate completed work from outstanding work.

A requirement whose verification cannot be stated concretely is a requirement written badly; the
task list is where that shows up, and each one that resisted was rewritten in the spec.

### Anti-patterns from the archived stack this change avoids

`archived-sls-api/ARCHIVED.md` records three. Two are server-side and cannot recur in `cli-app`
(the full-table `Scan` for usage counting, and the non-atomic read-then-write quota check —
`vercel-api/lib/counter.ts` addresses both). The third is directly relevant:

- **`formatJSONError` returned `401` for every failure class**, which taught the CLI to ignore HTTP
  status entirely and branch on a body field instead. `ClipApi.js` has since been rewritten to
  branch on real status. `cli-engine-adapter` therefore requires that a failed lookup *distinguish*
  being unable to reach the service from the service refusing — writing it as a requirement is what
  stops the collapse-everything-into-one-error habit from returning on the client side, where it is
  just as easy to reintroduce.

One more, from the same document's secrets section: `src/functions/*/mock.json` carried real bearer
tokens and were tracked in git before commit `66b0c39`. Nothing in this change writes a credential
to a file inside the repository; the access token stays in the user's configstore, outside the
installation. The corresponding risk is noted below.

## Risks / Trade-offs

**A backfilled spec can quietly bless a bug.** If a requirement is written by reading the code, and
the code is wrong, the spec makes the defect official. → Two were caught precisely by writing the
specs, which is the argument for the exercise; but the mitigation is structural, not lucky. Every
requirement was written from what the behaviour *should* be, then checked against the code, with
disagreements resolved explicitly — two became fixes here, and the rest became "the code wins",
recorded in `proposal.md — What Changes`.

**Nothing enforces the specs.** `cli-app`'s mocha suite is not wired into CI, and `openspec
validate` checks a spec's structure, not whether the code satisfies it. → Accepted, and the reason
tasks name concrete observations: the specs are a checklist for a human, and honest about it.
Wiring mocha into CI would help and is out of scope here.

**Coverage reporting does not work at all, so it cannot backstop any of this.** `yarn coverage`
reports 0% for every file in `cli-app` and exits non-zero. This is not a consequence of the change:
running it at `HEAD` in a scratch worktree produces the identical result. The cause is that `nyc`
15.1.0 instruments through CommonJS `require` hooks, while `cli-app` is `"type": "module"` — so no
module is ever instrumented, and the 70% thresholds in `.nycrc.json` gate nothing. `CLAUDE.md`'s
claim that ".nycrc.json enforces 70% statements/branches/lines/functions" is therefore not true in
practice. → Out of scope here, deliberately: fixing it means changing tooling, discovering what the
real coverage number is, and deciding what to do if it lands below 70% — none of which belongs in a
change about writing down CLI contracts. Tracked as its own change. Until then, `yarn test` passing
is the only automated signal, and the verification tasks in groups 3–6 are the deliberate
compensation for that.

**`get()`'s throwing behaviour is untested.** `cli-app/test/key-manager.test.js` asserts
`getOrNull()` returns `null` on a missing key, but no test asserts `get()` throws on one — every
`get()` call in the suite happens to hit a key that's present. The behaviour itself is correct
(read `KeyManager.js:161-169`), found true during task 4.3's verification. → Not fixed with a new
test, for the same reason coverage reporting isn't fixed above: extending the mocha suite outside
the two named fixes is a non-goal of this change. Worth picking up whenever the CI-wiring work
above happens.

**The access token is stored in plaintext** in the user's configstore, and this change specifies
that persistence without changing it. → Out of scope, and unchanged from today's behaviour. Worth
noting that the spec says the token SHALL be persisted, not that it SHALL be persisted in the clear
— encrypting at rest later would not contradict any requirement written here.

**Auth0 `/userinfo` becomes a hard dependency of authentication.** If it is unreachable at that
moment, authentication fails where it previously would have stored whatever the API returned. → The
device flow already cannot complete without Auth0; the token endpoint is polled against the same
host seconds earlier. A `/userinfo` failure at that point means Auth0 is down, in which case there
is no authentication to be had anyway.

**Four specs is four files to keep current.** A change touching several areas now updates several
deltas. → The alternative concentrates every future delta in one file. Merge pain scales worse than
file count.

## Migration Plan

No data migration. No stored value changes shape, and no environment name is retired, so
`LEGACY_ENVIRONMENTS` is untouched.

A user who authenticated against the old API has a populated profile already; nothing re-reads or
invalidates it. A user who authenticates after this change gets the same shape from Auth0 directly —
`/authentication` returned the `/userinfo` body under `data`, so the stored object is unchanged.

A user who authenticated *between* the API rebuild and this fix has no profile stored. They are
repaired by authenticating again; before this change `clip status` crashed on them, after it reports
that no user is signed in, which points them at the fix.

Rollback is `git revert` — no deployment, no external state. The npm publish that would carry the
fix to users is a separate step, tracked as task 6.3 of `add-vercel-ors-api`.

## Open Questions

- **Should `clip status` show the Auth0 `sub` as well as the display name?** The stored profile
  carries it, and the identity provider is visible in its prefix (`github|`, `google-oauth2|`),
  which is useful when a user has accounts with several. Purely additive to the status output;
  answerable whenever, and it changes no requirement.
- **Should authentication refresh a profile that is already stored?** Today it always overwrites,
  which is fine and costs one request. Only worth revisiting if `/userinfo` rate limits become a
  practical concern, which for a per-user CLI they are not.
