> **Sequenced after `bump-node-version-to-the-latest-stable-version`** — the Node 16 floor blocks
> `mocha@11` (`^18.18 || ^20.9 || >=21`) and `chai@6` (`>=18`). Independent of
> `bump-security-relevant-dependencies`. Best landed *before*
> `bump-interactive-surface-dependencies`, so that change's diff is its own rewrites rather than
> reformatting noise layered on top.
>
> Nothing here is already complete — all groups are outstanding.
>
> **Commit structure is load-bearing, not cosmetic.** Groups 1, 2 and 3 must be three separate
> commits in that order. Collapsing them makes "the config was wrong" and "Prettier 3 changed its
> mind" indistinguishable in the diff. See `design.md — Decisions`.

## 1. Fix the Prettier config bug (still on Prettier 2)

- [ ] 1.1 Establish what Prettier currently reaches before changing anything: run
      `npx prettier --check .` from the repo root and read the file list. Verify whether it reaches
      `docs/swagger/dist/*.js` (~1MB of vendored minified bundles, plus our customised
      `swagger-initializer.js`) — **there is no `.prettierignore` anywhere in the repo**. If it
      does, create one covering at minimum `docs/swagger/dist/` and re-check before proceeding;
      this resolves `design.md`'s open question and must happen before any `--write`
- [ ] 1.2 Delete `cli-app/.prettierrc` (`tabWidth: 4`, no `printWidth` — contradicts root) **and**
      `vercel-api/.prettierrc` (currently identical to root, removed to prevent the same drift).
      Verify with `npx prettier --find-config-path cli-app/lib/KeyManager.js` and the same for a
      `vercel-api` `.ts` file that both now resolve to the **root** `.prettierrc`
- [ ] 1.3 Reformat both tiers with the **currently installed Prettier 2**:
      `npx prettier --write "cli-app/**/*.js" "vercel-api/**/*.ts"`. Verify
      `git diff --stat` shows changes concentrated in `cli-app/` (the tier whose config was wrong)
      and little or nothing in `vercel-api/` (whose config already matched root) — a large
      `vercel-api` diff means 1.2 resolved config differently than expected
- [ ] 1.4 Verify this reformat is whitespace-only:
      `git diff --ignore-all-space --ignore-blank-lines` must come back **empty**. Anything it
      surfaces is not whitespace and must be read line by line before continuing
- [ ] 1.5 Run `cd cli-app && yarn test` and `cd vercel-api && yarn test && yarn typecheck`; verify
      all pass. **Commit here** — this is the "fix the config bug" commit

## 2. Bump Prettier to 3 and reformat again

- [ ] 2.1 Bump `prettier` from `^2.7.1` to `^3.x` in **both** `cli-app/package.json` and
      `vercel-api/package.json`; run `yarn install` in each and verify `npx prettier --version`
      reports 3.x in both tiers
- [ ] 2.2 Reformat both tiers again with Prettier 3 and verify with
      `git diff --ignore-all-space --ignore-blank-lines` that the result is **empty** — i.e.
      Prettier 3 changed only whitespace relative to Prettier 2's output. If it is non-empty,
      read every hunk: `trailingComma` is explicitly `es5` in the root config so the well-known
      v3 default change should *not* appear, and its presence would mean the config is not being
      picked up
- [ ] 2.3 Run `cd cli-app && yarn coverage` and record the new figures. Update `.c8rc.json`'s
      `statements`/`branches`/`functions`/`lines` to the **measured** values — reformatting moves
      physical line counts, so a shift of a point or two is expected and correct. Verify the gate
      passes at the new numbers. Do **not** add tests to hold an old number, and do not leave a
      number that now fails (`design.md — Decisions`)
- [ ] 2.4 Run `cd cli-app && yarn test` and `cd vercel-api && yarn test && yarn typecheck`; verify
      all pass. **Commit here** — this is the "Prettier 3" commit, with no version bumps other
      than Prettier in it

## 3. Bump the test runner, assertion library and compiler

- [ ] 3.1 Bump `mocha` (`^10.2.0` → `^11.x`) and `chai` (`^4.3.7` → `^6.x`) in
      `cli-app/package.json`; run `yarn install`, then `yarn test`. Verify the single suite
      `cli-app/test/key-manager.test.js` passes unchanged — it uses `import { assert } from 'chai'`
      (a named ESM import) across 22 assertions, which is the form Chai 5+'s ESM-only rewrite
      keeps, so **no test edit is expected**. If one *is* needed, record what and why here
- [ ] 3.2 Confirm no Mocha configuration surface was missed: there is no `.mocharc.*` in the repo
      and `cli-app`'s `test` script invokes `./node_modules/mocha/bin/mocha.js` with no flags.
      Verify that still resolves and runs under Mocha 11 (the binary path is an implementation
      detail of the package layout and is the one thing a major bump could move)
- [ ] 3.3 Bump `typescript` (`^5.6.3` → `^7.x`) in `vercel-api/package.json`; run `yarn install`
      then `yarn typecheck`. Verify it exits `0`. If v7 rejects something v5 accepted, pin to the
      latest v6 instead and record the rejection and the fallback here — the same
      "try newer, record the fallback" shape `bump-node-version-to-the-latest-stable-version` uses
      for Vercel's Node support
- [ ] 3.4 Run `cd vercel-api && yarn test`; verify all suites still pass under the new compiler.
      **Commit here** — this commit contains no formatting changes at all

## 4. Correct the documentation

- [ ] 4.1 In the root `CLAUDE.md`, fix the Prettier claim. It currently reads "Prettier (root
      `.prettierrc`, duplicated in `cli-app/`)" — the duplicate is being deleted, and it was never
      actually a duplicate (`tabWidth: 4` vs `2`, no `printWidth`). Verify the corrected text names
      the root `.prettierrc` as the only config and mentions the `.prettierignore` if 1.1 created one
- [ ] 4.2 Update `CLAUDE.md`'s `cli-app` command notes if they name `mocha`/`chai` versions, and the
      `vercel-api` notes if they name `typescript`. Verify no superseded version number remains
      outside archived OpenSpec content

## 5. Close out

- [ ] 5.1 Run `cd cli-app && yarn test && yarn coverage` and
      `cd vercel-api && yarn test && yarn typecheck`; verify all four exit `0`
- [ ] 5.2 Smoke-test the real binary, since 19% statement coverage cannot backstop a 38-file
      reformat: run `cd cli-app && yarn start --help`, then one real end-to-end command
      (`clip location` against the live API). Verify output is byte-identical in shape to before
      the change — all CLI output flows through `cli-app/utils/style.js`, so a formatting-induced
      break would surface there
- [ ] 5.3 Verify the commit history reads as three separable commits (config fix → Prettier 3 →
      runner/compiler bumps), and that reverting the middle one alone leaves a working repo
- [ ] 5.4 Run `openspec validate bump-dev-tooling-dependencies --type change --strict`; verify it
      passes with `specs` reported as skipped rather than missing
