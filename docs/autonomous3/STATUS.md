# Autonomous run 3 status

## Current
Step: audit of plan 2 (Part B: fixes), then step 0.
Last commit: 27b4b39 Plan 2 audit: Gratwanderung school demand 5 to 8 groups at 750 EUR a class
Next action: the post-fix tourism gate (Gratwanderung, Hinterhof done; Seeblick and `pnpm seeds` were running when the session stopped) writes `docs/balancing.md` and `docs/seeds.md`: if Seeblick's section or seeds are not regenerated, rerun `pnpm bots --scenario seeblick --mode long --runs 1000 --wide-runs 10000 --seed-prefix test --events` and `pnpm seeds`. Then fill SEEBLICK_TABLE in `docs/autonomous2/reports/final.md`, update `docs/autonomous2/STATUS.md`, run `pnpm lint` and `pnpm test`, commit, tag `plan2-audited`, write `reports/step0-baseline.md`, tag `plan3-baseline`, and merge branch `plan3-wip` (step 1 engine, content, bots, UI, tests done; still to do: run `office.browser.test.ts`, the step 1 gate, update fingerprints, step 1 report). Step 3 label patch saved outside the repo is lost; redo from docs/design/established.md section 4. Plan 3 step 1 work in progress on branch `plan3-wip` (worktree `../founder-mode-plan3`), to be merged after step 0.

## Checklist
- [x] Plan 2 complete (tag plan2-complete); audited, see `reports/audit.md` (tag plan2-audited pending)
- [ ] Step 0: set up and baseline (tag plan3-baseline)
- [ ] Step 1: office stages (tag plan3-stages)
- [ ] Step 2: retune long mode (tag plan3-tuned)
- [ ] Step 3: established UI (tag plan3-established)
- [ ] Step 4: wrap up (tag plan3-complete)

## Open issues
- Carried from plan 2 (see `docs/autonomous2/STATUS.md`): tourism T14; Hinterhof T2; Seeblick T6; Gratwanderung school demand above the spec; Kantino long T20, T27, T32, T33.

## For Henry to review (non-blocking)
- Plan 2 audit: T14 compares win rates, but contract bots sign only once a run is already won, so it cannot show a contract paying (decisions, plan 2 audit).
- Plan 2 audit: Kantino long T32 and T33 options include restating (founder salary in founder value; T33 against bootstrap) (decisions, plan 2 audit).
- Plan 3 starts from the completed plan 2 checkpoint `plan2-complete`.

## Stopped
