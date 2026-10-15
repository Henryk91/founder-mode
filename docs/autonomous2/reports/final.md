# Autonomous plan 2: final report (rewritten after the audit)

The first version of this report was a short summary written by another agent; it claimed reports that were not all regenerated and had no target table. This version follows the audit (`docs/autonomous3/reports/audit.md`) and the fixes that finished plan 2's step 6 (`docs/decisions.md`, "Plan 2 audit"). Tag of the audited state: `plan2-audited`.

## What plan 2 built

- **Tourism spec features (step 1):** each tourism scenario's own experiments (pilot day and test listing; pop-up dinner and lunch test; test rates and open house), vouchers as a liability, permanent, part time and seasonal staff contracts, food prepared per service with kitchen and floor apart (Hinterhof), renovation room by room and a minimum stay (Seeblick).
- **The bank lends against a plan (step 2):** listed items bought at payout, working capital capped at three months of fixed costs, temptations that can be financed; L2 and L3 restated and passing.
- **The tourism inbox (step 3):** guests take founder hours; situational events whose effort pays only where the text says.
- **Tourism retune (step 4):** targets T13 (a player without hidden knowledge can win) and T14 (every contract kind wins somewhere); Seeblick's spread closed; the bank's visible bridge hint.
- **Kantino long funding (step 5):** a smaller angel cheque, a founder salary once funded, weak terms before the revenue bar; target 20 restated.
- **Audit (step 6's missing work):** fresh budgets for the open issues, docs (README, implementation plan, a "what changed in plan 2" section in every scenario spec), tests for step 5's engine features and T14's bots, a general `shipped.<feature>` condition path.

## Every target, every scenario and mode

Status by the report's own test (pass includes "at the limit": within its own margin). Numbers from `docs/balancing.md` (1,000 report seeds, 10,000 wide seeds where the target says).

### Kantino, 60 weeks

All targets 1 to 11 and 13 to 19 pass, unchanged since plan 1. At the limit: 2 (27.9% in the 25 to 45 band is clear; the organised and hire variants are informational), 17 (worst market +0.6 ±1.6) and the books part of 13.

### Zollstock, 60 weeks

All targets 1 to 11 and 13 to 19 pass, unchanged since plan 1. At the limit: 11 (effort 28% of reading), 17's worst market (-1.2 ±1.5) and the landing part of 13.

### Kantino, long mode

| Target | Result | Status |
|---|---|---|
| 20 Renting against hiring by situation | burst +0.0, steady hire -2.4 | fail (open) |
| 21 to 26, 28 to 31, 34, 35, 37 | see `docs/balancing.md` | pass |
| 27 Blind inbox at most a third of reading | effort +7.1, 37% of reading +19.3 | fail (open, at the limit: 7.1 - 1.0 against a third of 19.3) |
| 32 Neither path dominates, value 1.3x | traction -4.2; value 1.23x | fail (open) |
| 33 Raising early punished | +1.4 against traction | fail (open) |
| 36 Updates worth a little | -0.5 ±1.9 against 1 to 5 | at the limit |

### Gratwanderung

| Target | Result | Status |
|---|---|---|
| T1 careful 25 to 45% | 44.9% | pass (near the top) |
| T2 no-tests under 5% | 0.0% | pass |
| T3 spread within 15 | 8.6 | pass |
| T4, T5, T8, T9, T10, T11, T12 | see `docs/balancing.md` | pass |
| T6 blind effort at most a third of reading | reading +16.4, effort +7.5 | at the limit |
| T7 seasonal pricing 2 to 10 | +1.0 ±2.1 | at the limit |
| T13 naive careful | 33.9%, gap -11.0 ±2.5 | at the limit |
| T14 contract kinds | permanent -17.4, seasonal -0.3, part time -15.3 | fail (open) |

### Hinterhof

| Target | Result | Status |
|---|---|---|
| T1 | 26.3% | pass |
| T2 no-tests under 5% | 16.6% (was 20.6%) | fail (open) |
| T3 spread | 15.0 | at the limit (was 15.9, fail) |
| T6 | reading +3.4, effort +0.8 | pass |
| T7 seasonal pricing 2 to 10 | +0.0 ±1.8 | fail by 0.2 points; it moved from +0.2 ±1.9 (a pass at the limit), a change far inside its margin |
| T4, T5, T8 to T13 | see `docs/balancing.md` | pass |
| T14 | all three +0.0 on signed seeds | fail (open) |
| T15 to T18 (L1 to L4) | +3.8; -19.7; gap +23.2, misses 0.9%; named | pass |

### Seeblick

| Target | Result | Status |
|---|---|---|
| T1 careful 25 to 45% | 27.2% (was 23.0) | pass |
| T2, T4, T5, T8, T9, T10, T12 | see `docs/balancing.md` | pass |
| T3 spread | 8.2 | pass |
| T6 blind effort at most a third of reading | reading +7.7, effort +5.7 | fail (open) |
| T7 seasonal pricing 2 to 10 | -0.2 ±1.8 (was +2.0) | fail within noise (open; see decisions, plan 2 audit) |
| T11 cancellation policy | strict +1.8 overall; project guests -2.5 ±2.2, not beyond its margin | fail within noise (open) |
| T13 naive careful | 27.8%, gap +0.6 | pass |
| T14 contract kinds | permanent and seasonal never signed; part time +3.4 ±4.6 | fail (open) |
| T15 to T18 (L1 to L4) | -1.2; -22.5; gap +29.1, misses 1.2%; named | pass |

## Open issues (closest result and options)

1. **Tourism T14, all three:** a contract kind never decides a run, because the bots sign contracts only once a run is already won (Hinterhof: weeks 43 to 95). Win rates cannot show a contract paying. Options: judge T14 on money (profit or wealth at the end on signed seeds) instead of wins; or a bot that commits to a contract early in a named situation (a steady segment), accepting the risk. One value round (contract quality doubled) changed nothing.
2. **Hinterhof T2 (no-tests 16.6%):** one dining room serves every segment, so building everything without tests still finds guests. Options in decisions.
3. **Hinterhof T7 (+0.0 ±1.8):** fails by 0.2 points after moving within noise; seasonal pricing pays little in a restaurant whose menus barely change with the season.
4. **Seeblick T7 and T11:** fail within noise after the room night cost that fixed T1; 25, 27.50 and 30 EUR were measured.
5. **Seeblick T6:** blind effort keeps about two thirds of reading's gain; most effortful answers at Seeblick are simply good. Options: scarcer founder hours in season, fewer events with unconditional benefits.
6. **Gratwanderung school demand:** 5 to 8 groups at peak (spec 0.3 to 1.2), down from 9 to 12; the spec's figure cannot carry a school-focused company.
7. **Kantino long T20, T27, T32, T33:** carried to plan 3 step 2, which changes hiring (desks). T33 conflicts with T32 under the current bots (raise_early raises money in 0.2% of runs).

## For Henry to review, in priority order

1. T14's measure (open issue 1): whether "wins somewhere" should be judged on money rather than wins (decisions, plan 2 audit).
2. T32 and T33 restatement options: count the founder salary in founder value; judge T33 against bootstrap (decisions, plan 2 audit).
3. Hinterhof's 1,500 EUR monthly delivery cost and Seeblick's 25 EUR room night are estimates chosen while tuning (decisions, plan 2 audit).
4. Gratwanderung's school day at 750 EUR a class and 5 to 8 groups (decisions, plan 2 audit).
5. The step 4 agent's T14 definition (decisions, plan 2 step 4).
6. The 60 week event table heading text from the fixes session (step 0 report).
