> Node 26 is a *Current* release, not yet Active LTS (that happens October 2026), and Vercel's own
> `engines.node` docs example still shows `24.x`. Group 2 treats whether Vercel accepts `26.x` as
> something to find out, not assume — see `design.md — Decisions`.

## 1. Bump `cli-app`

- [ ] 1.1 Change `cli-app/.nvmrc` from `18` to `26`; verify `nvm use` in `cli-app/` resolves to a
      Node 26 install (installing it via `nvm install 26` first if not already present)
- [ ] 1.2 Change the `node-version` matrix in both `.github/workflows/cli-app-test-build.yaml` and
      `.github/workflows/cli-app-install.yaml` from `[16.x, 18.x]` to `[22.x, 24.x, 26.x]`; verify
      both files still parse as valid YAML and the matrix comment (added by
      `fix-esm-coverage-reporting`) explaining why coverage runs on the whole matrix still reads
      correctly against the new entries
- [ ] 1.3 Add `"engines": { "node": ">=22" }` to `cli-app/package.json`; verify `npm install -g .`
      from `cli-app/` succeeds under Node 22, 24 and 26, and — if a Node <22 is available locally —
      that it fails with a clear engines-mismatch message rather than a cryptic runtime error
- [ ] 1.4 Relax `cli-app/package.json`'s `c8` pin from the exact `9.1.0` to a caret range against
      the current major (`^12.0.0` as of this change, but read `npm view c8 version` at
      implementation time rather than trusting this number); verify `yarn install` resolves a `c8`
      satisfying its own `engines` under Node 22.12+, 24 and 26
- [ ] 1.5 Run `cd cli-app && yarn test && yarn coverage` under each of Node 22, 24 and 26 (via
      `nvm use <version> && yarn install` before each); verify all three exit `0` with identical
      figures to each other and to the baseline `fix-esm-coverage-reporting` recorded
      (19.47%/65.11%/53.84%/19.47%) — a change here would mean something Node-version-dependent
      broke, not that the thresholds need adjusting

## 2. Bump `vercel-api`, verifying Vercel accepts it

- [ ] 2.1 Add `"engines": { "node": "26.x" }` to `vercel-api/package.json`; verify `vercel dev`
      still starts locally under a Node 26 install
- [ ] 2.2 Deploy to a Vercel preview (`vercel deploy`, not `--prod`); verify the deployment succeeds
      and read the build logs for the Node version Vercel actually used — confirm it matches `26.x`
      rather than silently falling back to a default
- [ ] 2.3 If 2.2 failed, or the build logs show Vercel silently substituting a different version:
      change `engines.node` to `"24.x"` (the version Vercel's own documentation currently shows as
      its canonical example) and repeat 2.2; verify this preview succeeds and record in this task
      that the fallback was needed and why
- [ ] 2.4 Hit the preview deployment's `/api/healthcheck`; verify it reports `200` with
      `configured.routing_provider` and `configured.usage_counter` both `true`, matching what
      production reports today — proving the new runtime didn't silently break provider or
      counter configuration
- [ ] 2.5 Run `cd vercel-api && yarn test && yarn typecheck` under Node 26 (or 24, if 2.3's fallback
      was needed) locally; verify both pass
- [ ] 2.6 Once the accepted version is confirmed, deploy to production (`vercel deploy --prod`);
      verify `https://cli-path.vercel.app/api/healthcheck` reports the same as the preview did in
      2.4, and that a live `clip location` lookup through the CLI still succeeds end to end

## 3. Correct the documentation

- [ ] 3.1 In the root `CLAUDE.md`, update "Node pinned to 18 by `cli-app/.nvmrc`; CI matrix covers
      16.x and 18.x" to describe the new `.nvmrc` value and the `[22.x, 24.x, 26.x]` matrix; verify
      no reference to `16.x` or `18.x` remains outside historical/archived OpenSpec content
- [ ] 3.2 Update the `c8` pin note this change is a follow-up to ("`c8` is pinned to `9.1.0` ...
      because `c8@12`+ requires Node 20+ and this project's floor is 16") — replace with the new,
      unpinned reality; verify it no longer references a Node 16 floor that no longer exists
- [ ] 3.3 Add a line noting `vercel-api/package.json` now declares `engines.node` explicitly, and
      what group 2 found about which version Vercel actually accepted; verify it matches
      `vercel-api/package.json` as it stands after group 2

## 4. Close out

- [ ] 4.1 Run `cd cli-app && yarn test && yarn coverage` and
      `cd vercel-api && yarn test && yarn typecheck` one more time on the `.nvmrc`-default Node
      version (26, or whatever group 2 settled on); verify all four commands exit `0`
- [ ] 4.2 Run `openspec validate bump-node-version-to-the-latest-stable-version --type change
      --strict`; verify it passes with `specs` reported as skipped rather than missing
- [ ] 4.3 Confirm `fix-esm-coverage-reporting`'s archived `design.md`/`CLAUDE.md` note about the
      `c8` pin still reads correctly now that it's been acted on — it should read as history
      ("was pinned because...") not as a live constraint; no edit needed to an archived file if it
      already does
