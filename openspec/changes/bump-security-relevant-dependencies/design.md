## Context

See `proposal.md — Why` for motivation. Two facts about the current dependency graph shape
everything below, and neither is visible from `package.json` alone:

```
cli-path@0.3.0
├─┬ @googlemaps/google-maps-services-js@3.3.16
│ ├── axios@0.27.2 deduped
│ └─┬ retry-axios@2.6.0
│   └── axios@0.27.2 deduped
└── axios@0.27.2
```

**One** copy of axios serves three dependents. That is why 22 alerts land on a single package, and
why the obvious move — bump `axios`, leave the Google client alone — produces a *worse* tree than
the one it started from: `google-maps-services-js@3.3.16` declares `axios@^0.27.0`, so it would
stop deduping and install its own `0.27.2` beside the new `1.x`. Same vulnerable code, now harder
to see.

Second: `cli-app` has no test that exercises either HTTP client. `test/*.test.js` covers
`KeyManager`, formatting, and command wiring; nothing stubs a transport or asserts on an axios
error. So `yarn test` passing after this bump proves close to nothing about the bump. That is a
property of the existing suite, not something this change introduces — but it dictates how
verification has to work here.

## Goals / Non-Goals

**Goals:**

- Clear the axios and transitive alerts on the two tiers that are deployed or installed, with the
  dependency tree ending in a single deduped `axios@1.x`.
- Prove the Auth0 device flow still authenticates end to end, by running it, before this is
  considered done.
- Make the repo's Dependabot count mean something — every remaining alert should be one somebody
  could actually act on.

**Non-Goals:**

- Adding the HTTP-client test coverage whose absence this design works around. Real work, and a
  genuinely good idea, but it is a testing change wearing a security change's clothes. Recorded in
  `Open Questions` instead.
- Adopting anything axios 1.x newly offers (`AxiosHeaders`, the new adapter API, `formSerializer`).
  The bump's goal is that nothing observable changes.

## Decisions

### `axios` and `@googlemaps/google-maps-services-js` bump as one atomic step

Not two tasks that happen to be adjacent — one task, verified together. `3.4.2` requires
`axios@^1.5.1`, which is the only thing that lets the dedupe land on `1.x` across all three
dependents. Splitting them means an intermediate state where the alert count is unchanged and the
tree is worse, and if that state is what gets committed while attention moves elsewhere, the whole
change has cost effort and bought nothing.

*Alternative considered:* bump `axios` alone and accept the duplicated `0.27.2` under the Google
client, on the grounds that the `google` engine is opt-in and most users never touch it. Rejected —
Dependabot scores the lockfile, not the code path, so the alerts would stay open and the next
person would re-derive this same tree from scratch. Worse, it would leave a vulnerable transport
live for exactly the users who supplied their own API key.

*Alternative considered:* drop `@googlemaps/google-maps-services-js` for direct `fetch` calls,
removing a dependency entirely. Rejected as out of scope and against the repo's stated character —
`CLAUDE.md` is explicit that breadth of technology is the point here, and the Google client is one
of the two engines the `cli-engine-adapter` spec describes.

### Behaviour of axios 1.x on error bodies is verified by observation, not assumed

The three `error.response.data` readers are the only application code this bump can plausibly
break. Rather than reading the migration guide and declaring them fine, group 1 runs each failure
path and looks at what actually comes back. This mirrors how
`bump-node-version-to-the-latest-stable-version` treats "does Vercel accept Node 26" — a question
to answer by trying it, with the finding recorded, not a paper decision.

The device-flow poll (`commands/authenticate.js:76`) gets its own task because its failure mode is
the nastiest in the repo: a rejected request is the *expected* state on every cycle until the user
finishes in the browser, so `err.response.data.error` is read dozens of times per successful
sign-in. If 1.x ever leaves that body unparsed, sign-in doesn't degrade — it throws
`Cannot read properties of undefined`, and it throws for every user at once.

*Alternative considered:* add a stubbed-transport test for each of the three readers as part of
this change, making the verification permanent rather than one-shot. Tempting, and it is the right
long-term answer, but it expands a security bump into a test-infrastructure change — the exact
scope-mixing this change was split out to avoid. See `Open Questions`.

### `.github/dependabot.yml` scopes what is watched; `archived-sls-api/` is not edited

`CLAUDE.md` and `archived-sls-api/ARCHIVED.md` both state the tier is frozen and undeployed. The
alerts against it are therefore permanently un-actionable: upgrading it violates the freeze,
and the vulnerabilities are unreachable because nothing runs. Excluding it from Dependabot's
scanning is the only move that respects both facts.

*Alternative considered:* dismiss the ~90 alerts individually in GitHub's UI. Rejected — it is
manual, invisible to the repo, and silently re-earned the moment a new advisory lands against a
package that tier already has.

*Alternative considered:* delete `archived-sls-api/` outright, which would end the problem
permanently. Rejected — it is deliberately kept as reference material, and `CLAUDE.md` cites its
anti-patterns as live teaching material for the current API.

### `@vercel/node` 3 → 7 is treated as low-risk because consumption is type-only

Six files import from it, and every one is `import type { VercelRequest, VercelResponse }`. No
runtime value crosses the boundary; the package's job at build time is to supply two interfaces and
at deploy time to be the builder Vercel already runs. A four-major jump would normally warrant more
caution, but `yarn typecheck` mechanically proves the only contract in use. The deploy is the other
half of the proof, which is why group 2 ends at a preview deployment rather than at a green
typecheck.

### An anti-pattern this change is careful not to re-enable

`archived-sls-api/ARCHIVED.md` records that the old API returned **HTTP 401 for every failure
class**, which is why the CLI historically ignored HTTP status and branched on
`response.data.status_code`. That workaround was removed when `vercel-api` shipped real statuses;
`ClipApi.js:33-35` now reads `error.response.status` and the body's `message` directly. Any axios
change that blurs *which* status a rejection carried would quietly recreate the same blindness from
the client side. The verification task for `reportAndExit()` therefore checks that a 404 and a 429
still surface distinguishably — not merely that some error prints.

## Risks / Trade-offs

**The Auth0 device flow breaks for every user at once and no test catches it.** → Group 1 runs a
real end-to-end `clip` authentication against live Auth0 before the change is closed out, and the
`err.response.data.error` read is an explicit verification step rather than an incidental one.

**`yarn test` passing is near-meaningless for this change**, since no test touches an HTTP client.
→ Accepted and stated plainly rather than papered over; verification is by running the real CLI
against the live API, including a deliberately-failing lookup. The permanent fix is deferred to
`Open Questions`.

**`@googlemaps/google-maps-services-js@3.4.2` may itself change response shapes**, which would
break `GoogleApi.js`'s mapping onto the five-field `direction` contract that `print.direction()`
renders. → A `google`-engine direction lookup is verified directly. Noted: this cannot be verified
by whoever holds no Google Maps key — `add-vercel-ors-api` hit exactly this and narrowed its
equivalent task to the `clip` engine alone. The task records that fallback explicitly rather than
pretending the verification always happens.

**Bumping four majors across two tiers at once makes a CI failure ambiguous.** → Mitigated by
sequencing behind the Node change (so the runtime is already known-good) and by the two tiers being
independently revertable — `cli-app` and `vercel-api` share no lockfile.

**`vercel-api` redeploys to production automatically on merge**, so an unnoticed `@vercel/node`
regression reaches the live API without a human gate. → Group 2 deploys to a *preview* and checks
`/api/healthcheck` before the change is merged, not after.

## Migration Plan

No data migration; this is dependency and configuration only.

`cli-app` publishes nothing as part of this change — the bumped dependencies reach users on the
next `yarn npm-publish`, whenever that happens for an unrelated reason. There is no urgency to
publish immediately: the vulnerable `axios` is already in every installed copy, and one more day
of it is not worse than a rushed publish.

`vercel-api` reaches production through Vercel's Git integration on merge to `main`. Note this
contradicts `CLAUDE.md` and `vercel-api/README.md`, which both document `yarn deploy-prod` as the
deploy path; that command currently fails because the linked Vercel project's Root Directory is set
to `vercel-api`, so the CLI cannot be run from inside that folder. Correcting that documentation is
not this change's job, but whoever implements group 2 will hit it and should not be surprised.

Rollback is `git revert` plus `yarn install` in the affected tier. For `vercel-api`, reverting also
requires a redeploy (automatic on the revert commit) or an instant rollback to the prior deployment
from the Vercel dashboard.

## Open Questions

- **Should `cli-app` gain stubbed-transport tests for its two HTTP clients?** This change works
  around their absence rather than fixing it, and the same gap will make the next dependency bump
  just as manual. `document-cli-contracts` already left a related known gap open
  (`KeyManager.get()`'s throwing behaviour is untested) after ruling test expansion a non-goal, so
  this would be the second entry on that list — probably enough to justify a change of its own.
- **Does the `[22.x, 24.x, 26.x]` matrix the Node change introduces stay valid for `vitest@4`?**
  Its `engines` (`^20.0.0 || ^22.0.0 || >=24.0.0`) is satisfied by all three today. Worth
  re-checking at implementation time rather than trusting a number recorded here.
