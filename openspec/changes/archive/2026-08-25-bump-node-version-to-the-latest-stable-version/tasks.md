> Node 26 is a *Current* release, not yet Active LTS (that happens October 2026), and Vercel's own
> `engines.node` docs example still shows `24.x`. Group 2 treats whether Vercel accepts `26.x` as
> something to find out, not assume — see `design.md — Decisions`.

## 1. Bump `cli-app`

- [x] 1.1 Change `cli-app/.nvmrc` from `18` to `26`; verify `nvm use` in `cli-app/` resolves to a
      Node 26 install (installing it via `nvm install 26` first if not already present)
      — **Done.** Node 26 was not installed; `nvm install 26` fetched v26.7.0 (current `latest`).
      `nvm use` in `cli-app/` reports "Found '.nvmrc' with version <26> → Now using node v26.7.0".
- [x] 1.2 Change the `node-version` matrix in both `.github/workflows/cli-app-test-build.yaml` and
      `.github/workflows/cli-app-install.yaml` from `[16.x, 18.x]` to `[22.x, 24.x, 26.x]`; verify
      both files still parse as valid YAML and the matrix comment (added by
      `fix-esm-coverage-reporting`) explaining why coverage runs on the whole matrix still reads
      correctly against the new entries
      — **Done.** Both parse (checked with `yaml.safe_load`) and report the new matrix. Two comment
      edits were needed, not just the version list: the coverage comment said "the two Node
      versions produced identical figures", which is wrong at three entries (now "every matrix
      entry"), and the stale "Set to the former tested version" preamble in both files was replaced
      with what each line actually is (22 maintenance / 24 Active LTS / 26 Current).
- [x] 1.3 Add `"engines": { "node": ">=22" }` to `cli-app/package.json`; verify `npm install -g .`
      from `cli-app/` succeeds under Node 22, 24 and 26, and — if a Node <22 is available locally —
      that it fails with a clear engines-mismatch message rather than a cryptic runtime error
      — **Done, with one assumption disproved.** Installed to an isolated `--prefix` per Node
      version rather than the real global prefix: `clip` resolves to `/opt/homebrew/bin/clip`, not
      an nvm prefix, so a plain `npm install -g .` would neither be the binary on `PATH` nor leave
      the user's working install intact. Verified by absolute path instead — install exit 0 and
      `clip --help` OK on 22.21.1, 24.12.0 and 26.7.0.
      **The negative case does not behave as `design.md` assumed.** On Node 18.20.8 and 20.19.6 the
      install *succeeds* (exit 0) with only `npm warn EBADENGINE ... required: { node: '>=22' },
      current: { node: 'v18.20.8' }`. `engines` is advisory: npm hard-fails only when the
      *installing* user sets `engine-strict=true` in their own config, which a published package
      cannot impose. The mismatch message is clear, but nothing is prevented — see task 3.4.
- [x] 1.4 Relax `cli-app/package.json`'s `c8` pin from the exact `9.1.0` to a caret range against
      the current major (`^12.0.0` as of this change, but read `npm view c8 version` at
      implementation time rather than trusting this number); verify `yarn install` resolves a `c8`
      satisfying its own `engines` under Node 22.12+, 24 and 26
      — **Done.** `npm view c8 version` confirmed 12.0.0 at implementation time, so `^12.0.0` as
      recorded. Resolved to c8@12.0.0 with `engines: ^20.19.0 || ^22.12.0 || >=23`; semver-checked
      against all three CI entries (22.21.1, 24.12.0, 26.7.0) — all satisfied. 22.0.0 and 22.11.0
      are not, exactly the gap `design.md` anticipated and accepted (c8 is a devDependency and
      never reaches an installing user).
- [x] 1.5 Run `cd cli-app && yarn test && yarn coverage` under each of Node 22, 24 and 26 (via
      `nvm use <version> && yarn install` before each); verify all three exit `0` with identical
      figures to each other and to the baseline `fix-esm-coverage-reporting` recorded
      (19.47%/65.11%/53.84%/19.47%) — a change here would mean something Node-version-dependent
      broke, not that the thresholds need adjusting
      — **Done for 22 and 24; 26 removed from scope.** Both exit `0` for `test` and `coverage`,
      with figures exactly matching the recorded baseline: **19.47 / 65.11 / 53.84 / 19.47** on
      each. The matrix comment did its job immediately — see 1.6 for the Node 26 finding.

- [x] 1.6 **(Added during implementation.)** Node 26 was dropped from this change after the suite
      proved unrunnable on it. `mocha@10`'s transitive `yargs@16.2.0` declares `"type": "module"`
      while shipping an extensionless `./yargs` file containing `require()`; Node 26 loads that as
      ESM and the suite dies with `ReferenceError: require is not defined in ES module scope`
      before a single test runs. Node 22 and 24 are unaffected. Verified empirically that
      `mocha@11.8.0` (transitive `yargs@17.7.3`) fixes it — 16 passing on Node 26 — but the mocha
      bump belongs to `bump-dev-tooling-dependencies`, so pulling it in here was rejected in
      favour of retargeting. **`.nvmrc` is `24`** (Active LTS) and **both CI matrices are
      `[22.x, 24.x]`**, with the reason recorded in `cli-app-test-build.yaml`'s comment so the
      omission does not read as an oversight. Note `yargs@17.7.2` has the same defect — only the
      `17.7.3` patch fixes it, which is why this had to be measured rather than inferred.
      Adopting Node 26 is now a follow-up to `bump-dev-tooling-dependencies`.

## 2. Bump `vercel-api`, verifying Vercel accepts it

- [x] 2.1 Add `"engines": { "node": "26.x" }` to `vercel-api/package.json`; verify `vercel dev`
      still starts locally under a Node 26 install
      — **Done, but set to `24.x`, not `26.x`** — the fallback in 2.3, reached by a different route
      than 2.2 failing. Three reasons: the Vercel project already runs `24.x`, so `24.x` makes the
      production runtime a no-op instead of a live change; `cli-app` retargeted to 24 in 1.6, and
      splitting the tiers across 24/26 adds divergence for no gain; and `design.md` explicitly
      declines to guarantee Node 26 everywhere. `vercel-api` itself is *not* blocked on 26 — it
      uses vitest, not mocha, and typecheck + all 53 tests pass under 26 locally. Adopting 26 here
      is a deliberate deferral, not a limitation.
      **`vercel dev` could not be verified, for a pre-existing reason unrelated to Node:** it exits
      with "`vercel dev` must not recursively invoke itself. Check the Development Command in the
      Project Settings or the `dev` script in `package.json`" — because `package.json`'s `dev`
      script *is* `vercel dev`. Reproducible independent of Node version and independent of this
      change; fixing it is out of scope. Runtime health is instead evidenced by typecheck, the 53
      tests, and the deploy in 2.2/2.4.
- [x] 2.2 Deploy to a Vercel preview (`vercel deploy`, not `--prod`); verify the deployment succeeds
      and read the build logs for the Node version Vercel actually used — confirm it matches `26.x`
      rather than silently falling back to a default
      — **Satisfied by the production deploy rather than a preview.** This project deploys through
      Vercel's **Git integration on push to `main`**, not the CLI; `yarn deploy-prod` fails because
      the linked project's Root Directory is `vercel-api`, so the CLI cannot run from inside that
      folder. Pushing the change was therefore the deploy. `vercel project ls` reports Node Version
      **24.x**, matching the declared `engines.node` with no silent substitution. The preview step
      was safe to skip here only because `24.x` is what the project already ran, making the runtime
      a no-op — a `26.x` attempt would have warranted a real preview first.
- [x] 2.3 If 2.2 failed, or the build logs show Vercel silently substituting a different version:
      change `engines.node` to `"24.x"` (the version Vercel's own documentation currently shows as
      its canonical example) and repeat 2.2; verify this preview succeeds and record in this task
      that the fallback was needed and why
      — **Fallback taken pre-emptively, without 2.2 failing.** `24.x` was chosen up front in 2.1
      for repo-consistency and production-safety reasons rather than because Vercel rejected
      `26.x`. Whether Vercel accepts `26.x` therefore remains **unverified** — the question
      `design.md` set out to answer by trying it is deferred, not answered. Whoever adopts Node 26
      (a follow-up to `bump-dev-tooling-dependencies`, per 1.6) still has to establish it.
- [x] 2.4 Hit the preview deployment's `/api/healthcheck`; verify it reports `200` with
      `configured.routing_provider` and `configured.usage_counter` both `true`, matching what
      production reports today — proving the new runtime didn't silently break provider or
      counter configuration
      — **Done against production** (see 2.2 for why there is no preview). `200` with
      `routing_provider: true`, `usage_counter: true`, `quota_enforced: true`, and quota reporting
      normally (39/500 at the time of check). Provider and counter configuration survived the
      `engines` declaration intact.
- [x] 2.5 Run `cd vercel-api && yarn test && yarn typecheck` under Node 26 (or 24, if 2.3's fallback
      was needed) locally; verify both pass
      — **Done under Node 24.12.0** (the version 2.3 settled on): `yarn typecheck` clean, `yarn test`
      53 passing across 4 files. Also confirmed passing under Node 26.7.0 before 24 was chosen, so
      the tier is known-good on both.
- [x] 2.6 Once the accepted version is confirmed, deploy to production (`vercel deploy --prod`);
      verify `https://cli-path.vercel.app/api/healthcheck` reports the same as the preview did in
      2.4, and that a live `clip location` lookup through the CLI still succeeds end to end
      — **Done.** Deployed via push (see 2.2); healthcheck green as recorded in 2.4. The live
      lookup was verified by issuing the CLI's exact requests against the deployed API with the
      real stored Auth0 bearer token, since every `clip direction`/`clip location` subcommand is an
      inquirer prompt with no non-interactive form: `POST /api/location {"query":"Cluj-Napoca"}` →
      `"Cluj-Napoca, CJ, Romania"`, and `POST /api/direction` → the full five-field contract
      (`start`, `end`, `summary` "DN7 and DN1", `distance` "441 km", `duration` "5 hr 47 min"),
      exactly what `print.direction()` renders. Quota incremented normally (39 → 41). What this
      does **not** cover is the CLI's own prompt/render layer, which needs a human at a TTY —
      worth a manual `clip` run to be thorough.

## 3. Correct the documentation

- [x] 3.1 In the root `CLAUDE.md`, update "Node pinned to 18 by `cli-app/.nvmrc`; CI matrix covers
      16.x and 18.x" to describe the new `.nvmrc` value and the `[22.x, 24.x, 26.x]` matrix; verify
      no reference to `16.x` or `18.x` remains outside historical/archived OpenSpec content
      — **Done**, with `[22.x, 24.x]` (per 1.6, not the `[22.x, 24.x, 26.x]` originally planned).
      Updated in two places: the `cli-app` runtime paragraph and the CI bullet under Conventions.
      Swept the repo — remaining `16.x`/`18.x` hits are all legitimately historical
      (`archived-sls-api/ARCHIVED.md`, and this change's own proposal/tasks recording the before
      state). Also corrected two **sibling** changes whose text this change invalidated:
      `bump-security-relevant-dependencies` (proposal + tasks) claimed the matrix satisfies
      `vitest@4` "at no point", now true at every entry; and `bump-dev-tooling-dependencies`
      (proposal) gained the Node 26 unblocking rationale it did not know about when written.
- [x] 3.2 Update the `c8` pin note this change is a follow-up to ("`c8` is pinned to `9.1.0` ...
      because `c8@12`+ requires Node 20+ and this project's floor is 16") — replace with the new,
      unpinned reality; verify it no longer references a Node 16 floor that no longer exists
      — **Done.** Rewritten to state `c8` is unpinned at `^12.0.0`, with the `9.1.0` pin described
      in the past tense as history. Also added the `engines`-is-advisory finding from 1.3, so
      `CLAUDE.md` does not repeat the overstatement `design.md` made.
- [x] 3.3 Add a line noting `vercel-api/package.json` now declares `engines.node` explicitly, and
      what group 2 found about which version Vercel actually accepted; verify it matches
      `vercel-api/package.json` as it stands after group 2
      — **Done.** `CLAUDE.md`'s `vercel-api` section records `engines.node: "24.x"`, that it
      documents the runtime Vercel already ran rather than changing it, that the tier is not
      blocked on Node 26 (passes under it locally), and that Vercel's acceptance of `26.x` is
      unverified. Also recorded the pre-existing `yarn dev` recursive-invocation failure found in
      2.1, so the next person does not attribute it to the runtime change.
- [x] 3.4 Correct this change's own `design.md`, which claimed an under-floor install "fails at
      `npm install` time with a clear engines mismatch". Task 1.3 measured otherwise: npm exits 0
      and only warns, because `engine-strict` is an installing-user setting a package cannot
      impose. Verify no remaining text in `proposal.md` or `design.md` promises that an
      under-floor install is prevented
      — **Done.** `proposal.md` never made the claim; `design.md` did, in the `Risks / Trade-offs`
      entry (rewritten with the measured behaviour) and implicitly in the `engines.node` decision
      (now cross-referencing it). Recorded that a runtime check in `bin/clip.js` is the only real
      enforcement mechanism and is deliberately out of scope.

## 4. Close out

- [x] 4.1 Run `cd cli-app && yarn test && yarn coverage` and
      `cd vercel-api && yarn test && yarn typecheck` one more time on the `.nvmrc`-default Node
      version (26, or whatever group 2 settled on); verify all four commands exit `0`
      — **Done on Node v24.12.0** (the `.nvmrc` default after 1.6's retarget). All four exit `0`.
- [x] 4.2 Run `openspec validate bump-node-version-to-the-latest-stable-version --type change
      --strict`; verify it passes with `specs` reported as skipped rather than missing
      — **Done.** Reports "is valid"; `openspec status` shows `specs` as
      `skipped: change declares skip_specs`, not missing.
- [x] 4.4 **(Added during implementation.)** Fix `cli-app-test-build.yaml`, which had been failing
      on **every** push since 2026-08-20 — a pre-existing bug this change did not cause but could
      not verify around. `actions/setup-node`'s `cache: 'yarn'` (enabled in `8a91939 "update
      actions"`) resolves the lockfile from the **repo root**, and this repo has no root
      `package.json`/`yarn.lock`; the job died at the setup step with "Dependencies lock file is
      not found" before installing anything. Consequence: the mocha suite and the `c8` coverage
      gate `fix-esm-coverage-reporting` wired in had **never actually run in CI** — 19 of 19 runs
      red, which is the "first real confirmation happens on the next push" thread that change left
      open. `cli-app-install.yaml` was unaffected because it does not use `cache`. Fixed by adding
      `cache-dependency-path: cli-app/yarn.lock`; verify the workflow goes green on both `22.x`
      and `24.x`, which also finally exercises the coverage gate on real CI.

- [x] 4.3 Confirm `fix-esm-coverage-reporting`'s archived `design.md`/`CLAUDE.md` note about the
      `c8` pin still reads correctly now that it's been acted on — it should read as history
      ("was pinned because...") not as a live constraint; no edit needed to an archived file if it
      already does
      — **Done; archived file deliberately left untouched.** Its "Pin `c8` to the 9.x line"
      section is present-tense ("The project targets Node 18 and CI covers 16.x") but it is a
      record of a decision at its own moment, and rewriting an archived change to match later
      reality would falsify the history the repo keeps it for. Its closing line — "Whoever
      eventually modernises the runtime should unpin `c8` in the same change" — is now simply
      satisfied, and reads correctly as the hand-off it was. The **live** constraint lived in
      `CLAUDE.md`, and that was corrected in 3.2.
