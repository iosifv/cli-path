## Why

Both tiers are pinned to old Node versions with no deliberate upper bound. `cli-app/.nvmrc` pins
18, and both `.github/workflows/cli-app-*.yaml` run a `[16.x, 18.x]` matrix — 16.x has been past
end-of-life since September 2023, and 18.x reaches end-of-life in April 2025. `vercel-api` has no
`.nvmrc` and no `engines` field at all, so its runtime is whatever Vercel's platform default
happens to be at deploy time: undocumented, unmanaged, and not the same version this repo tests
locally.

This has a live consequence already. `fix-esm-coverage-reporting` just pinned `c8` to `9.1.0` in
`cli-app/package.json` *specifically* because `c8@12`+ requires Node 20+ and the floor was 16 —
and left a note in `CLAUDE.md` for whoever removes that floor to unpin it in the same change. That
change is this one.

## What Changes

- `cli-app/.nvmrc` moves from `18` to `26`, the newest Node release, for local development.
- Both `cli-app-test-build.yaml` and `cli-app-install.yaml` move their CI matrix from `[16.x, 18.x]`
  to `[22.x, 24.x, 26.x]`.
- `cli-app/package.json` gains an `engines.node` field (`>=22`) — a floor, not a lock to the newest
  release. `cli-path` is a globally-installed CLI with real users outside this repo's CI; nothing
  today stops someone on an older Node from installing it, and this change is deliberately about
  raising that floor off end-of-life versions, not about requiring the bleeding edge.
- `cli-app/package.json`'s `c8` pin is removed, or relaxed to its current major — the Node 16
  constraint that required `9.1.0` no longer applies once the floor moves to 22.
- `vercel-api/package.json` gains an explicit `engines.node`, replacing the implicit platform
  default with a version this repo actually controls and tests against.
- The root `CLAUDE.md` is corrected: the `.nvmrc`/CI-matrix line, and the `c8`-pin explanation that
  becomes historical once unpinned.

## Non-goals

- **Not a code modernisation.** No adoption of syntax or APIs that Node 22/24/26 newly unlock —
  this is a version bump, not a rewrite. Behaviour is expected to be identical before and after.
- **Not the `archived-sls-api` tier.** Frozen, undeployed, never touched — per `CLAUDE.md`.
- **Not a guarantee that Node 26 lands everywhere.** Node 26 is a *Current* release (shipped
  ~April 2026); it does not become Active LTS until October 2026, two months from now. Vercel's own
  documentation still shows `engines.node: "24.x"` in its canonical example. Whether Vercel Functions
  accepts `26.x` today is unverified going in — `design.md` and `tasks.md` treat it as a thing to
  confirm, with `24.x` as the recorded fallback for `vercel-api` specifically if it doesn't.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a runtime/tooling change — nothing about how `clip` or the hosted API behaves for a
user changes. `.openspec.yaml` sets `skip_specs: true`, the same call `fix-esm-coverage-reporting`
made for the same reason.

## Impact

**Modified** — `cli-app/.nvmrc`, `cli-app/package.json` (`engines`, `c8` version),
`.github/workflows/cli-app-test-build.yaml`, `.github/workflows/cli-app-install.yaml`,
`vercel-api/package.json` (`engines`), root `CLAUDE.md`.

**Dependencies** — `c8` unpinned from `9.1.0` to its current major, now that the Node 16 floor
that required the pin is gone.

**CI** — three-entry matrix instead of two; each workflow run costs more but nothing about what it
checks changes.

**Deployment** — `vercel-api`'s next deployment runs on whichever Node version its new `engines`
field resolves to, which may differ from whatever the implicit platform default was serving before
this change. Worth confirming post-deploy that `/api/healthcheck` still reports cleanly.

**Interaction with `fix-esm-coverage-reporting`** — that change (archived) pinned `c8@9.1.0` and
left an explicit note in `CLAUDE.md` that unpinning it belongs to "whoever modernises the runtime."
This change is that follow-up.
