# Griffig preparation while fitness measurements run

Not registered or integrated. Preserve the fitness gate before step5 runtime work.
Read live LeisureSchema,leisureVisits,course progression and capacity again at that gate.

## Confirmed existing machinery

- Leisure courses already initialise an indoor ladder and run sameStay/nextSeason
  bookings;do not build another anonymous-graduate pipeline.
- Setting hours already accumulate across weeks,reset freshness at refresh.hours,
  record actual resets and subtract lostCapacity only in the reset week. Content
  can express a morning loss as weekly visit units;do not subtract an entire week.
- Builder waits and opening require one completed selected area plus common fit-out.
- Pack value/visits are owed until redemption or expiry;no free pre-sale revenue.

## Gaps to resolve with optional hall content

1. Hall hours:capacities in the spec are people at once,not weekly visits. Suggested
   hall block has visitHours plus desk role/hour terms. Products state simultaneous
   hard/comfort counts;actual slot hours determine weekly capacity. Public view shows
   chosen opening hours and required desk shifts,not comfort thresholds. Closing
   an early slot must save paid desk cover and remove its service capacity.
2. Desk cover:an actual on-duty founder/paid shift covers opening hours. Unstaffed
   hours close capacity;do not use general host relief as a substitute for admission
   staffing. Instructor/coaching hours cannot simultaneously cover the desk.
3. Qualifications:member and aggregator identities need optional held levels. New
   members may bring prior belay skills under a hidden segment range;courses award
   actual levels only after served completion. Rope visits require belay;lead courses
   require belay. Auto-belays/bouldering remain usable by beginners. Do not infer a
   person's qualification merely from their market label.
4. Existing direct course bookings represent groups,not persistent named members.
   Optional course-to-membership conversion creates actual eligible enquiries with
   earned level and the configured35%/50% rates,then normal paid-offer conversion.
   Existing members taking courses gain skills on that member. Never grant levels
   to all future people or duplicate course return and membership conversions.
5. Route setters:founder setting hours already count once. Add an explicit optional
   purchased-setting allocation with hours/paid shift;charge those shifts once via
   the roster,then allocate only actual eligible paid hours among walls. Unallocated
   shifts stay paid. Do not make a general hire produce free reset work.
6. Café/rentals should earn margin only on actual served visitors,not nominal demand
   or one weekly lump. Existing venue extras may be reused if their attribution is
   appropriately generic;otherwise optional per-served-visit content is clearer.
7. Mezzanine is inside the hall,not another location. Comfort+15% stays hidden while
   actual increased room for amenities is shown. Preserve the safety hard limit.

## Capacity and units,initial estimates to record before measurement

Use a2-hour average hall visit;for example140 hard boulder visitors x20 evening
hours/2 =1400 weekly evening visits,comfortable80x20/2=800. Course capacity uses
coached participants and paid course hours,not this hall multiplication again.
Students/families are visit pools with an explicit joining share;committed demand
is membership enquiries. Monthly budgets and day-ticket prices use one consistent
basis;copy fitness's explicit monthly conversion without a double price curve.

## Targets before first climbing measurement

T1–T10,T12–T18,E1,K1–K5 apply;T11 is not an operative same-day membership/admission
choice and should be explicitly inapplicable. T4 starts at actual opening.
K1 should show mixed-outcome paired seeds,sole/joint winning leaders and all ties;
report each first-build's lead share and binomial margin. Never choose a first wall
using hidden roles or a seed lookup. Decide the final interpretation before runs.
K4 compares rope-capable careful play to the same build without its course ladder;
no-rope seeds are reported separately rather than pretending they tested courses.

## Primary source refresh,22 October2026

https://muenchenwisesystem.einstein-boulder.com/preise-zeiten/ currently lists
EUR15.50 adult day,12.90 reduced,155/12visits,39/month with3-month initial term,
420/year and4.50shoe hire. Its boulder-only membership is cheaper than the draft
69/month mixed hall. Label mixed rope/boulder fees estimates;do not claim this
source supports69. Opening hours06–23weekdays,09–23weekends are a comparator,
not a staffing-free mandate for our smaller hall.
https://boulderhalle-prisma.de/ timed out on this refresh;earlier preparatory note
has65/month,139/11visits,700/year. Verify before citing as current in the final spec.
https://www.bmas.de/EN/Labour/Minimum-Wage/the-minimum-wage-questions-and-answers.html
states13.90gross/hour from1Jan2026 and14.60from1Jan2027;employer contributions
are additional. Roster costs must be employer-inclusive estimates. Coaching/setter
freelance fees are estimates,not minimum-wage comparisons or verified quotes.

## First implementation touch list

content/schema.ts;engine/types.ts;systems/qualifications.ts,leisure.ts,bookings.ts;
qualification fixture;schema/decisions/status docs. Resolve anonymous course
graduates as next-week qualified paid-offer enquiries,not guaranteed members or
segment-wide skill grants. Initial skills are per person,not per market.

## Hall implementation touch list

schema.ts;types.ts;new systems/hall.ts;leisure.ts capacity/reset/validation/view;
bookings.ts early hall-only contract application and uncoached admission staffing;
hall fixtures;schema/decisions/status docs. Opening hours are a weekly choice;actual
desk cover caps them. Staff shifts are paid once. Setter shifts produce allocated
setting hours once and founder setting remains separately budgeted.

## Remaining content gaps and minimum adaptations

- Party sales need optional per-product requestSize so a199 EUR party really
  reserves ten people at19.90 each;individual admissions stay size1.
- A weekly children's club needs an optional membership visitsPerWeek override;
  family day visitors' lower visit rate must not turn a weekly club into monthly
  attendance. Regular climbing offers retain segment defaults.
- Reuse extras for the café and rentals. Rental stock is a paid feature;income is
  an explicit estimated average basket per actual visit,not a full shop/inventory
  system. Preserve nominal5/3 EUR source prices as context,not independently
  simulated checkout promises. Café contribution requires real dedicated paid
  roster cover,with a stated visitors-per-shift throughput. It is a weekly
  staffing abstraction,not a claim that one shift opens the counter all week.
- Courses use the existing sameStay ladder,with per-person earned IDs already
  implemented. Two/three sessions fit in one game week;role founderHours and
  quoted shift fee include the full course time. Course fee ratios follow the
  segment's ticket base;record that first-pass linkage explicitly.

## Ancillary/group touch list

schema.ts;types.ts;bookings.ts request sizes/payroll cover;leisure.ts weekly offer
visits;membership.ts pack basis;venue.ts optional staffed extras;fixtures and schema/
decisions/status docs. Reuse the existing weekly accounting rather than adding a
shop or inventory simulation. Shares are contractual receipt allocations,not
hidden purchase chances shown to players.

## Alternative wall requirements

Touch:schema.ts;new requirements.ts;market.ts/bookings.ts coverage;fixture;schema/
decisions/status. Use optional leisure alternatives for rope-or-boulder and family
area/offer alternatives. This changes market-fit coverage,not physical capacity
pools or rope qualifications. Coached club/party space still uses the actual
children's area in the first pass;auto-belays serve casual beginner visits.

## Content preparation after resumption

Touch:unregistered scenarios/griffig YAML,content draft tests,scene artifact and
spec/decisions/status docs.48events,150quotes,20features,four intros,two scenes.
Draft parses separately without changing scenario IDs,catalogue or lazy loading.
Source estimates and units are recorded in scenario-climbing.md section15.
Before registration:resolve explicit student membership/day-product discounts,
review course request shares and first-build bot plans,then add labels/UI/bots.
Do not measure this draft as completed content.

## Shared-mechanic import during fitness validation

Validated fitness sourcea0643aa is merged into the isolated climbing branch. Keep
hall/qualification/shared-slot fields alongside traffic history and one public
weekly-offer frequency field. Griffig explicitly enables direct aggregator
payment.821 checks pass,27 skips,including engine/content,fitness/climbing bots
and membership UI;lint/typechecks pass. No registration,climbing report or tuning.
The completed fitness milestone must still be imported before the runtime gate.

## Hall history optimisation candidate

Touch:engine leisure.ts,bookings.ts,postmortem.ts,hall/visit fixture,schema docs
and status. Reuse the class traffic archive for optional halls,keeping current
service/future bookings and earned qualifications. Compare complete results and
all public-view traces to integrated sourcea148737 before retaining it. Normal
booking IDs and course-learner identities are an explicit invariant to check.
No new values,formula or registered climbing report.

Retained candidate:27 complete results/public traces match exactly,including
six funded104-week rope/both-wall/course cases.822 checks pass,27 skips,and
lint/typechecks pass. Historical individual visits reduce to current service
plus future bookings;54 weekly aggregates retain calendar/lifetime reporting.
No controlled timing claim;measure runtime in the first registered main matrix.

Integrated final browser check:24 Chromium/WebKit cases pass across all three
stages and375/390/430/1440px after traffic compaction and offer-frequency UI
integration. Log:/tmp/plan5-climbing-integrated-browser.log. Griffig remains
unregistered;next import the completed fitness milestone before measurement.
