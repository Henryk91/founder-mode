# Step3: Fabriketage

Status: complete;integrated locally with milestone plan5-venue.

Fabriketage is a104-week event-venue game with a single shared hall,company,
wedding and private-party calendars,forward sales and refundable advances.
The careful player interviews markets,prepares the fit-out loan,sells a mixed
calendar,hires furniture until buying pays,sets hold terms from observed decisions,
and fits insulation after actual complaints when booked dates permit the closure.
Seven isolated variants measure holds,market mix,noise,the roof and later finance.

Optional content-gated engine additions cover named-pool construction closures,
weekday split/reset capacity charged only when served,asset hire meeting physical
requirements,actual catering receipts,rolling complaints and restrictions,immediate
single refunds for affected future dates,waited permits with one-time partial
refunds,and deposit-only strict cancellations. Equipment is required at service;
leisure offers can be prepared before equipment is owned or hired. Earlier games
retain their original paths and engine version0.14.0.

Content has four intro cards,55 events and150 interview quotes. Two native scenes,
accent#7A3E1D(white contrast8.29),stage labels,hold/calendar controls,slot prices,
actual contribution details,permit terms and the roof lesson are implemented.
All interface text is in labels;public views show actual events and quoted terms.
Research,estimates,adaptations and exact value changes are in
[spec section15](../../scenario-event-venue.md#15-sources-and-values-as-built).

First-pass limitations:guest balances settle on the event date rather than early;
company invoices follow service. The lower floor provides same-building breakout
rooms and does not create an independently booked second hall. Supplier incidents
replace a supplier-selection subsystem. Capital/refund timing retains the existing
cash-basis ending window. The roof lesson names its cost,no extra dates and actual
refusal/refund. Late permission is a simplified operating/noise review,not a claim
about a universal Munich licence.

## Measurement and budget

All T1–T18,E1,V1–V4 apply;T4 starts at opening. Every target is measured. Raw
[initial](../venue/fabriketage-main-initial.md) and
[corrected baseline](../venue/fabriketage-main-corrected.md) are preserved. The latter
uses29 strategies,main only,1,000 test seeds,two workers and409 seconds wall.
Careful41.5%±3.1;top50.5%. Bot/equipment repairs precede value tuning.

Value round1 changes hold/strict acceptance estimates,snag reviews and four
conditional recurring construction decisions. It leaves money,demand and lead
times unchanged. Exact contributions and per-target budget are in
[venue/BUDGET.md](../venue/BUDGET.md). No full report has run;only step6 permits it.

## Validation and protected games

Resumed heading repairs pass all80 established/venue browser cases across Chromium,
WebKit and375/390/430/1440px,with no cutoff-test weakening. All16 leisure terminology
checks passed;the explicit roof lesson then passed both venue390/1440px cases.
Equipment/bot repairs pass109 focused checks. Round1 content/bot checks pass255,
with24 skipped,and lint/typechecks pass. Before round1,189 generated ending examples
passed190 checks and every earlier scenario row was byte-identical. Final frozen-source suite passes86 files/1,691 tests,24 skips;lint/typechecks
pass.189 ending examples are regenerated and every earlier row is unchanged.

Screenshots remain outside the repository at
/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-venue
and founder-mode-leisure. The historical browser stop was explicitly resumed by
the user and is resolved;logs and decisions remain recorded.

The protected main-only proof uses1,000 test seeds per strategy,one scenario per
process. All nine older main reports match exactly apart from timings. Ausgesperrt
also matches. All nine old content fingerprints match the baseline;
Ausgesperrt also matches ea908900d9f19996. Full proof report follows completion.

## Final main targets

[Final raw report](../venue/fabriketage-values-2.md):29 strategies,main only,
1,000 test seeds,two workers,691 seconds wall/1,379 seconds total play under
concurrent proof/test load. Slowest100.5 seconds per1,000. Careful46.6%±3.1;
top strict47.6%±3.1,no-tests0.0%. T1,T7,T10,V2 pass at the limit,not by a
claimed advantage smaller than their margin. All four venue targets pass.

| Target | Final result | 95% margin | Status |
|---|---|---|---|
| T1 | 46.6% | ±3.1 | at limit |
| T2 | top tourism_always_strict 47.6%; no tests 0.0% | ±3.1; ±0.0 | pass |
| T3 | 62.2 points (companies 72.0%, private_parties 55.7%, weddings 9.7%) | ±5.8 | fail |
| T4 | week 2.0 from opening | n/a | pass |
| T5 | 90.9%; year 2 98.0% | n/a | pass |
| T6 | reading +15.4, blind effort +15.9 | ±2.3 | fail |
| T7 | +1.6 | ±1.6 | at limit |
| T8 | -37.2 | ±3.0 | pass |
| T9 | over -35.2, under -5.6 | ±3.0, ±1.7 | pass |
| T10 | -1.8 | ±1.4 | at limit |
| T11 | strict ahead by +1.0 overall; companies +0.0, private_parties +3.2, weddings -0.3 | ±1.5 | fail |
| T12 | 100.5 s per 1000 runs | n/a | pass |
| T13 | 32.4%; gap -14.2 | ±2.9; ±2.2 | fail |
| T14 | permanent +0.0 (signed in 12.1%); seasonal -0.3 (signed in 39.7%); part time -0.4 (signed in 45.1%) | ±0.0; ±0.9; ±1.2 | fail |
| T15 | second loan +40.6 against none (second loan taken in 100.0% of runs) | ±3.1 | fail |
| T16 | -46.6 | ±3.1 | pass |
| T17 | ending owing: reckless 100.0%, careful 50.3% (gap +49.7); careful loan-caused misses 2.2% | ±3.1; ±0.9 | pass |
| T18 | 100.0% borrowed; median interest and fees 21137 EUR | n/a | pass |
| E1 | 94.0% of 466 wins, 3.2% of 534 losses; median week 55 | ±2.2, ±1.5; ±1.0 | pass |
| V1 | free -4.5; none -4.5 | ±1.8; ±1.9 | pass |
| V2 | companies -2.4; weddings -46.5 | ±2.7; ±3.1 | at limit |
| V3 | restricted 69.6% (397/570); careful mean net 22839 EUR/run | ±3.8; ±1856 EUR | pass |
| V4 | -38.5 | ±3.0 | pass |

T11 does not pass:strict's wedding−0.3 is inside its uncertainty and does not
establish a flexible advantage. T14 requires a gain beyond the paired margin;
zero permanent effect does not pass. T6 reading/blind gains both compare with
default answers,not with each other. No threshold was restated to hide a miss.

## Budget and open issues

Both value rounds used conservatively for every target. Formula allowance0/1 is
deliberately unused:an allowance is a cap,not a quota,and no justified formula
repair was identified. No playability stop applies. Revisit the six failures once
in step6 with its fresh budget. Keep real prices/long lead times and avoid an
arbitrary loan or strategy penalty.

| Open target | Closest corrected evidence | Options for step6 |
|---|---|---|
| T3 | Round1 spread58.8±5.8;final62.2±5.8,markets72.0/55.7/9.7 | Wedding long-lead cash,forward deposits and viable mixed calendar;do not exclude weddings from the target |
| T6 | Final reading+15.4/blind+15.9±2.3;blind still exceeds one-third of reading | More contextual real choices with observable consequences;review reader decisions before changing values |
| T11 | Final strict+1.0±1.5 overall;company0.0/private+3.2/wedding−0.3 | Genuine cancellation frequency/deposit/commitment trade-offs;small split signs are inconclusive |
| T13 | Round1 passes at limit31.2%±2.9,gap−11.5±2.1;final32.4%±2.9,gap−14.2±2.2 | Teach bridge costs/forward calendars through the public UI;inspect default-reader/channel behaviour |
| T14 | Permanent0 throughout;round1 seasonal−0.3±1.4/part-time−0.2±1.2 on signed seeds | Contract utilisation/idle periods and founder cover;do not label insignificant savings a win |
| T15 | Closest corrected later loan+35.9±3.0;final+40.6±3.1,100% take it | Initial financing scope and timing of AV/working capital;retain actual borrowing costs instead of adding a penalty |

Final V3:uninsulated restriction397/570 late-active runs,69.6%±3.8;careful mean
actual late net22,839 EUR/run±1,856 including dedicated setup. V1 free/no holds
each lose4.5±1.8/1.9. Roof first-year loses38.5±3.0. These are paired main
contributions,not rankings from the event-only table.

## Once-only event table

[Raw event table](../venue/fabriketage-events.md):events only,1,000 test seeds,
111 forced-answer strategies,two workers. Event part2,113 seconds wall/4,217
seconds of play;automatic careful baseline44 seconds wall/85.3 seconds of play.
86,203 of111,000 games were played,the rest reused. No rerun.

All55 cards are listed:54 judged,21 cheapest point leaders(including ties),
33 other point leaders. The turnaround card is unseen and unjudged. These are
point rankings without a significance claim;do not infer advantages inside
uncertainty. Several no-cost/rest/repair responses tie or differ only slightly.
The breakout-room answer ties staying on the observed554-seed subset;this does
not establish an expansion win-rate benefit. Keep that option-design question
and the unseen turnaround card for review,without retuning after the frozen
once-only table. The complete main table above governs target status;missing
strategies in an event-only report are not newly failed targets.

All ten protected/earlier-leisure comparisons and fingerprints match;see
[proof](step3-protected.md). Full tests86 files/1,691 passed,24 skipped;lint
passes.189 seed examples generated,earlier rows unchanged. The phase gate is
complete. Merge locally and tag plan5-venue;no push. Full report NEVER run;step6 only.
