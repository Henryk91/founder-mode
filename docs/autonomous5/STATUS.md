# Autonomous run 5 status

## Current

Step: 3.6 resumed heading repair passes; complete phase tests running.
Last commit: HEAD, Plan 5: reserve logo space before shrinking long company names.
Next action: Finish full tests(session75399,/tmp/plan5-venue-full-tests-resumed.log),then add the venue T15 cash-funded variant and run the missing comparison. Complete protected main proof and venue tuning before its once-only event table. Work remains on plan5-venue-work in /private/tmp/founder-mode-plan5-venue;full report once in step6.

## Checklist

- [x] Step0: setup/baseline(tag plan5-baseline)
- [x] Step1: shared engine(tag plan5-engine)
- [x] Step2: Ausgesperrt(tag plan5-escape)
- [ ] Step3: Fabriketage
- [ ] Step4: Schweißperle
- [ ] Step5: Griffig
- [ ] Step6: wrap up

## Checks and open issues

- Step2 complete:careful42.8%±3.1,top48.4%;all escape targets pass(X1 at limit). Both value rounds used,formula allowance deliberately unused. T2,T3,T6,T10,T11,T14,T15,T17 remain open for the mandatory step6 revisit. Results/options:reports/step2-escape.md.
- Step2 proof:all nine protected main reports/fingerprints match baseline apart from timings,1,000 test seeds. Full suite79 files/1,542 passed/21 skipped;lint passes. Seeds171 examples/172 checks;protected seed rows unchanged.
- Step2 event table complete once:events only,1,000 test seeds,115 forced-answer strategies;101,267/115,000 played,remainder reused;6,492 seconds wall.47 judged rankings:24 cheapest/23 more-effort point leaders(no significance claim);three unseen/unjudged. Do not rerun.
- Venue initial main:28 strategies,1,000 test seeds,main only,506 seconds wall. Careful25.8%±2.7,top32.8%. Raw venue/fabriketage-main-initial.md;incomplete report on main at docs/autonomous5/reports/step3-venue.md. T3,T5,T6,T7,T10,T11,T14,V1,V2 fail;T15 not measured. No value/formula rounds used. Venue event table has not run.
- Isolated venue draft:87 engine,221 content(24 skips),68 bot/replay checks pass;lint/typechecks pass.24/24 venue browser cases pass after the resumed repair;all16 terminology/Help/results/post-mortem checks passed previously. Whole-phase suite is running and fresh protected/Ausgesperrt proof remains pending;draft is unmerged.
- Screenshots outside repo:/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-venue and founder-mode-leisure.
- Full bot report has NEVER run;reserved for step6,once. Steps4/5 have preparation drafts only under /tmp/plan5-fitness-* and /tmp/plan5-climbing-*;do not treat them as implementation.

## For Henry to review (non-blocking)

- Resumed by user:venue heading repair now passes all24 browser cases and lint. Long names receive the logo space before shrinking;no test/name weakening. See docs/decisions.md.
- Venue first pass:early guest balances deferred;lower floor is breakout rooms,not a separately booked hall;authored caterer incidents replace supplier selection. Estimates/source corrections and finance/hold/noise decisions are in the draft spec and decisions log;reports/step3-venue.md summarises them.
- Venue tuning:initial hold values favour no holds in every market;T15 comparison missing. Inspect contributions before using the untouched tuning budget.
- Ausgesperrt:eight tourism targets remain open despite playable final values;formula allowance deliberately unused. See reports/step2-escape.md and docs/decisions.md.
- Prior autonomous decisions are preserved in docs/decisions.md,including physical-room limits,deposits,bank/refit timing,contracts and company room-game demand units.

## Previous stop (resumed by user)

Plan section1.2.1 requires stopping after three honest repairs of the same failure.
The established venue company heading clips in WebKit; final reproduction is375px
across Inbox,Plan,Calendar,Market and Finance. /tmp/plan5-venue-browser-4.log shows
23 passing cases and this one failure. /tmp/plan5-venue-ui-lint-4.log passes.

Attempts:
1. Listen for FontFaceSet loadingdone as well as fonts.ready. Still clipped at390px:
   /tmp/plan5-venue-browser-2.log.
2. Give the name column a stable flex basis and recheck after layout with requestAnimationFrame.
   Still clipped at375/390px: /tmp/plan5-venue-browser-3.log.
3. Measure text-range bounds and scale/shrink using glyph width rather than cached block
   scrollWidth.390px now passes;375px still clips: /tmp/plan5-venue-browser-4.log.
A separate calendar landmark defect was fixed by omitting the unused tourism calendar;
all axe checks now pass. A read-only heading-dimension diagnosis is logged at
/tmp/plan5-venue-name-diagnosis.log and was not counted as a repair.

Options for a subsequently authorised repair: inspect final375px text-range/scroll
metrics and flex layout; consider measuring a separate inline text span, or explicitly
reserve more heading space by hiding the logo before shrinking. Keep the full name,
minimum12px and existing no-cut test; do not weaken the test or shorten the name solely
to hide the defect. No fourth repair attempted. The UI draft is committed for review,
not merged. Shared engine/bot protected proof and the full phase suite remain pending.

Next venue work after this stop is resolved: add the missing T15 cash-funded variant,
inspect contributions before value tuning (0/2 rounds,0/1 formula used), fix the initial
hold-value dominance (no-hold conversion currently exceeds free-hold conversion in all
markets), then finish phase tests/protected proof and the once-only venue event table.
Steps4,5 and6 remain unfinished. Full report has never run in this plan. No push.

## Resumed result

User requested continuation. The isolated375px diagnosis fit at15px while the earlier full matrix failed, indicating layout/font sensitivity. Reserve logo space before reducing the type size and check glyph plus block overflow. All24 venue cases pass,/tmp/plan5-heading-resume-browser-1.log;lint/typechecks pass,/tmp/plan5-heading-resume-lint.log. First resumed repair succeeds.

## Stopped
