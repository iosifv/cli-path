## Context

See `proposal.md — Why` for motivation. The two tiers arrived at their current, uncoordinated
states differently: `cli-app`'s `.nvmrc`/CI matrix were set once, years ago, and never revisited;
`vercel-api` never had a Node version decision made for it at all — it was built against whatever
was on the machine that day, and Vercel has been quietly picking a default ever since.

## Goals / Non-Goals

**Goals:**

- Both tiers pinned to a Node version this repo deliberately chose, not one inherited by default.
- `cli-app`'s published floor (`engines.node`) stays permissive enough that installing `cli-path`
  doesn't break for a user one or two versions behind, while CI and local dev target the newest
  release.
- Remove the `c8@9.1.0` pin now that its reason (`c8@12`+ needs Node 20+, floor was 16) no longer
  holds.

**Non-Goals:**

- Modernising any application code to use newer runtime features. Out of scope — see
  `proposal.md — Non-goals`.
- Deciding `vercel-api`'s Node version independently of whether Vercel's platform actually supports
  it. That is a verification task, not a design decision to make on paper.

## Decisions

### Target versions: `22.x`, `24.x`, `26.x` in CI; `26` for local dev; `>=22` published floor

Three numbers doing different jobs:

- **`.nvmrc` → `26`.** The newest Node release, for whoever is actively developing this repo day to
  day. Local dev isn't a compatibility promise to anyone; it can run the newest thing.
- **CI matrix → `[22.x, 24.x, 26.x]`.** Three Node lines: `22.x` (the previous LTS, still in
  maintenance), `24.x` (current Active LTS), and `26.x` (current, pre-LTS until October 2026).
  Running all three costs more CI time than one version but catches a version-dependent regression
  immediately rather than by luck of which single version happened to be tested — the same
  reasoning `fix-esm-coverage-reporting` used to justify running coverage on `cli-app`'s full
  matrix rather than one entry.
- **`cli-app/package.json`'s `engines.node` → `>=22`.** `cli-path` is published to npm and
  installed globally by users this repo doesn't control the machines of. A floor at the oldest
  matrix entry (22) drops genuinely end-of-life versions (16, 18) without demanding anyone
  immediately be on the newest release the way CI is. This is a lower bar than CI tests, and that
  gap is deliberate: CI proves the newest version works, `engines` only promises the floor does.

*Alternative considered:* pinning `cli-app`'s `engines.node` to `26.x` outright, matching the
newest release everywhere. Rejected — for a published CLI, that's a compatibility break for any
installed-base user not already on the newest Node, for no functional gain; nothing in this change
needs a Node 26-only feature.

*Alternative considered:* a single-version CI matrix (`26.x` only), simpler output. Rejected for
the same reason `fix-esm-coverage-reporting` rejected it for coverage: the matrix already exists,
running it on all three costs nothing extra in complexity, and it catches gaps a single version
would hide.

### `vercel-api`'s Node version is a verification task, not a foregone conclusion

Node 26 shipped as a *Current* release; it does not become Active LTS until October 2026. Vercel's
own `engines.node` documentation example still shows `"24.x"`, not `"26.x"` — which may mean 26.x
isn't yet an accepted value for Vercel Functions, or may just mean the docs haven't caught up to a
release from a few months ago. Either is plausible, and guessing which produces a proposal that
might not be deployable.

So the task (`tasks.md` group 2) is to set `engines.node: "26.x"` in `vercel-api/package.json`,
attempt a preview deploy, and read what actually happens: if it deploys and `/api/healthcheck`
reports cleanly, 26.x stands; if Vercel rejects the value or the deploy fails on it, the recorded
fallback is `24.x` — Vercel's own current documented example, and this repo's CI already covers it
independently on the `cli-app` side.

*Alternative considered:* setting `24.x` from the start, since it's the version Vercel's docs
currently show. Rejected as premature — if 26.x already works, defaulting to 24.x costs a version
of currency for no reason other than the docs not being confirmed stale. Try the newer one first;
it costs one preview deploy to find out.

### `c8` is unpinned, not just re-pinned to a newer fixed version

`fix-esm-coverage-reporting`'s design.md recorded the pin as "a consequence of the Node target, not
a preference." `c8@12.0.0`'s current `engines` is `^20.19.0 || ^22.12.0 || >=23` — satisfied by
every version `setup-node` resolves for `22.x`/`24.x`/`26.x` in CI, and by `.nvmrc`'s `26` for
local dev. (It is *not* satisfied by every point in `cli-app`'s new `engines.node: ">=22"` floor —
22.0.0 through 22.11.x fall short — but that floor is a promise to `cli-path`'s installers, who
never receive `c8`; it ships only in `devDependencies` and is irrelevant to what a user's Node
needs to be.) The fix is to drop the exact pin back to a caret range against the current major, so
future `c8` patch releases are picked up normally rather than staying frozen at the version the
old constraint required.

## Risks / Trade-offs

**Node 26 may not be accepted by Vercel Functions yet.** → Explicit verification task with a
recorded fallback (`24.x`); see the decision above. Not a blocker for the `cli-app` side, which
doesn't depend on Vercel accepting anything.

**A three-entry CI matrix triples the workflow's run time cost for both `cli-app` workflow
files.** → Accepted; this project's CI runs are infrequent and the coverage this buys (catching a
version-dependent regression at push time instead of discovery in the wild) is worth more than the
extra minutes for a project of this size.

**Dropping Node 16/18 from `cli-app`'s CI matrix means those versions are no longer verified,
even though nothing in `engines.node` (`>=22`) permits installing on them going forward.** → That's
the point: 16 and 18 are past or near end-of-life, and continuing to test dead runtime versions
buys nothing. A user still on 16 or 18 installing an old published version is unaffected; installing
a version published after this change fails at `npm install` time with a clear engines mismatch
rather than a confusing runtime error later.

## Migration Plan

No data migration — this is build/runtime configuration only. `cli-app` ships no published
behaviour change; the next `yarn npm-publish` after this change simply carries the new
`engines.node` floor and the unpinned `c8` (a `devDependency`, invisible to installers either way).

`vercel-api`'s next deployment picks up the new `engines.node` value. If the preview-deploy
verification in `tasks.md` group 2 finds 26.x unsupported, the fallback to 24.x happens before
anything reaches production — this plan does not deploy an untested Node version straight to
`https://cli-path.vercel.app`.

Rollback is `git revert`; no external state depends on the specific Node version beyond the next
deploy picking up whatever `engines.node` says at that time.

## Open Questions

- **Should the CI matrix be revisited again when Node 26 becomes Active LTS in October 2026?**
  Plausibly worth dropping 22.x at that point to keep the matrix at three current/recent versions
  rather than growing it indefinitely. Not a decision this change needs to make now.
