> **Already complete:** nothing. The investigation behind this change — confirming the 0% result at
> `HEAD` in a scratch worktree, and measuring the real baseline with `c8` — was diagnosis, and left
> no change in the repository.
>
> **Ordering constraint:** group 2 must run before group 3. The thresholds in group 3 have to come
> from a measurement taken with the pinned `c8` on a supported Node version, not from the figures in
> `proposal.md`, which were produced by `c8@12` on Node 22. See `design.md — Migration Plan`.

## 1. Swap the tool

- [x] 1.1 Remove `nyc` from `devDependencies` in `cli-app/package.json` and add `c8` pinned to
      `9.1.0`; verify `yarn` installs without an engine warning under the Node version in
      `cli-app/.nvmrc`
      `nyc` removed, `"c8": "9.1.0"` added. `nvm use 18 && yarn install` — clean, no engine
      warning.
- [x] 1.2 Point the `coverage` script in `cli-app/package.json` at `c8` wrapping the existing mocha
      invocation, leaving the `test` script untouched; verify `yarn test` output is byte-identical
      to before the change
      `"coverage": "./node_modules/.bin/c8 yarn test"`. `test` script untouched;
      `yarn test` still reports 16 passing, identical to before.
- [x] 1.3 Run `grep -rn "nyc\|\.nycrc" --exclude-dir=node_modules .` across the repository; verify
      the only remaining references are the ones this change is about to rewrite —
      `cli-app/.nycrc.json` and the root `CLAUDE.md`
      Ran with word-boundary matching and excluded `dist/`, `*.map`, `yarn.lock` (the plain
      pattern hit hundreds of false positives from "punycode" and minified bundle code in
      `docs/swagger/dist/` and `archived-sls-api/yarn.lock`). Real remaining references:
      `cli-app/.nycrc.json` and `CLAUDE.md`, as expected, plus one design.md didn't list: a
      comment in `cli-app/.gitignore` ("# nyc test coverage" above the `.nyc_output` ignore
      pattern) — harmless prose, not a false claim, but folded into group 3's `.gitignore` pass
      for tidiness since it's touched there anyway.

## 2. Establish the true baseline

- [x] 2.1 Run coverage with the pinned `c8` under Node 18; verify it reports non-zero coverage,
      confirming instrumentation now reaches ESM modules at all
      `nvm use 18 && yarn coverage`: statements 19.47%, branches 65.11%, functions 53.84%,
      lines 19.47% — matches `proposal.md`'s figures exactly, confirming ESM is now genuinely
      instrumented.
- [x] 2.2 Repeat under Node 16, the matrix's lower bound; verify `c8@9` runs there and record
      whether its figures differ from Node 18's
      `nvm install 16 && nvm use 16 && yarn install && yarn coverage`: identical figures
      (19.47% / 65.11% / 53.84% / 19.47%). No divergence between Node 16 and Node 18.
- [x] 2.3 Record the lowest figure across both runs for each of statements, branches, functions and
      lines; verify each is at or below the corresponding figure in `proposal.md`, and investigate
      rather than proceed if any is materially higher
      Both runs identical, so the "lowest" is the same figure either way: statements 19.47%,
      branches 65.11%, functions 53.84%, lines 19.47% — exactly matching `proposal.md`, not lower
      or higher. Nothing to investigate.

## 3. Set the ratchet

- [x] 3.1 Replace `cli-app/.nycrc.json` with `c8` configuration preserving the existing `include`
      list (`commands`, `lib`, `utils`), `all: true`, and the `text` and `lcov` reporters; verify
      the file list in the report matches the one `nyc` produced
      Created `cli-app/.c8rc.json`, deleted `.nycrc.json`. Dropped `require` (nyc require-hook
      list, meaningless for c8), `sourceMap`/`instrument` (nyc-only instrumentation options — c8
      reads V8's native coverage, nothing to instrument). Renamed `reporter-dir` to c8's
      `reports-dir`. File-by-file breakdown is identical to the runs in group 2 (same 12 files
      under `commands/`, `lib/`, `lib/clients/`, `utils/`), confirming `include` still resolves
      the same set.
- [x] 3.2 Set `check-coverage` thresholds to the group 2 figures rounded **down** to whole numbers;
      verify `yarn coverage` exits `0` — the first time it has since `cli-app` became ESM
      `statements: 19, branches: 65, functions: 53, lines: 19`. `yarn coverage` → exit code `0`.
- [x] 3.3 Add a comment in the config recording that the thresholds are a measured baseline to be
      ratcheted up, not a standard, and naming this change; verify it survives whatever file format
      is chosen (use `.c8rc.json` with a `//` key, or `.c8rc.js`, if JSON comments are rejected)
      A `"//"` key works — c8 silently ignores unrecognised config keys, confirmed by the coverage
      run above still passing cleanly with it present. No need to fall back to `.c8rc.js`.
- [x] 3.4 Prove the gate actually gates: delete or skip the `User identity` tests in
      `cli-app/test/key-manager.test.js`, run coverage, and verify it exits non-zero; restore them
      and verify it exits `0` again
      `describe.skip('User identity', ...)`: coverage dropped to 18.56%/60%/50%/18.56%, all four
      thresholds fail, exit `1`. Restored (`git diff` shows no residual change): exit `0` again.
- [x] 3.5 Confirm `cli-app/coverage-cli-app/` and any `.nyc_output`/`.c8_output` directory are
      gitignored; verify `git status --short` is clean after a coverage run
      `coverage-cli-app` wasn't gitignored at all before this change (neither was it under the old
      `nyc` setup — a pre-existing gap). Added it, plus kept `.nyc_output` defensively — while
      isolating this task's own check I found c8 falls back to nyc-style default paths
      (`.nyc_output`, bare `coverage/`) when it discovers config via `.nycrc.json` rather than its
      native `.c8rc.json`; harmless under normal use since `.c8rc.json` is now the only config
      file present, but cheap to keep ignored. Removed the pre-existing duplicate `.nyc_output`
      line and the stray comment task 1.3 flagged. A clean `yarn coverage` run now produces only
      `coverage-cli-app`; `git status --short` shows only this change's intentional diff.

## 4. Wire it into CI

- [x] 4.1 Add a step running the mocha suite to `.github/workflows/cli-app-test-build.yaml`, after
      the existing `Yarn Install` step; verify it runs on both matrix entries and that a pushed
      branch shows the tests executing
      Added `Run tests` (`yarn test`) after `Yarn Install`, before the coverage step. Not verified
      against a real CI run — per the user's call, a scratch-branch push wasn't done this session.
      Verified locally instead, on both matrix Node versions (16.x and 18.x, via `nvm`): 16 passing
      on each.
- [x] 4.2 Add a step running the coverage gate; verify a green run and, on a scratch branch with a
      test removed, a red one — the gate is not trusted until it has been seen to fail in CI
      Added `Check coverage` (`yarn coverage`) after `Run tests`. Not verified in real CI, same as
      4.1. The green/red proof itself was done locally in task 3.4 (`describe.skip` on
      `User identity` → exit `1`; restored → exit `0`) — the same command CI will run, just not
      run *by* CI yet. Whoever next pushes to `main` gets the first real-CI confirmation.
- [x] 4.3 Decide from `design.md — Open Questions` whether coverage runs on the whole matrix or one
      Node version, and apply it; verify the workflow file reflects the decision explicitly rather
      than by omission
      Decided: whole matrix (both 16.x and 18.x) — group 2 already showed identical figures on
      both versions, and `design.md` notes running both "costs nothing extra." Recorded as an
      explicit comment on the `matrix:` block explaining why, not left implicit.

## 5. Correct the documentation

- [x] 5.1 In the root `CLAUDE.md`, replace the claim that `.nycrc.json` enforces 70% with the real
      configuration and baseline; verify no occurrence of `70%` remains that refers to coverage
      The `yarn coverage` line now names `.c8rc.json` and the real baseline (19%/19%/53%/65%);
      `grep -n "70%" CLAUDE.md` returns nothing.
- [x] 5.2 In the same file's CI section, remove the statement that the mocha suite is not wired into
      CI, and describe what CI now runs; verify it matches `.github/workflows/` as it stands after
      group 4
      Rewrote the CI bullet: names both workflow files (`cli-app-test-build.yaml` for
      install/test/coverage/`--help`, `cli-app-install.yaml` for the global-install smoke test),
      matching what's actually in `.github/workflows/` after group 4.
- [x] 5.3 Correct the `.nvmrc` reference if needed — `CLAUDE.md` says "Node pinned to 18 by
      `.nvmrc`" while the file is at `cli-app/.nvmrc`; verify the path given resolves
      Changed to `cli-app/.nvmrc`, which resolves.
- [x] 5.4 Note in `CLAUDE.md` that `c8` is pinned because of the Node target, so the next person to
      modernise the runtime knows to unpin it; verify the note points at `design.md` for the detail
      Added alongside the `.nvmrc` correction. Points at the archived `fix-esm-coverage-reporting`
      change rather than a literal `design.md` path — that path won't survive archiving, and this
      change declares `skip_specs: true` so there's no capability spec to point at either.

## 6. Close out

- [x] 6.1 Run `cd cli-app && yarn test && yarn coverage`; verify both exit `0` and the reported
      figures match the thresholds set in group 3
      Both exit `0`. Figures: 19.47%/65.11%/53.84%/19.47%, matching the group 3 gate exactly.
- [x] 6.2 Run `openspec validate fix-esm-coverage-reporting --type change --strict`; verify it
      passes with `specs` reported as skipped rather than missing
      `Change 'fix-esm-coverage-reporting' is valid`; `openspec status --json` shows
      `"specs": "skipped"` explicitly, not missing.
- [x] 6.3 Confirm this change's amendments to `document-cli-contracts` still read correctly — its
      `design.md` Risks entry says the fix is tracked separately, which is now this change; verify
      the two do not contradict each other
      Read the entry in the now-archived `openspec/changes/archive/2026-08-24-document-cli-contracts/
      design.md`. It accurately describes the pre-fix state (true when that change was active) and
      forward-references "tracked as its own change" generically — no contradiction, nothing to
      edit in an already-archived file.
