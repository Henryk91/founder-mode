# Autonomous run 7 status

## Current
Step: Step 3, measured and tuned; full report of the three games next
Last commit: Plan 7 step 3: tuning (Zollstock referrals, Kantino long market floor)
Next action: Full report, one process per game, at this commit: Kantino, Zollstock (standard parts, 10,000 wide seeds, events), Kantino long with parts named incl. team and funding. Then the bookings proof (main, 1,000 seeds).

## Checklist
- [x] Step 0: set up (tag plan7-baseline)
- [x] Step 1: channels (tag plan7-channels); playability measured with steps 2 and 2b (CLAUDE.md order of work)
- [x] Step 2: reasons for losses (tag plan7-reasons)
- [x] Step 2b: nothing in the weekly report is lost (tag plan7-history)
- [ ] Step 3: wrap up (tag plan7-complete)

## Running jobs and state
VM run: state, logs and checkpoints in ~/fm-state/ (never /tmp).
Progress bundle after each tag: ~/fm-state/progress.bundle, copied to the real repo as .git/plan7-transfer.bundle.
Baseline: the results committed at plan6-complete (engine, content and bots unchanged since then).
Bot runs: ~/fm-state/bots.sh <log> <pnpm bots args>, rerun until exit=0 (checkpoints in ~/fm-state/ckpt, logs in ~/fm-state/logs).
Quick checks, Kantino 60 weeks, main part, 1,000 seeds (test prefix), only the strategies named:
- r1h (careful, one_channel, never_ask): careful 37.5%, M2 +5.5 (±3.4), R1 +1.2 (±1.6, at the limit).
- Main part, every strategy (m-kantino, m-zollstock, m-klong): careful 37.5%, 41.0%, 47.8%.
- Tuning: t1-z (Zollstock price part) search 45.1%; t2-kl Kantino long careful 45.4%.

## Open issues
- R1 (asking pays) is only at the limit: +1.2 points (±1.6) at 1,000 seeds after two bot rounds and one formula round. Confirm at the end; options in the final report.
- Kantino long careful 45.4% (±3.1): at the limit of its 25 to 45% band after two rounds.

## Pending on Henry's Mac
- Browser tests (Chromium and WebKit) and visual checks: Playwright browsers cannot be installed in this VM, so they skip here.

## For Henry to review (non-blocking)
None yet.

## Stopped
