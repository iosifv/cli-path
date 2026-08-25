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

- [x] 1.1 Establish what Prettier currently reaches before changing anything: run
      `npx prettier --check .` from the repo root and read the file list. Verify whether it reaches
      `docs/swagger/dist/*.js` (~1MB of vendored minified bundles, plus our customised
      `swagger-initializer.js`) — **there is no `.prettierignore` anywhere in the repo**. If it
      does, create one covering at minimum `docs/swagger/dist/` and re-check before proceeding;
      this resolves `design.md`'s open question and must happen before any `--write`
      — **Done; the open question resolves to "yes, and worse than expected."** `prettier --check .`
      from the root reached **122 files**, not the 38 this change is about — including every file
      in `docs/swagger/dist/` (8.2MB of vendored minified bundles, *plus* the customised
      `swagger-initializer.js` whose OAuth wiring is deliberately shaped), the whole frozen
      `archived-sls-api/` tier, tool-managed `.insomnia/`/`.postman/`/`.claude/`, and all of
      `openspec/` including the archive of past changes.
      Created `.prettierignore` covering the vendored bundle, the archived tier, tool-managed
      directories, OpenSpec artifacts, and generated output. Re-checked: **122 → 28 files**, and
      `docs/swagger/dist` and `archived-sls-api` are confirmed excluded. Running `--write` before
      this would have expanded minified bundles into millions of lines and rewritten a historical
      archive.
- [x] 1.2 Delete `cli-app/.prettierrc` (`tabWidth: 4`, no `printWidth` — contradicts root) **and**
      `vercel-api/.prettierrc` (currently identical to root, removed to prevent the same drift).
      Verify with `npx prettier --find-config-path cli-app/lib/KeyManager.js` and the same for a
      `vercel-api` `.ts` file that both now resolve to the **root** `.prettierrc`
      — **Done.** Before: `cli-app/.prettierrc` and `vercel-api/.prettierrc` respectively. After
      `git rm` of both: each resolves to the root `.prettierrc`.
- [x] 1.3 Reformat both tiers with the **currently installed Prettier 2**:
      `npx prettier --write "cli-app/**/*.js" "vercel-api/**/*.ts"`. Verify
      `git diff --stat` shows changes concentrated in `cli-app/` (the tier whose config was wrong)
      and little or nothing in `vercel-api/` (whose config already matched root) — a large
      `vercel-api` diff means 1.2 resolved config differently than expected
      — **Done, and the config bug turns out to have been almost entirely latent.** `vercel-api`:
      **zero** changes, as predicted. `cli-app`: **one file, one line** —
      `utils/validation.js` — not the substantial diff `design.md` expected from a `tabWidth: 4`
      vs `2` mismatch.
      The reason: the code was already written and maintained at 2-space indentation matching the
      **root** config, so `cli-app/.prettierrc` had never actually been applied to it. The single
      line that did change is a `printWidth` effect, not indentation — it had been wrapped to fit
      80 columns (the implicit default of a config with no `printWidth`) and now fits root's 100
      on one line. So the stale config was a real trap, but a loaded one that had barely been
      sprung; deleting it prevents a future accident rather than undoing a past one. The "38-file
      reformat" this change was largely scoped around does not exist.
- [x] 1.4 Verify this reformat is whitespace-only:
      `git diff --ignore-all-space --ignore-blank-lines` must come back **empty**. Anything it
      surfaces is not whitespace and must be read line by line before continuing
      — **Came back NON-empty; read line by line and cleared.** The single surfaced hunk is
      `cli-app/utils/validation.js`:
      ```
      -export const isRequired = (input) =>
      -  input === '' ? 'This value is required' : true
      +export const isRequired = (input) => (input === '' ? 'This value is required' : true)
      ```
      The non-whitespace part is the **added parentheses** around the ternary, which is why the
      check did not come back clean. Prettier wraps a ternary used as an arrow-function body in
      parens as a matter of style; the expression is semantically identical with or without them.
      Confirming it is a style convention and not a semantic change: the **next line of the same
      file** already carries that exact shape —
      `export const noArgs = () => (process.argv.length === 2 ? true : false)` — so this makes the
      file self-consistent rather than introducing anything new. Cleared deliberately, not waived:
      one hunk, read in full.
- [x] 1.5 Run `cd cli-app && yarn test` and `cd vercel-api && yarn test && yarn typecheck`; verify
      all pass. **Commit here** — this is the "fix the config bug" commit
      — **Done.** All three exit `0`. Committed as `5b169e7`, commit 1 of the 3 this change
      requires.

## 2. Bump Prettier to 3 and reformat again

- [x] 2.1 Bump `prettier` from `^2.7.1` to `^3.x` in **both** `cli-app/package.json` and
      `vercel-api/package.json`; run `yarn install` in each and verify `npx prettier --version`
      reports 3.x in both tiers
      — **Done.** `^3.9.6` in both; both resolve to `prettier@3.9.6`.
- [x] 2.2 Reformat both tiers again with Prettier 3 and verify with
      `git diff --ignore-all-space --ignore-blank-lines` that the result is **empty** — i.e.
      Prettier 3 changed only whitespace relative to Prettier 2's output. If it is non-empty,
      read every hunk: `trailingComma` is explicitly `es5` in the root config so the well-known
      v3 default change should *not* appear, and its presence would mean the config is not being
      picked up
      — **Done, and the result is the strongest possible: Prettier 3 changed nothing at all.**
      Reformatting all 38 source files with `prettier@3.9.6` produced **zero** changes to any `.js`
      or `.ts` file — its output is byte-identical to Prettier 2's for this codebase. The
      `--ignore-all-space` check does come back non-empty, but every hunk in it is the
      `package.json`/`yarn.lock` version bump from 2.1, i.e. my own dependency edit, not
      formatting. Scoped to source files only, the diff is empty.
      The `trailingComma` v3 default change did **not** appear, exactly as predicted — the root
      config sets `es5` explicitly, so the default is inert. Zero trailing-comma lines changed,
      which also confirms the root config is being picked up after 1.2's deletions.
- [x] 2.3 Run `cd cli-app && yarn coverage` and record the new figures. Update `.c8rc.json`'s
      `statements`/`branches`/`functions`/`lines` to the **measured** values — reformatting moves
      physical line counts, so a shift of a point or two is expected and correct. Verify the gate
      passes at the new numbers. Do **not** add tests to hold an old number, and do not leave a
      number that now fails (`design.md — Decisions`)
      — **Measured; no edit needed, deliberately.** New figures: **19.48 / 65.11 / 53.84 / 19.48**
      (was 19.47 / 65.11 / 53.84 / 19.47). Only statements/lines moved, by 0.01, and only because
      group 1's single unwrapped line in `utils/validation.js` changed the denominator — branches
      and functions are untouched, and no test changed. Prettier 3 itself moved nothing (2.2).
      `.c8rc.json` is left as `19 / 65 / 53 / 19`. Those are **floored integers of the measured
      baseline**, which is the convention `fix-esm-coverage-reporting` established (it measured
      19.47/65.11/53.84/19.47 and recorded 19/65/53/19). 19.48 still floors to 19, so the file
      already records the measured baseline and the gate passes at `exit 0`. Writing the exact
      decimals instead would make the gate fail on any 0.01 fluctuation for no benefit, and the
      file's own note says thresholds should rise only when coverage *genuinely* improves — a line
      unwrapping is not that.
- [x] 2.4 Run `cd cli-app && yarn test` and `cd vercel-api && yarn test && yarn typecheck`; verify
      all pass. **Commit here** — this is the "Prettier 3" commit, with no version bumps other
      than Prettier in it
      — **Done.** All three exit `0`. Committed as `218f2d2`, commit 2 of 3, containing only the
      Prettier bump and its lockfile entries — no other version change and no source file.

## 3. Bump the test runner, assertion library and compiler

- [x] 3.1 Bump `mocha` (`^10.2.0` → `^11.x`) and `chai` (`^4.3.7` → `^6.x`) in
      `cli-app/package.json`; run `yarn install`, then `yarn test`. Verify the single suite
      `cli-app/test/key-manager.test.js` passes unchanged — it uses `import { assert } from 'chai'`
      (a named ESM import) across 22 assertions, which is the form Chai 5+'s ESM-only rewrite
      keeps, so **no test edit is expected**. If one *is* needed, record what and why here
      — **Done, no test edit needed — the prediction held exactly.** `mocha@11.8.0` and
      `chai@6.2.2`; all 16 tests pass unchanged. The named `import { assert } from 'chai'` is
      indeed the form Chai's ESM-only rewrite kept, so a two-major jump cost nothing.
- [x] 3.2 Confirm no Mocha configuration surface was missed: there is no `.mocharc.*` in the repo
      and `cli-app`'s `test` script invokes `./node_modules/mocha/bin/mocha.js` with no flags.
      Verify that still resolves and runs under Mocha 11 (the binary path is an implementation
      detail of the package layout and is the one thing a major bump could move)
      — **Done.** No `.mocharc.*` exists anywhere in the repo, so Mocha 11's config-related
      breaking changes had no surface to land on. The `test` script's hardcoded
      `./node_modules/mocha/bin/mocha.js` still resolves and reports `11.8.0` when invoked
      directly — the one thing that could have broken did not.
- [x] 3.3 Bump `typescript` (`^5.6.3` → `^7.x`) in `vercel-api/package.json`; run `yarn install`
      then `yarn typecheck`. Verify it exits `0`. If v7 rejects something v5 accepted, pin to the
      latest v6 instead and record the rejection and the fallback here — the same
      "try newer, record the fallback" shape `bump-node-version-to-the-latest-stable-version` uses
      for Vercel's Node support
      — **Done; no fallback needed.** `typescript@7.0.2` installed and `tsc --noEmit` exits `0`
      with no source edits. The recorded v6 fallback was not required.
- [x] 3.4 Run `cd vercel-api && yarn test`; verify all suites still pass under the new compiler.
      **Commit here** — this commit contains no formatting changes at all
      — **Done.** 4 files, 53 tests passing under `typescript@7.0.2`. Verified zero source-file
      changes across the whole group, so this commit genuinely carries no formatting.

## 4. Correct the documentation

- [x] 4.1 In the root `CLAUDE.md`, fix the Prettier claim. It currently reads "Prettier (root
      `.prettierrc`, duplicated in `cli-app/`)" — the duplicate is being deleted, and it was never
      actually a duplicate (`tabWidth: 4` vs `2`, no `printWidth`). Verify the corrected text names
      the root `.prettierrc` as the only config and mentions the `.prettierignore` if 1.1 created one
- [x] 4.2 Update `CLAUDE.md`'s `cli-app` command notes if they name `mocha`/`chai` versions, and the
      `vercel-api` notes if they name `typescript`. Verify no superseded version number remains
      outside archived OpenSpec content

## 5. Close out

- [x] 5.1 Run `cd cli-app && yarn test && yarn coverage` and
      `cd vercel-api && yarn test && yarn typecheck`; verify all four exit `0`
      — **Done.** All four exit `0` on Node 24.12.0.
- [x] 5.2 Smoke-test the real binary, since 19% statement coverage cannot backstop a 38-file
      reformat: run `cd cli-app && yarn start --help`, then one real end-to-end command
      (`clip location` against the live API). Verify output is byte-identical in shape to before
      the change — all CLI output flows through `cli-app/utils/style.js`, so a formatting-induced
      break would surface there
      — **Done for the formatting layer; the live network round-trip was blocked by an expired
      token, unrelated to this change.** `yarn start --help` renders correctly.
      The end-to-end call returned `Your access token was rejected.` — **verified as token expiry,
      not a regression**: the same token sent by `curl` straight to Auth0 `/userinfo` (bypassing
      every line of cli-app) also returns 401, while `/api/healthcheck` returns 200. The stored
      Auth0 access token simply aged out; re-authenticating needs a browser.
      Since 5.2's actual concern is that "a formatting-induced break would surface" in
      `utils/style.js`, every helper in that module was exercised directly instead — `line`,
      `statement`, `value`, `status`, `direction` (the five-field block), `locationTable` and
      `error` — and all render correctly: colours, column alignment, the arrow-and-indent direction
      layout, and the box-drawn table. The rejection message itself also rendered through
      `print.error` correctly, which is incidental evidence from the failed call.
      **Remaining gap:** no successful live API response was rendered through `print.direction`
      end to end. Closing it needs a browser re-auth (`clip` → Authenticate).
- [ ] 5.3 Verify the commit history reads as three separable commits (config fix → Prettier 3 →
      runner/compiler bumps), and that reverting the middle one alone leaves a working repo
- [ ] 5.4 Run `openspec validate bump-dev-tooling-dependencies --type change --strict`; verify it
      passes with `specs` reported as skipped rather than missing
