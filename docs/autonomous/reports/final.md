# Final report: the autonomous plan (steps 0 to 8)

## What was built

- **Step 0, C3** (tag `phase9-c3`): long mode basics, chasing and admin as a team task, team chasing handover, expansion bots.
- **Step 1, funding** (tag `phase9-d`): angel and seed rounds judged on visible numbers, investor mood and updates, cap table, the Growing ending.
- **Step 2, Phase 9 UI** (tag `phase9-done`): the Raise section, cap table, post-mortem funding lines, browser tests in long mode.
- **Step 3, situational events** (tag `situational-events`): new condition paths (team size, runway, the sender's overdue or silent state), a view-based evaluator, the reader deriving answers from declared conditions.
- **Step 4, tourism engine** (tag `tourism-engine`): bookings of capacity that expires, rosters, seasons, weather, platforms, partnerships, policies, invoices for business guests, reviews; the calendar and three Plan sections.
- **Step 5, Gratwanderung** (tag `scenario-outdoor`): guided outdoor days in the Alps; a seasonal win test; event guests as booking requests.
- **Step 6, bank loan and Hinterhof** (tag `scenario-restaurant`): the loan as a general system (plan, judgement, offer, repayments, personal guarantee, default); a Munich restaurant needing it to open; food cost, crews per service, required products.
- **Step 7, Seeblick** (tag `scenario-hotel`): a lakeside guesthouse; shared capacity (whole-house bookings), deposits, a segment's share of capacity.
- **Step 8, wrap up** (tag `tourism-complete`): open issues revisited (Seeblick retuned), scenarios loaded per chunk after the first paint (Start screen 2.39 s on the emulated mid range phone, was 2.90), axe and no sideways scrolling on every scenario at 375, 390, 430 and 1440 px in Chrome and WebKit, docs.

The 60 week game (Kantino and Zollstock) is unchanged throughout: main, paired and inbox parts on 10,000 seeds identical at every step, fingerprints locked by a test.

## Every target (report seeds, `docs/balancing.md`)

| Scenario and mode | Pass | Fail |
|---|---|---|
| Kantino, 60 weeks | 1 to 11, 13 to 19 | none |
| Zollstock, 60 weeks | 1 to 11, 13 to 19 | none |
| Kantino, long mode | 21 to 26, 28 to 30, 34, 35, 37 (and 10, 13 to 15 in long mode) | 20, 27, 31, 32, 33, 36 |
| Gratwanderung | T1 to T5, T7 to T12 | T6 |
| Hinterhof | T1 to T5, T7 to T13, T16 (L1, L4) | T6, T14 (L2), T15 (L3) |
| Seeblick | T1, T2, T4, T5, T8 to T10, T12, T13, T16 | T3, T6, T7, T11, T14 (L2), T15 (L3) |

Several passes are "at the limit" (within their own margin): Kantino long 27 in step 0, Hinterhof T1 and T7, Gratwanderung T7, Seeblick T2 and T9. Targets restated with written reasons: 29 and 20 (C3), 36 (funding), L3 (loan: count defaults the loan itself caused).

## Open issues

1. **Seeblick spread (T3)**: 22.4 points (limit 15); groups win 19%, leisure 42%. Revisited in step 8 (careful from 51.9% to 31.4%). Options: a weekday share for project guests, groups' lead time shorter still, a smaller event room cost.
2. **Inbox reading (T6) in all three tourism scenarios**: blind effort gains 60 to 100% of what reading gains (limit a third). Most effortful choices are mildly good and hours are rarely scarce. Options: more choices with visible situational costs; scarcer founder hours in tourism.
3. **Loan targets L2 and L3** (Hinterhof, Seeblick): borrowed money pays its own repayments, so extra borrowing is a buffer and reckless borrowing rarely defaults before the business itself fails. Options: the bank lends only what the business plan needs; an over-borrower that spends the money; restate or drop L2.
4. **Seeblick policy (T11) and pricing (T7)**: within a few points of passing; noise on the report seeds.
5. **Kantino long 31, 32** (raising beats bootstrapping by 3 to 4 points), **33** (early raiser -6.8 against -8), **36** (updates do not pay for their hours), **20** (no part time person pays at this size), **27** (blind effort 37% of reading): unchanged since their steps; revisited in step 8 with no new lever.

## For Henry to review, in priority order

1. Protected games changed in step 8 on purpose: the revisit retuned Seeblick (and its fingerprint). No target that passed before the revisit fails after it; T1, T2 and T9 now pass, T7 and T11 still fail within a few points (decisions, step 8).
2. The bank loan design: a deterministic bank, risk pricing, the personal guarantee through the savings top up, "Bank called the loan" when the money runs out with a payment missed, and L3 restated (decisions, step 6).
3. Spec deviations: school demand in Gratwanderung (6 to 12 groups a week, spec 0.3 to 1.2), office lunch volume and price in Hinterhof, Seeblick's lease, demand and group volume (decisions, steps 5 to 8). Lease and rent figures are estimates; no current source was found.
4. Modelling simplifications: crews per service instead of separate cooks and servers, no prep or waste planning, no minimum stay, renovation in one block, rooms not closed during renovation.
5. Bot knowledge per scenario (reader rules, a November guesthouse borrowing for six months) and bot rules that apply only in scenarios with a loan so earlier reports stay comparable.
6. Text fixes in protected scenarios: Gratwanderung's win rule on the intro card, Hinterhof's "per cover" labels (fingerprints updated, games unchanged).
7. Earlier items: funding design choices, situational events grammar, target restatements (STATUS.md).

Engine version stays 0.14.0: every change since that alters a replay also changes the scenario's fingerprint, which already gives old saves the "values changed" notice; the 60 week games replay unchanged.
