# Step3: Fabriketage

Status: isolated branch plan5-venue-work;second tuning round running,phase gate incomplete.

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
passed190 checks and every earlier scenario row was byte-identical. Final seed/full
suite checks are pending.

Screenshots remain outside the repository at
/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-venue
and founder-mode-leisure. The historical browser stop was explicitly resumed by
the user and is resolved;logs and decisions remain recorded.

The protected main-only proof is still running on1,000 test seeds per strategy,
one scenario per process. All nine old content fingerprints match the baseline;
Ausgesperrt also matches ea908900d9f19996. Full proof report follows completion.

## Round1 results

Main only,29 strategies,1,000 test seeds,two workers,427 seconds wall. Careful
42.7%±3.1;top strict45.0%. T5 passes90.9%/98.1% and T13 passes at the limit
31.2%±2.9,gap−11.5±2.1. T7 and V2 also pass at their limits. Open targets are
T3,T6,T10,T11,T14,T15,V1. Full raw rows remain in the isolated branch.

Round2 uses the remaining value allowance on paid-hold acceptance,wedding strict
acceptance and unresolved-snag reviews. No formula used. Money,demand,lead times
and financing unchanged.255 focused checks and lint pass. Measurement running;
no venue event table or full report has run.
