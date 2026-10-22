import type { LabelEntry, LabelKey } from './labels'

/**
 * The tourism scenarios' own words (tourism fixes, group B). A label listed here for a scenario
 * replaces the subscription game's label in that scenario's voice (`voiceOf`); everything not
 * listed reads as in the subscription game. Game text: short, dry, British, no em dashes.
 */
type Overrides = Partial<Record<LabelKey, LabelEntry>>

/** What a scenario calls its two tests of demand and its small problems after a launch. */
type Words = {
  /** The paid signal: ads in front of one group, counting who saw it and who signed up. */
  test: { one: string; other: string; lower: string; lowerPlural: string }
  /** Plan 3: the established stage's names for the two tests, on the plan form. */
  formal: { test: { one: string; other: string }; pilot: { one: string; other: string } }
  /** Plan 3: the established stage's title for sorting out snags. */
  fixFormal: string
  /** The small trial: a few people from one group try it, and keen ones buy a voucher. */
  pilot: { one: string; other: string; lower: string; lowerPlural: string }
  /** What a new product brings: incidents, teething problems, snags. */
  snag: { one: string; other: string }
  /** Sorting them out, as a row and as a stepper's "hours ..." */
  fix: string
  fixWhat: string
  /** The build section's title. */
  build: string
  /** Who gets invoices, and when, for the Money tab; null where nobody does. */
  invoices: { hint: string; none: string } | null
  fixedCosts: string
}

const shared = (w: Words): Overrides => ({
  // Plan 3: the established stage's words in tourism (docs/design/established.md section 4).
  'plan.section.talk': {
    scrappy: 'Talk to people',
    organised: 'Talk to people',
    established: 'Guest research',
  },
  'plan.section.office': {
    scrappy: 'Where you work',
    organised: 'Office',
    established: 'Premises',
  },
  'office.title': { scrappy: 'Where you work', organised: 'Office', established: 'Premises' },
  'plan.section.guests': {
    scrappy: 'Getting guests',
    organised: 'Channels',
    established: 'Distribution',
  },

  // The headline (item 5): a tourism measure instead of customers.
  'stat.guests': 'Guests, last 4 weeks',
  'stat.guests.short': 'Guests',

  // Test the demand (item 8).
  'plan.hint.test': 'See who books before you spend.',
  'plan.test.landing': {
    scrappy: w.test.other,
    organised: w.test.other,
    established: w.formal.test.other,
  },
  'plan.test.presale': {
    scrappy: w.pilot.other,
    organised: w.pilot.other,
    established: w.formal.pilot.other,
  },
  'plan.landing': {
    scrappy: `${w.test.one}: {segment}`,
    organised: `${w.test.one}: {segment}`,
    established: `${w.formal.test.one}: {segment}`,
  },
  'plan.presale': {
    scrappy: `${w.pilot.one}: {segment}`,
    organised: `${w.pilot.one}: {segment}`,
    established: `${w.formal.pilot.one}: {segment}`,
  },
  'plan.sum.landing.one': `{n} ${w.test.lower}`,
  'plan.sum.landing.other': `{n} ${w.test.lowerPlural}`,
  'plan.presale.batches.one': `{n} ${w.pilot.lower}`,
  'plan.presale.batches.other': `{n} ${w.pilot.lowerPlural}`,
  'plan.presale.left.one': `{n} ${w.pilot.lower} left for this group.`,
  'plan.presale.left.other': `{n} ${w.pilot.lowerPlural} left for this group.`,
  'plan.issue.presale_cap': `No ${w.pilot.lowerPlural} left for that group.`,
  'stepper.what.presales': `${w.pilot.lowerPlural} for {segment}`,
  'coming.landing': `${w.test.one} result, {segment}`,
  'coming.presale': `${w.pilot.one} result, {segment}`,
  'market.landing.title': w.test.other,
  'market.landing.result':
    'Week {week}: {signups} of {visitors} people who saw it signed up ({budget} of ads).',
  'market.landing.pending': `${w.test.one} running. Result in week {week}.`,
  'market.presale.title': w.pilot.other,
  'market.presale.result': 'Week {week}: {commits} of {prospects} bought a voucher at {price}.',
  'market.presale.pending': `${w.pilot.one} planned. Result in week {week}.`,
  'results.entry.ad_spend': `Ads for the ${w.test.lowerPlural} cost {amount}.`,
  'results.entry.landing_result.one': `${w.test.one} for {segment}: {signups} of {visitors} people who saw it signed up.`,
  'results.entry.landing_result.other': `${w.test.one} for {segment}: {signups} of {visitors} people who saw it signed up.`,
  'results.entry.presale_result': `${w.pilot.one} for {segment}: {commits} of {prospects} would come again and bought a voucher.`,

  // Build and fix (item 7): ready, not shipped; incidents, teething problems or snags, not bugs.
  'plan.section.build': {
    scrappy: w.build,
    organised: w.build,
    established: 'Products and upkeep',
  },
  'explain.build.title': w.build,
  'plan.section.fix': { scrappy: w.fix, organised: w.fix, established: w.fixFormal },
  'stepper.what.fix': w.fixWhat,
  'plan.hint.build': 'Ready once all its hours are in.',
  'plan.featureShipped': 'Ready',
  'plan.shippedList': 'Ready ({n}): {names}',
  'plan.progressSpoken': '{done} of {total} h prepared',
  'plan.sum.fixing': w.snag.other,
  'plan.bugs.one': `{n} ${w.snag.one} to sort out`,
  'plan.bugs.other': `{n} ${w.snag.other} to sort out`,
  'plan.bugs.none': `No ${w.snag.other}`,
  'market.quality': 'Service {quality} of 100',
  'market.tallyTitle': 'What people asked for',
  'results.group.product': 'Getting ready',
  'results.entry.feature_ready': '{name} is ready.',
  'results.entry.feature_ready.snags.one': `{name} is ready, with {n} ${w.snag.one} to sort out.`,
  'results.entry.feature_ready.snags.other': `{name} is ready, with {n} ${w.snag.other} to sort out.`,
  'results.entry.bugs_fixed.one': `You sorted out {n} ${w.snag.one}.`,
  'results.entry.bugs_fixed.other': `You sorted out {n} ${w.snag.other}.`,
  'pm.chain.feature_shipped': '{feature} ready.',
  'pm.market.shippedWeek': 'ready week {week}',
  'explain.build.text': `Costs the hours shown. A product is ready once all its hours are in, and its first days bring a few ${w.snag.other}, which cost reviews until you sort them out. Ready the week you finish it.`,
  'explain.hours.text':
    'A normal week is 50 hours, and you can plan up to 65 if you accept the energy cost. Interviews, tests, preparing, your own shifts, calls and visits, and rest all count as planned hours.',

  // Week results (items 10 and 11).
  'results.interview.one': '{segment}: you spoke to {n} person. Their view: {bucket}.',
  'results.interview.other': '{segment}: you spoke to {n} people. Most common view: {bucket}.',
  'results.entry.revenue.one': '{n} invoice paid: {amount}.',
  'results.entry.revenue.other': '{n} invoices paid: {amount}.',
  'results.entry.invoice_written_off':
    'An invoice to {name} for {amount} was never paid. Written off.',
  'results.entry.guests_served.platform': 'The platform has already taken its {commission} off.',

  // Money (item 4).
  'money.fixedCosts': w.fixedCosts,
  ...(w.invoices
    ? { 'money.invoicesHint': w.invoices.hint, 'money.invoicesNone': w.invoices.none }
    : {}),
  'coming.monthEnd': 'Month end. Costs of {amount} go out',

  // Help (item 9).
  'help.week.2':
    'Tap End week. It happens in order: interviews and tests, preparing, bookings and guests, then the money.',
  'help.week.3':
    'Read what happened. Interview answers, new bookings, guests, reviews and payments show up on the results screen.',
  'help.week.5':
    'Use what you learned. The {market} tab keeps your interview notes and tests, and the {calendar} tab shows who is coming.',
  'help.hours.bar':
    'The bar on My week splits the planned hours by activity: Guests (your shifts, calls and visits, partners), Preparing, Learning, Rest and Admin. Admin is everything else already booked, such as hours promised to messages or a business plan.',

  // The hours bar and the post-mortem's hours.
  'plan.act.sales': 'Guests',
  'plan.act.build': 'Preparing',
  'pm.activity.selling': 'Shifts and guests',
  'pm.activity.building': 'Preparing',

  // Post-mortem (item 6).
  'pm.market.landing': w.test.one,
  'pm.market.presale': w.pilot.one,
  'pm.market.landingValue': '{signups} of {visitors} people who saw it signed up',
  'pm.market.presaleValue': '{commits} of {prospects} bought a voucher at {price}',
  'pm.market.wtpValue': 'up to about {wtp} {unit}. You asked {peak} at peak, {off} off season.',
  'pm.market.budgetHintsValue.one': 'about {amount} {unit} (1 interview)',
  'pm.market.budgetHintsValue.other': 'about {amount} {unit} on average ({n} interviews)',
  'pm.market.customers': 'Served',
  'pm.market.servedNone': 'Nobody',
  'pm.misread.interviews_high.politeness': `{segment} sounded {said}, but really it was {pain}. People were being polite. More interviews would not have fixed it; a ${w.pilot.lower} would.`,
  'pm.misread.experiment.landing': `${w.test.one} for {segment}, week {week}: {observed} sign ups from {size} people, where about {normal} was normal. One more would likely have shown it.`,
  'pm.misread.experiment.presale': `${w.pilot.one} for {segment}, week {week}: {observed} of {size} bought a voucher, where about {normal} was normal. One more would likely have shown it.`,
  'pm.misread.evidence.landing': w.test.lowerPlural,
  'pm.misread.evidence.presale': w.pilot.lowerPlural,
  'pm.luck.landing': `${w.test.one} for {segment}: {observed} sign ups. About {expected} is normal.`,
  'pm.luck.presale': `${w.pilot.one} for {segment}: {observed} vouchers. About {expected} is normal.`,
  'pm.luck.against.one': 'Luck cost you about one booking.',
  'pm.luck.against.other': 'Luck cost you about {n} bookings.',
  'pm.luck.for.one': 'Luck gave you about one extra booking.',
  'pm.luck.for.other': 'Luck gave you about {n} extra bookings.',
  'pm.chain.invoice_written_off': 'An invoice to {name} for {amount} was never paid.',
  'pm.money.summaryEmpty': 'Savings gone by week {week}. Guests paid {paid} in all.',
  'pm.money.summaryLeft': 'Savings left: {left}. Guests paid {paid} in all.',
  'pm.money.paid': 'Guests paid {amount} in all. Best month: {peak}.',
  'pm.cause.bankrupt_no_customers':
    'The money ran out in week {week}. No guest ever paid, and you and the company cost {costs} a month.',
  'pm.cause.bankrupt_after_raise':
    'The money ran out in week {week}, after you had raised. Revenue peaked at {peak} a month against costs of {costs}: the investment bought time, not guests.',
  'pm.cause.sustainable':
    'Week {week}. Over its last year, the guests paid for everything, you included.',
  'pm.next.compare_markets':
    'Before you commit to a group of guests, test a few of them for real. Compare vouchers, not compliments.',
  'pm.next.talk_more':
    'You chose your guests after only a few conversations. Next time, talk to more of them before you spend.',
  'pm.next.listen_features':
    'Your guests kept asking for things you never got ready. Count what people mention without being asked.',
  'pm.next.check_price':
    'Your prices were above what your guests would pay. Watch the bookings after a price change, and what the interviews say about money.',
  'pm.next.watch_churn':
    'Guests did not come back. Watch the reviews and the roster: cancellations and tired staff show up there first.',
  'pm.next.raise_price':
    'Your guests would have paid far more than you asked. Next time, raise prices in steps and watch the bookings.',
  'pm.next.sooner':
    'It worked. Next time, look at how many weeks it took to cover your costs, and try to get there sooner.',
})

const GRATWANDERUNG: Overrides = {
  'market.trials.title': 'Pilot days, test listings and vouchers',
  'tour.heat.sub': 'Next {n} weeks, places booked of {capacity} a week',
  // Plan 3, the established stage: the company's full name and the line that marks the switch.
  'bar.company': {
    scrappy: '{name}',
    organised: '{name}',
    established: 'Gratwanderung Bergtouren',
  },
  'results.entry.ui_established':
    'Gratwanderung is a proper outfit now, with books that balance. The van still smells of wet rope.',
  ...shared({
    test: {
      one: 'Test listing',
      other: 'Test listings',
      lower: 'test listing',
      lowerPlural: 'test listings',
    },
    pilot: { one: 'Pilot day', other: 'Pilot days', lower: 'pilot day', lowerPlural: 'pilot days' },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Trial day', other: 'Trial days' },
    },
    fixFormal: 'Incidents',
    snag: { one: 'incident', other: 'incidents' },
    fix: 'Sort out incidents',
    fixWhat: 'hours sorting out incidents',
    build: 'Prepare tours',
    invoices: {
      hint: 'Team events and school groups get an invoice once their day is done; tourists pay when they book. Some pay on time, some only once asked, a few never will. Chasing an overdue invoice costs {hours} and may get it paid next week. Unpaid invoices are written off two months after they were due.',
      none: 'No invoices yet. They start once a company or a school has had its day out.',
    },
    fixedCosts: 'Company costs per month (van, garage, insurance, accountant)',
  }),
  'explain.test.text':
    'A test listing costs {hours} and an ad budget, and reports {weeks} later with how many people saw it and how many signed up for a date. It is a signal only: nobody books from it. A pilot day costs {presale} and takes {size} people from one group out for a day. Those who would come again buy a voucher and become repeat guests. It reports {presaleWeeks} later, and each group allows {max} pilot days.',
  'help.week.4':
    'Every fourth week is a month end, when fixed costs go out. Tourists pay when they book; team events and school groups get an invoice after their day and pay later, some very much later.',
  'help.week.1':
    'Plan your hours. A normal week is 50 h, and up to 65 h is possible if you accept the energy cost. Guiding shifts count too.',
  'results.entry.guests_served_invoiced.one':
    '{n} guest served: {amount} paid on the day, {invoiced} invoiced to companies and schools.',
  'results.entry.guests_served_invoiced.other':
    '{n} guests served: {amount} paid on the day, {invoiced} invoiced to companies and schools.',
}

const HINTERHOF: Overrides = {
  'market.trials.title': 'Pop-ups, lunch tests and vouchers',
  // Plan 3, the established stage: the company's full name and the line that marks the switch.
  'bar.company': { scrappy: '{name}', organised: '{name}', established: 'Wirtshaus Hinterhof' },
  'results.entry.ui_established':
    'The Hinterhof is a proper restaurant now, and it pays its own way. The chef still counts the covers twice.',
  ...shared({
    test: {
      one: 'Opening list',
      other: 'Opening lists',
      lower: 'opening list',
      lowerPlural: 'opening lists',
    },
    pilot: {
      one: 'Pop-up dinner',
      other: 'Pop-up dinners',
      lower: 'pop-up dinner',
      lowerPlural: 'pop-up dinners',
    },
    formal: {
      test: { one: 'Pre-opening list', other: 'Pre-opening lists' },
      pilot: { one: 'Tasting dinner', other: 'Tasting dinners' },
    },
    fixFormal: 'Teething problems',
    snag: { one: 'teething problem', other: 'teething problems' },
    fix: 'Iron out teething problems',
    fixWhat: 'hours on teething problems',
    build: 'Set up the restaurant',
    invoices: null,
    fixedCosts: 'Company costs per month (rent, utilities, insurance, accountant)',
  }),
  'stat.guests': 'Covers, last 4 weeks',
  'stat.guests.short': 'Covers',
  'stat.price': 'Avg price per cover',
  'stat.price.short': 'Avg cover',
  'tour.heat.sub': 'Next {n} weeks, covers booked of {capacity} a week',
  'explain.test.text':
    'An opening list costs {hours} and an ad budget: adverts for the restaurant that ask people to join a list for the opening. It reports {weeks} later with how many saw it and how many joined. It is a signal only: nobody books from it. A pop-up dinner costs {presale} and feeds {size} people from one group. Those who would come again buy a voucher and become repeat guests. It reports {presaleWeeks} later, and each group allows {max} dinners.',
  'help.week.4':
    'Every fourth week is a month end, when rent, other fixed costs and loan payments go out. Guests pay at the table, so nobody here gets an invoice.',
  'results.entry.guests_served.one': '{n} cover served: {amount} paid at the table.',
  'results.entry.guests_served.other': '{n} covers served: {amount} paid at the table.',
  'results.entry.bookings_new.one': '{n} cover booked by {segment}.',
  'results.entry.bookings_new.other': '{n} covers booked by {segment}.',
  'results.entry.turned_away.one': '{n} cover from {segment} found no table and went elsewhere.',
  'results.entry.turned_away.other': '{n} covers from {segment} found no table and went elsewhere.',
  'results.entry.cancelled.one': '{n} cover cancelled.',
  'results.entry.cancelled.other': '{n} covers cancelled.',
  'results.entry.company_cancelled.staff.one':
    'You had to turn away {n} cover: not enough people on the roster.',
  'results.entry.company_cancelled.staff.other':
    'You had to turn away {n} covers: not enough people on the roster.',
  'pm.guests.cancelled':
    'You turned away {company} booked covers for lack of staff or weather; guests cancelled {guest}.',
  'pm.guests.away.one': '1 cover found no table in the last 12 weeks.',
  'pm.guests.away.other': '{n} covers found no table in the last 12 weeks.',
  'pm.guests.costs': 'Shifts and food came to {amount}.',
  'pm.guests.summary.one': '1 cover served, {rating}',
  'pm.guests.summary.other': '{n} covers served, {rating}',
}

const SEEBLICK: Overrides = {
  'market.trials.title': 'Test rates, open houses and vouchers',
  // Plan 3, the established stage: the company's full name and the line that marks the switch.
  'bar.company': { scrappy: '{name}', organised: '{name}', established: 'Gasthaus Seeblick' },
  'results.entry.ui_established':
    'The Seeblick has stopped being a project and started being a guesthouse. The bills get paid before anyone frowns at them.',
  ...shared({
    test: { one: 'Test rates', other: 'Test rates', lower: 'test rate', lowerPlural: 'test rates' },
    pilot: {
      one: 'Open house',
      other: 'Open houses',
      lower: 'open house',
      lowerPlural: 'open houses',
    },
    formal: {
      test: { one: 'Rate test', other: 'Rate tests' },
      pilot: { one: 'Viewing day', other: 'Viewing days' },
    },
    fixFormal: 'Snags',
    snag: { one: 'snag', other: 'snags' },
    fix: 'Fix snags',
    fixWhat: 'hours fixing snags',
    build: 'Ready the house',
    invoices: {
      hint: 'Firms get an invoice once their guests have stayed, and groups once their party is over, less the deposit they paid when they booked; couples pay at the stay. Some pay on time, some only once asked, a few never will. Chasing an overdue invoice costs {hours} and may get it paid next week. Unpaid invoices are written off two months after they were due.',
      none: "No invoices yet. They start once a firm's or a group's guests have stayed.",
    },
    fixedCosts: 'Company costs per month (lease, utilities, insurance, accountant)',
  }),
  'stat.guests': 'Occupancy, last 4 weeks',
  'stat.guests.short': 'Occupancy',
  'stat.price': 'Avg room rate this season',
  'stat.price.short': 'Avg rate',
  'tour.heat.sub': 'Next {n} weeks, room nights booked of {capacity} a week',
  'explain.test.text':
    'Test rates cost {hours} and an ad budget: a few rooms on the platform at a test price, for one group. They report {weeks} later with how many people saw them and how many asked for dates. A signal only: nobody books from it. An open house costs {presale} and shows the house to {size} people from one group. Those who would come again buy a voucher and become repeat guests. It reports {presaleWeeks} later, and each group allows {max} open houses.',
  'help.week.4':
    'Every fourth week is a month end, when the lease, other fixed costs and loan payments go out. Couples pay at the stay; firms and groups get an invoice after it and pay later, some very much later.',
  'results.entry.guests_served.one': '{n} room night served: {amount} paid at the stay.',
  'results.entry.guests_served.other': '{n} room nights served: {amount} paid at the stay.',
  'results.entry.guests_served_invoiced.one':
    '{n} room night served: {amount} paid at the stay, {invoiced} invoiced to firms and groups.',
  'results.entry.guests_served_invoiced.other':
    '{n} room nights served: {amount} paid at the stay, {invoiced} invoiced to firms and groups.',
  'results.entry.bookings_new.one': '{n} room night booked by {segment}.',
  'results.entry.bookings_new.other': '{n} room nights booked by {segment}.',
  'results.entry.turned_away.one':
    '{n} room night from {segment} found no room and went elsewhere.',
  'results.entry.turned_away.other':
    '{n} room nights from {segment} found no room and went elsewhere.',
  'results.entry.cancelled.one': '{n} room night cancelled.',
  'results.entry.cancelled.other': '{n} room nights cancelled.',
  'results.entry.cancelled_kept.one':
    '{n} room night cancelled and paid anyway, as your policy says.',
  'results.entry.cancelled_kept.other':
    '{n} room nights cancelled and paid anyway, as your policy says.',
  'results.entry.company_cancelled.staff.one':
    'You had to cancel {n} room night: not enough people on the roster.',
  'results.entry.company_cancelled.staff.other':
    'You had to cancel {n} room nights: not enough people on the roster.',
  'pm.guests.cancelled':
    'You cancelled {company} room nights for lack of staff; guests cancelled {guest}.',
  'pm.guests.away.one': '1 room night was turned away for lack of room in the last 12 weeks.',
  'pm.guests.away.other': '{n} room nights were turned away for lack of room in the last 12 weeks.',
  'pm.guests.costs': 'Shifts and costs per room night came to {amount}.',
  'pm.guests.summary.one': '1 room night sold, {rating}',
  'pm.guests.summary.other': '{n} room nights sold, {rating}',
}

const RUECKENWIND: Overrides = {
  'market.trials.title': 'Taster hours, test listings and vouchers',
  // Plan 4: the established stage's company name and the line that marks the switch.
  'bar.company': {
    scrappy: '{name}',
    organised: '{name}',
    established: 'Rückenwind Watersports',
  },
  'results.entry.ui_established':
    'Rückenwind pays its own way now, wind or no wind. The container still smells of neoprene.',
  ...shared({
    test: {
      one: 'Test listing',
      other: 'Test listings',
      lower: 'test listing',
      lowerPlural: 'test listings',
    },
    pilot: {
      one: 'Taster hour',
      other: 'Taster hours',
      lower: 'taster hour',
      lowerPlural: 'taster hours',
    },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Trial session', other: 'Trial sessions' },
    },
    fixFormal: 'Incidents',
    snag: { one: 'incident', other: 'incidents' },
    fix: 'Sort out incidents',
    fixWhat: 'hours sorting out incidents',
    build: 'Get gear and courses ready',
    invoices: null,
    fixedCosts: 'Company costs per month (container, licence, van, insurance, gestor)',
  }),
  'stat.guests': 'Guests, last 4 weeks',
  'stat.guests.short': 'Guests',
  'tour.heat.sub': 'Next {n} weeks, places booked of {capacity} a week',
  'explain.test.text':
    'A test listing costs {hours} and an ad budget: two weeks on the activity platform at a test price. It reports {weeks} later with how many saw it and how many asked for dates. A signal only: nobody books from it. A taster hour costs {presale} and puts {size} people from one group on the water for free. Those who would come again buy a voucher and become repeat guests. It reports {presaleWeeks} later, and each group allows {max} taster hours.',
  'help.week.4':
    'Every fourth week is a month end, when the container, the beach licence and other fixed costs go out. Guests pay when they book or at the beach; wind regulars pay a deposit first.',
  'help.week.1':
    'Plan your hours. A normal week is 50 h, and up to 65 h is possible if you accept the energy cost. Your own lessons count too. The wind decides what runs: check the forecast on My week.',
  'pm.guests.cancelled':
    'You cancelled {company} places for wind, sea or a short roster; guests cancelled {guest}.',
}

const TIEFGANG: Overrides = {
  'market.trials.title': 'Pool tasters, test listings and dive shows',
  'bar.company': {
    scrappy: '{name}',
    organised: '{name}',
    established: 'Tiefgang Dive Centre',
  },
  'results.entry.ui_established':
    'Tiefgang pays its own way now, swell or no swell. The compressor still sounds like a sad tractor.',
  ...shared({
    test: {
      one: 'Test listing',
      other: 'Test listings',
      lower: 'test listing',
      lowerPlural: 'test listings',
    },
    pilot: {
      one: 'Pool taster',
      other: 'Pool tasters',
      lower: 'pool taster',
      lowerPlural: 'pool tasters',
    },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Trial session', other: 'Trial sessions' },
    },
    fixFormal: 'Incidents',
    snag: { one: 'incident', other: 'incidents' },
    fix: 'Sort out incidents',
    fixWhat: 'hours sorting out incidents',
    build: 'Get courses and dives ready',
    invoices: {
      hint: 'Dive clubs get an invoice once their week is over, less the deposit they paid when they booked; everyone else pays at booking. Some pay on time, some only once asked, a few never will. Chasing an overdue invoice costs {hours} and may get it paid next week. Unpaid invoices are written off two months after they were due.',
      none: "No invoices yet. They start once a club's week is over.",
    },
    fixedCosts: 'Company costs per month (shop, insurance, compressor, accountant)',
  }),
  'stat.guests': 'Divers, last 4 weeks',
  'stat.guests.short': 'Divers',
  'tour.heat.sub': 'Next {n} weeks, places booked of {capacity} a week',
  'explain.test.text':
    'A test listing costs {hours} and an ad budget: two weeks on the dive platform at a test price. It reports {weeks} later with how many saw it and how many asked for dates. A signal only: nobody books from it. A pool taster costs {presale} and gives {size} people from one group a free try in a hotel pool. Those who would come again buy a voucher and become repeat guests. It reports {presaleWeeks} later, and each group allows {max} pool tasters.',
  'help.week.4':
    'Every fourth week is a month end, when the shop, other fixed costs and loan payments go out. Divers pay at booking; clubs pay a deposit and the rest by invoice after their week.',
  'help.week.1':
    'Plan your hours. A normal week is 50 h, and up to 65 h is possible if you accept the energy cost. Your own dives count too. The sea decides what runs: check the forecast on My week, and the boat on Finance.',
  'pm.guests.cancelled':
    'You cancelled {company} places for the sea, the boat or a short roster; divers cancelled {guest}.',
}

const LEINENLOS: Overrides = {
  'market.trials.title': 'Taster days, test listings and travel fairs',
  'bar.company': {
    scrappy: '{name}',
    organised: '{name}',
    established: 'Leinen los Blue Cruises',
  },
  'results.entry.ui_established':
    'Leinen los pays its own way now, westerly or no westerly. The office kettle has retired.',
  ...shared({
    test: {
      one: 'Test listing',
      other: 'Test listings',
      lower: 'test listing',
      lowerPlural: 'test listings',
    },
    pilot: {
      one: 'Taster day',
      other: 'Taster days',
      lower: 'taster day',
      lowerPlural: 'taster days',
    },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Trial day', other: 'Trial days' },
    },
    fixFormal: 'Incidents',
    snag: { one: 'incident', other: 'incidents' },
    fix: 'Sort out incidents',
    fixWhat: 'hours sorting out incidents',
    build: 'Get cruises and contracts ready',
    invoices: {
      hint: 'Retreat organisers get an invoice once their week is over, less the deposit they paid when they booked; everyone else pays a deposit and the rest before sailing. Some pay on time, some only once asked, a few never will. Chasing an overdue invoice costs {hours} and may get it paid next week. Unpaid invoices are written off two months after they were due.',
      none: "No invoices yet. They start once a retreat's week is over.",
    },
    fixedCosts: 'Company costs per month (harbour desk, insurance, accountant, website)',
  }),
  'stat.guests': 'Guests, last 4 weeks',
  'stat.guests.short': 'Guests',
  'tour.heat.sub': 'Next {n} weeks, places booked of {capacity} a week',
  'explain.test.text':
    'A test listing costs {hours} and an ad budget: two weeks of cabins on the cruise platform at a test price. It reports {weeks} later with how many saw it and how many asked for dates. A signal only: nobody books from it. A taster day costs {presale} and takes {size} people from one group out on a boat for a day. Those who would come again buy a voucher and become repeat guests. It reports {presaleWeeks} later, and each group allows {max} taster days.',
  'help.week.4':
    'Every fourth week is a month end, when the desk, other fixed costs and any lease or loan payments go out. Prices are in euros; costs here are really paid in lira and rise in the second season.',
  'help.week.1':
    'Plan your hours. A normal week is 50 h, and up to 65 h is possible if you accept the energy cost. Hosting a cruise yourself takes the whole week. The boat is on Finance; the season, week by week, on My week.',
  'pm.guests.cancelled':
    'You cancelled {company} places for the boat, the minimum to sail or a short roster; guests cancelled {guest}.',
}

const AUSGESPERRT: Overrides = {
  ...shared({
    test: {
      one: 'Test listing',
      other: 'Test listings',
      lower: 'test listing',
      lowerPlural: 'test listings',
    },
    pilot: { one: 'Play test', other: 'Play tests', lower: 'play test', lowerPlural: 'play tests' },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Test game', other: 'Test games' },
    },
    fixFormal: 'Prop repairs',
    snag: { one: 'snag', other: 'snags' },
    fix: 'Fix room snags',
    fixWhat: 'hours fixing room snags',
    build: 'Build and refresh rooms',
    invoices: {
      hint: 'Companies pay a deposit when booking and receive an invoice for the balance after the games. Local groups and visitors pay at booking. Chasing an overdue company invoice costs {hours}; unpaid invoices are written off two months after they were due.',
      none: 'No company invoices yet. They start once company games have run.',
    },
    fixedCosts: 'Company costs per month (basement, utilities, insurance, software, accountant)',
  }),
  'bar.company': { scrappy: '{name}', organised: '{name}', established: '{name} GmbH' },
  'stat.guests': 'Room-games, last 4 weeks',
  'stat.guests.short': 'Games',
  'tour.calendar': 'Rooms',
  'tab.calendar': { scrappy: 'Rooms', organised: 'Rooms', established: 'Rooms' },
  'plan.hint.build':
    'Finish preparation, then allow the stated construction time. Started rooms reserve space.',
  'tab.pipeline': { scrappy: 'Rooms', organised: 'Rooms', established: 'Rooms' },
  'plan.section.talk': {
    scrappy: 'Talk to groups',
    organised: 'Market conversations',
    established: 'Market research',
  },
  'plan.section.guests': {
    scrappy: 'Fill the rooms',
    organised: 'Channels',
    established: 'Distribution',
  },
  'market.trials.title': 'Listings, test games and vouchers',
  'results.entry.ui_established':
    'The basement pays its bills. The doors still stick, but only in the story.',
  'help.week.1':
    'Plan your hours. A normal week is 50 h, and up to 65 h costs energy. Choose a first theme, finish its preparation and allow eight weeks for construction. The Rooms tab shows slots and future dates.',
  'help.week.4':
    'Every fourth week is a month end, when the basement, other fixed costs and loan payments go out. Room-games are paid at booking; companies pay a deposit and an invoice for the balance. You refund advances when you cancel, or when a group cancels under flexible terms. A voucher is cash now and a game still owed.',
  'explain.prices.text':
    'Each group and slot has peak and off-season prices. A flexible policy refunds cancelled groups; a strict one keeps the agreed charge but puts some groups off. If you cancel a game, you return its advance payment under either policy. Closing sales keeps existing bookings reserved.',
  'explain.test.text':
    'A test listing costs {hours} and an ad budget, then reports after {weeks}: how many saw the offer and asked for dates. It is a signal, not paid bookings. A play test costs {presale} and gives {size} groups a finished room; keen groups buy a voucher and may return. Compare what people pay for with what they praise.',
  'pm.guests.cancelled':
    'You cancelled {company} room-games for lack of staff or a closed room; groups cancelled {guest}.',
}

const FABRIKETAGE: Overrides = {
  ...shared({
    test: {
      one: 'Test listing',
      other: 'Test listings',
      lower: 'test listing',
      lowerPlural: 'test listings',
    },
    pilot: {
      one: 'Open evening',
      other: 'Open evenings',
      lower: 'open evening',
      lowerPlural: 'open evenings',
    },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Agency evening', other: 'Agency evenings' },
    },
    fixFormal: 'Venue upkeep',
    snag: { one: 'snag', other: 'snags' },
    fix: 'Fix venue snags',
    fixWhat: 'hours fixing venue snags',
    build: 'Fit out and improve the floor',
    invoices: {
      hint: 'Companies pay a deposit at booking and receive a balance invoice after the event. Guest balances are collected on the event date. Chasing an overdue invoice costs {hours}; unpaid invoices are written off after their stated term.',
      none: 'No company balance invoices yet. They follow served company events.',
    },
    fixedCosts:
      'Company costs per month (lease, insurance, utilities, accountant, software and cleaning)',
  }),
  'bar.company': { scrappy: '{name}', organised: '{name}', established: '{name} GmbH' },
  'stat.guests': 'Events, last 4 weeks',
  'stat.guests.short': 'Events',
  'tour.calendar': 'Calendar',
  'tab.calendar': { scrappy: 'Calendar', organised: 'Calendar', established: 'Calendar' },
  'tab.pipeline': { scrappy: 'Calendar', organised: 'Calendar', established: 'Calendar' },
  'plan.section.talk': {
    scrappy: 'Talk to organisers',
    organised: 'Client conversations',
    established: 'Market research',
  },
  'plan.section.guests': {
    scrappy: 'Sell the dates',
    organised: 'Channels',
    established: 'Distribution',
  },
  'plan.hint.build':
    'Prepare the work, fund its quote and allow the stated wait. Forward bookings need a ready date.',
  'leisure.beforeOpening':
    'Not open yet. Finish and fund the fit-out, then allow its stated construction time. Future events can reserve dates after readiness.',
  'leisure.buildPrep': '{name}: {amount} committed. Finish preparation, then allow {weeks} weeks.',
  'leisure.slotLoad': '{name}: {visits} events, {word}.',
  'market.trials.title': 'Listings, open evenings and fair stands',
  'tour.heat.sub': 'Next {n} weeks, events booked of {capacity} a week',
  'asset.option.share': 'Hired per event',
  'asset.products': 'Used for: {products}.',
  'asset.capacity': 'Dinner capacity',
  'asset.capacityShare': '{pct}% of the dinner capacity',
  'asset.terms.share': 'Full hire costs {unit} per served dinner; no fee on empty dates.',
  'asset.terms.buy': 'Buy for {price}; monthly upkeep {upkeep}, crew cost {crew} in a week used.',
  'asset.switch.buy':
    'Hire or return furniture through the supplier’s inbox offer. Buy through the product list; accepted weddings still need chairs on their actual date.',
  'help.week.1':
    'Plan your hours. Prepare the common fit-out and speak to the bank while researching organisers. The Calendar shows held, booked and free capacity. A waiting approval does not stop you preparing other work.',
  'help.week.4':
    'Every fourth week is a month end: rent, other fixed costs and loan payments go out. Deposits are cash received for future events. Company balances are invoiced after service; guest balances are collected on the event date. Strict guest cancellations keep only the deposit; flexible or company cancellations return it.',
  'explain.prices.text':
    'Price each market and slot separately. Hold terms apply to new enquiries: free, paid or no holds. A held date blocks capacity until its decision. Flexible cancellations return deposits; strict guest cancellations keep the deposit. Company-caused cancellation always returns advances. Closing sales preserves accepted bookings.',
  'explain.test.text':
    'A listing test and an open evening measure interest before you commit to a market. Read the result, the requested dates and the budget hints. These tests are signals; the real calendar still needs accepted bookings and crew.',
  'results.entry.ui_established':
    'The floor pays its bills. The calendar is still written in pencil, but the pencil has an accountant.',
  'pm.guests.cancelled':
    'You cancelled {company} events for closed dates or missing cover; clients cancelled {guest}.',
}

const SCHWEISSPERLE: Overrides = {
  ...shared({
    test: {
      one: 'Class listing',
      other: 'Class listings',
      lower: 'class listing',
      lowerPlural: 'class listings',
    },
    pilot: {
      one: 'Trial class',
      other: 'Trial classes',
      lower: 'trial class',
      lowerPlural: 'trial classes',
    },
    formal: {
      test: { one: 'Listing test', other: 'Listing tests' },
      pilot: { one: 'Open class', other: 'Open classes' },
    },
    fixFormal: 'Studio upkeep',
    snag: { one: 'snag', other: 'snags' },
    fix: 'Fix studio snags',
    fixWhat: 'hours fixing studio snags',
    build: 'Prepare the studio and offers',
    invoices: {
      hint: 'Company plans invoice employee memberships. Chase overdue invoices for {hours}; individual plans and packs are paid in advance.',
      none: 'No company membership invoices yet.',
    },
    fixedCosts:
      'Company costs per month (rent, insurance, utilities, music, software, cleaning and accountant)',
  }),
  'bar.company': { scrappy: '{name}', organised: '{name}', established: '{name} GmbH' },
  'stat.guests': 'Class visits, last 4 weeks',
  'stat.guests.short': 'Visits',
  'tab.calendar': { scrappy: 'Classes', organised: 'Classes', established: 'Timetable' },
  'tab.pipeline': { scrappy: 'Classes', organised: 'Classes', established: 'Timetable' },
  'tour.calendar': 'Classes and members',
  'plan.section.talk': {
    scrappy: 'Talk to potential members',
    organised: 'Member conversations',
    established: 'Member research',
  },
  'plan.section.guests': {
    scrappy: 'Fill the classes',
    organised: 'Channels',
    established: 'Distribution',
  },
  'plan.hint.build':
    'Prepare the paid fit-out, classes and offers. Allow construction time before opening; reformers reduce mat places in the same studio.',
  'plan.hint.prices':
    'Set new membership and pack prices. Agreed terms and prepaid visits remain owed.',
  'leisure.beforeOpening':
    'Not open yet. Fund and prepare the studio fit-out, then allow the stated construction wait.',
  'leisure.buildPrep': '{name}: {amount} committed. Finish preparation, then allow {weeks} weeks.',
  'market.trials.title': 'Class listings and open classes',
  'asset.capacity': 'Spin class places',
  'asset.capacityShare': '{pct}% of the bikes',
  'asset.products': 'Used for: {products}.',
  'asset.switch.buy':
    'Lease or return bikes through the supplier’s inbox offer. Buy through the product list; the studio and classes must also be ready.',
  'help.week.1':
    'Plan your hours. Research potential members while preparing the bank loan and studio fit-out. Prepare class offers, then set the timetable in Classes and roster one qualified instructor shift for every class, including empty ones.',
  'help.week.4':
    'Every fourth week closes a financial month. Membership fees and class packs bring cash; an unused pack still owes visits. Annual members keep their agreed term even if they stop attending. The aggregator pays only actual check-ins in the slots you open.',
  'explain.prices.text':
    'Monthly fees, annual terms, off-peak access, intro offers and packs are separate agreements. New prices apply to new members. Check slots and included classes before enabling an offer. Drop-in prices are per visit; monthly interview budgets refer to membership fees.',
  'explain.test.text':
    'A class listing measures interest before you commit. A trial class gives people a small paid offer. Read the budgets, requested classes and usable slots; enthusiasm alone does not pay the lease.',
  'results.entry.ui_established':
    'The studio pays its bills. The timetable has become a spreadsheet, with the same early alarm.',
  'pm.guests.cancelled':
    'You cancelled {company} visits for unavailable classes or missing cover; members and guests cancelled {guest}.',
}

export const SCENARIO_LABELS: Record<string, Overrides> = {
  schweissperle: SCHWEISSPERLE,
  fabriketage: FABRIKETAGE,
  ausgesperrt: AUSGESPERRT,
  leinenlos: LEINENLOS,
  tiefgang: TIEFGANG,
  rueckenwind: RUECKENWIND,
  gratwanderung: GRATWANDERUNG,
  hinterhof: HINTERHOF,
  seeblick: SEEBLICK,
}
