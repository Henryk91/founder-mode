# Audit of plan 2 steps 4 to 6 and the start of plan 3

Plan 2 steps 4 to 6 and the start of plan 3 were done by another coding agent. This report checks what it claimed against the commits, code, tests and reports, and by running everything again. Fixes are listed under Part B; plan 3 continues from `docs/autonomous3/STATUS.md`.

## 1. Repository state (15 October 2026, before any change)

- **Working tree:** not clean. `docs/balancing.md` was staged but not committed: a regenerated report whose numbers match the committed one except timings and the Hinterhof section (see 2.1). Committed as found (`2619367`).
- **Worktrees:** `../founder-mode-plan2` on branch `plan2-work` at `36da338`, clean; every commit of `plan2-work` is in `main` (`git log main..plan2-work` is empty). A second worktree of an earlier Claude session lies in a temporary folder at `bc787da` (detached, clean, an ancestor of `main`). Neither was deleted. No stashes, no other unmerged branches.
- **Tags:** `plan2-baseline` to `plan2-complete` exist and point where the reports say. `plan2-kantino-long` (`32036b6`) points at a commit whose `docs/balancing.md` and `docs/seeds.md` were not regenerated (they were in the step 6 commit, `ec7cfce`), so the seeds replay test fails at that tag.

## 2. Plan 2 steps 4 to 6, item by item

### 2.1 Step 4 (section 5): retune the three tourism scenarios

| Item | Status | Evidence |
|---|---|---|
| Retune against all targets with the tuning budget | partly done | Rounds recorded in `docs/decisions.md`, plan 2 step 4. Two results got worse without a recorded reason: **Hinterhof T2** (no-tests 6.8% after step 3, 20.6% after step 4) and **Seeblick T1** (careful 30.0% after step 3, 23.0% after step 4, recorded only down to 27.6% on 500 seeds). The committed Hinterhof section of `docs/balancing.md` (careful 27.0%) was produced by no committed code: the step 4 code gives 26.7% (rerun at `da63969` and at `HEAD`). One change was recorded as reverted but kept: the 25,000 EUR delivery kit (decisions: "round 2, reverted"; YAML: "round 2 retried", result never recorded). |
| Seeblick spread within 15 points, T7, T11 | done | `docs/balancing.md` Seeblick T3 2.7, T7 +2.0, T11 pass |
| T13 exists and is measured | done | `tourismReport.ts` target 13; Gratwanderung 33.9% (gap -10.4, at the limit), Hinterhof 25.2%, Seeblick 21.2% |
| T13 on-screen signals first | done | `loan.bridgeMonthsHint` in content, `LoanView`, the bank plan (`LoanPlan.tsx`) |
| T14 exists and is measured | done (target fails) | `tourismReport.ts` target 14; strategies `tourism_contracts_none`, `tourism_permanent`, `tourism_seasonal`, `tourism_part_time`. No test that each variant signs only its own kind (added, see Part B). |
| School demand realism check | done | Three trials (2 to 4, 4 to 8, 5 to 10) in decisions, 9 to 12 kept. The scenario spec's "changed" note still said 6 to 12. |
| Rent and lease sources | partly done | Hinterhof and Seeblick listings cited in `scenario-restaurant.md` C and `scenario-hotel.md` 14; Gratwanderung's base and garage were not rechecked. |
| Tag `plan2-tourism` | done | `da63969` |

### 2.2 Step 5 (section 6): Kantino long, funding and target 20

| Item | Status | Evidence |
|---|---|---|
| T31/T32: smaller angel pool, founder salary, investor pressure in hours | partly done | Smaller cheque (80,000 to 180,000) and a 2,500 EUR founder salary (`funding.ts`, Kantino YAML). Investor pressure in founder hours was not tried. T31 passes; T32 fails (value 1.23x against 1.3x). |
| T33: early raise visibly costly in its terms | done (target fails) | `weakTractionTerms` (`schema.ts`, `funding.ts`); early raise still +1.4 against traction |
| T36: updates as a 1 h task, investor mood that matters | not done | Neither was tried. T36 moved from fail to pass at the limit (-0.5 ±1.9 against 1 to 5) as a side effect of the funding changes. |
| T20 restated | done | `longReport.ts` text, decisions plan 2 step 5 |
| T27 left | done | at the limit, unchanged |
| Tests for the new engine features | not done | No test for the founder salary or the weak terms (added, see Part B) |
| The 60 week gate after step 5 | done, in step 6 | The step 5 report only promised it; the step 6 commit (`ec7cfce`) regenerated the 60 week sections (timings only differ). This audit reran it: identical. |
| Report and seeds regenerated with the step | not done in step 5 | Kantino long report and seeds arrived in `ec7cfce`; the tag `plan2-kantino-long` has stale ones. |
| Tag | done | `32036b6` |

### 2.3 Step 6 (section 7): wrap up

| Item | Status | Evidence |
|---|---|---|
| Revisit every open issue with a fresh budget of 3 rounds | not done | No round of any kind is recorded after step 5 in `docs/decisions.md`, no step 6 report. |
| Full reports for every scenario and mode | partly done | 60 week and Kantino long regenerated in `ec7cfce`; Hinterhof was not rerun after its last step 4 change (2.1). |
| Screen review at 375, 390, 430 and 1440 px, Chromium and WebKit | partly done | No record. The browser tests exist (`cutoff`, `a11y`, `plan2`, `tourismWords`, `notebook`) and cover the plan 2 screens; this audit ran them (section 4). Nothing new on screen came in steps 4 to 6 except the bank's bridge line. |
| Seeds per ending with the replay test | done | `docs/seeds.md` regenerated in `ec7cfce`; `seeds.test.ts` passes on `HEAD` |
| Docs: implementation plan, README | not done | Last changed in plan 1 |
| Docs: scenario specs with a "what changed" section | not done | No plan 2 section in any spec |
| Docs: schema | done | `docs/schema.md` has steps 4 and 5 |
| Docs: decisions | partly done | Steps 4 and 5 recorded; no step 6 |
| Final report with every target in every scenario and mode | not done | `final.md` is a short summary without a target table, and claims full reports that were not all regenerated |
| Tag `plan2-complete` | done | `ec7cfce` |

## 3. Earlier work (tourism fixes, plan 2 steps 0 to 3)

Checked in the current code; nothing from steps 4 to 6 undid it:

- Tourism word check: `apps/web/test/tourismWords.browser.test.ts`, passing.
- "Nothing cut short": `apps/web/test/cutoff.browser.test.ts`, every scenario and mode at 375, 390, 430 and 1440 px in Chrome and WebKit, passing.
- Naive careful bot: `tourism_naive_careful`, now target T13.
- Loan plan rules: `canFinance`, `planItemsCents`, items bought at payout, working capital capped (`loan.ts`), tests in `plan2Features.test.ts`, `loan.test.ts`; T15 to T18 pass in Hinterhof and Seeblick.
- Tourism event table: the `events` part of each tourism report; the "a third favour the cheap choice" rule holds (Gratwanderung, Hinterhof, Seeblick in `docs/balancing.md`).
- Plan 2 step 1 features (trials, vouchers, contracts, prep and floor, rooms, minimum stay): `plan2Features.test.ts` and `plan2.browser.test.ts` pass.

## 4. Verified by running

- `pnpm lint`: passes.
- `pnpm test` (Chrome and WebKit installed, so the browser tests ran): see the final run recorded in `docs/autonomous2/STATUS.md` after Part B.
- The full gate of plan 3 section 1.6 on `HEAD` before any change (`a54d88b`), in a separate worktree: 60 week Kantino and Zollstock, Kantino long, Gratwanderung identical to `docs/balancing.md` apart from timings; Hinterhof identical to the staged (uncommitted) report and different from the committed one, as explained in 2.1; Seeblick: see below.
- **The 60 week Kantino and Zollstock games match plan 1's final report** (tag `tourism-complete`) number for number, apart from timings and the one heading text recorded in plan 2 step 0. No commit changed them.

## Part B: what was fixed

See `docs/autonomous2/reports/final.md` (rewritten) and `docs/decisions.md`, "Plan 2 audit".
