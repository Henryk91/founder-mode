export type UiStage = 'scrappy' | 'organised'

type LabelEntry = string | Record<UiStage, string>

// Every string the player sees. `{name}` style placeholders are filled by `label`'s vars.
// Counts use `.one` and `.other` keys, see `count`. Game text: short, dry, British, no em dashes.
const labels = {
  'app.title': 'Founder Mode',
  'app.tagline':
    'Find paying customers before the money runs out. Nobody will tell you where they are.',
  'app.engineVersion': 'Engine',

  'start.newRun': 'New run',
  'start.continue': 'Continue',
  'start.seedLabel': 'Seed (optional)',
  'start.seedHint': 'The same seed gives the same market.',
  'start.notice.incompatible':
    'That save came from an older version of the game and cannot be continued. Start a new run.',
  'start.notice.broken': 'That save could not be read. Start a new run.',
  'start.notice.scenario_changed':
    'That save was made with different game numbers. The game has been retuned since, so the run cannot be continued. Start a new run.',

  'bar.week': 'Week {week} of {max}',
  'bar.endWeek': 'End week',
  'bar.cash': 'Cash',
  'bar.runway.safe': 'Runway: money is not shrinking',
  'bar.runway.weeks.one': 'Runway: {n} week',
  'bar.runway.weeks.other': 'Runway: {n} weeks',

  'tab.plan': 'Plan',
  'tab.market': 'Market',
  'tab.pipeline': { scrappy: 'Who pays', organised: 'Pipeline' },
  'tab.inbox': 'Inbox',
  'tab.team': 'Team',
  'tab.money': 'Money',
  'tab.inboxCount': 'Inbox ({n})',
  'tab.nav': 'Main sections',

  'unit.hours': '{n} h',
  'unit.hoursEach': '{n} h each',
  'unit.weeks.one': '{n} week',
  'unit.weeks.other': '{n} weeks',

  'plan.title': 'This week',
  'plan.energy': 'Energy {energy} of {max}',
  'plan.energyLow': 'Running on fumes. Below {low} everything you try works less well.',
  'plan.energyZero.one': 'Empty. One more week at 0 and you burn out.',
  'plan.energyZero.other': 'Empty. {n} more weeks at 0 and you burn out.',
  'plan.issue.too_many_hours': 'That is more than {max} hours. Take something out.',
  'plan.issue.transfer_exceeds_savings': 'You do not have that much in savings.',
  'plan.issue.other': 'Something in this plan does not add up.',
  'plan.section.talk': 'Talk to people',
  'plan.section.build': 'Build',
  'plan.section.fix': 'Fix bugs',
  'plan.section.sell': 'Find customers',
  'plan.section.demos': 'Demos',
  'plan.section.rest': 'Rest',
  'plan.interviews': 'Interviews: {segment}',
  'plan.featureProgress': '{done} of {total} h built',
  'plan.featureShipped': 'Shipped',
  'plan.bugs.one': '{n} bug open',
  'plan.bugs.other': '{n} bugs open',
  'plan.bugs.none': 'No known bugs',
  'plan.demos.none': 'No demos booked. Leads that ask for one appear on the {tab} tab.',
  'plan.demos.booked.one': '{n} demo booked ({hours})',
  'plan.demos.booked.other': '{n} demos booked ({hours})',
  'plan.rest': 'Rest hours',
  'plan.outreachHours': 'Hours: {segment}',

  'stepper.minus': 'Less',
  'stepper.plus': 'More',
  'stepper.minusBig': 'Much less',
  'stepper.plusBig': 'Much more',

  'channel.cold_email': 'Cold email',
  'channel.phone': 'Phone',
  'channel.in_person': 'In person',

  'market.title': 'What you have heard',
  'market.based.one': 'Based on {n} interview.',
  'market.based.other': 'Based on {n} interviews.',
  'market.mentioned': 'Asked for: {feature}',
  'market.product': 'Your product',
  'market.quality': 'Quality {quality} of 100',
  'market.week': 'Week {week}',

  'pipeline.title': { scrappy: 'Who might pay us', organised: 'Sales pipeline' },
  'pipeline.group.demo': 'Wants a demo',
  'pipeline.group.trial': 'Trying it out',
  'pipeline.group.lead': 'Found, not yet interested',
  'pipeline.group.paying': 'Paying',
  'pipeline.group.lost': 'Gone',
  'pipeline.lastContact': 'Last contact: week {week}',
  'pipeline.trialWeeks.one': 'Trial for {n} week',
  'pipeline.trialWeeks.other': 'Trial for {n} weeks',
  'pipeline.silent': 'Not answering',
  'pipeline.lostDeclined': 'Said no',
  'pipeline.lostSilent': 'Stopped answering',
  'pipeline.customerSince': 'Customer since week {week}',
  'pipeline.bookDemo': 'Book demo ({hours})',
  'pipeline.followUp': 'Follow up ({hours})',
  'pipeline.followUpBooked': 'Follow up booked, tap to cancel',
  'plan.followUps.booked.one': '{n} follow up ({hours})',
  'plan.followUps.booked.other': '{n} follow ups ({hours})',
  'inbox.cost.money': '{amount}',
  'inbox.cost.monthly': '{amount} a month',
  'pipeline.unbookDemo': 'Demo booked, tap to cancel',

  'money.title': 'Money',
  'money.cash': 'Company cash',
  'money.savings': 'Your savings',
  'money.monthlyRevenue': 'Monthly revenue',
  'money.fixedCosts': 'Fixed costs per month',
  'money.living': 'Living costs per week',
  'money.history': 'Recent weeks',
  'money.historyRow': 'Week {week}',
  'money.transfer': 'Move savings into the company',
  'money.transferHint':
    'Happens first this week. Savings also top up the company automatically if it goes negative.',
  'money.transferAmount': 'Amount',
  'money.price': 'Price per customer',
  'money.priceHint':
    'Monthly price for customers who sign from this week on. Customers who already pay keep the price they signed at.',
  'money.priceNow': 'Now: {price} per month',
  'money.priceNew': 'From this week: {price} per month',

  'results.title': 'Week {week}',
  'results.hours': '{hours} h planned. Energy {before} to {after}.',
  'results.quiet': 'A quiet week.',
  'results.money': 'Money this week',
  'results.cashNow': 'Company cash now',
  'results.in': 'Company received',
  'results.out': 'Company paid',
  'results.living': 'Living costs from your savings',
  'results.savingsNow': 'Your savings now',
  'results.continue': 'Next week',
  'results.finish': 'See how it ended',
  'results.entry.savings_transfer': 'You moved {amount} from savings into the company.',
  'results.entry.founder_draw':
    'Savings ran out, so the company paid {amount} of your living costs.',
  'results.entry.auto_top_up': 'Company cash went negative. Your savings covered {amount}.',
  'results.entry.revenue.one': '{n} customer paid {amount}.',
  'results.entry.revenue.other': '{n} customers paid {amount}.',
  'results.entry.feature_shipped': '{name} shipped. It brought {bugs} bugs with it.',
  'results.entry.bugs_fixed.one': 'You fixed {n} bug.',
  'results.entry.bugs_fixed.other': 'You fixed {n} bugs.',
  'results.entry.new_leads.zero': '{channel} outreach to {segment} found nobody.',
  'results.entry.new_leads.one': '{channel} outreach to {segment} found {n} new lead.',
  'results.entry.new_leads.other': '{channel} outreach to {segment} found {n} new leads.',
  'results.entry.wants_demo': '{name} would like a demo.',
  'results.entry.trial_started': '{name} liked the demo and started a trial.',
  'results.entry.won': '{name} signed up and will pay every month.',
  'results.entry.declined': '{name} said no thanks.',
  'results.entry.went_silent': '{name} stopped answering.',
  'results.entry.lost_silent': '{name} is gone for good.',
  'results.entry.customer_churned': '{name} cancelled.',

  'end.title': 'The run is over',
  'end.bankrupt': 'The money ran out, yours included. The company is closed.',
  'end.burnout':
    'You ran on empty for too long. The doctor said rest, and this time you listened. The company is closed.',
  'end.still_searching': 'Week {max}. The company is still alive and still not paying for itself.',
  'end.sustainable': 'Week {max}. The company pays for itself and for you. That is rare.',
  'end.stats': 'Weeks played: {weeks}. Customers now: {customers}.',
  'end.backToStart': 'Back to start',
  'intro.step': 'Card {n} of {total}',
  'intro.next': 'Next',
  'intro.back': 'Back',
  'intro.start': 'Start week 1',
  'bar.help': 'Help',
  'help.title': 'How this works',
  'help.goal': 'The goal',
  'help.weekTitle': 'How a week works',
  'help.week.1':
    'Plan your hours. A normal week is 50 h, and up to 65 h is possible if you accept the energy cost.',
  'help.week.2':
    'Tap End week. Everything you planned happens in order: interviews, building, selling, then the money.',
  'help.week.3':
    'Read what happened. Interview answers, new leads and payments show up on the results screen.',
  'help.week.4':
    'Every fourth week is a month end. Fixed costs go out and every customer gets an invoice. Invoices are paid later, by some of them very much later.',
  'help.week.5':
    'Use what you learned. The Market tab keeps your interview notes and the Pipeline tab keeps your leads.',
  'help.close': 'Back to the game',
  'explain.close': 'Got it',
  'explain.button': 'What does this mean?',
  'explain.runway.title': 'Runway',
  'explain.runway.text':
    'Runway is how many weeks company cash and your savings last together, at the pace of the last four weeks. In the first weeks it uses your known costs instead.',
  'explain.cash.title': 'Cash',
  'explain.cash.text':
    'Cash is the money in the company account. Fixed costs leave it at every month end, customer payments arrive when their invoices are paid, and your savings top it up if it goes negative.',
  'explain.energy.title': 'Energy',
  'explain.energy.text':
    'Energy is how much you have left in the tank: hours above 50 in a week drain it, and rest hours and lighter weeks refill it. Below {tired} what you try starts to work less well, below {low} clearly worse, and {weeks} in a row at 0 end the run.',
  'explain.hours.title': 'Hours',
  'explain.hours.text':
    'A normal week is 50 hours, and you can plan up to 65 if you accept the energy cost. Interviews, building, bug fixing, outreach, demos and rest all count as planned hours.',
  'note.title': "Founder's note",
  'note.dismiss': 'Dismiss',
  'plan.hours': '{planned} h planned of a normal {base} h week',
  'plan.hoursOver': '{planned} h planned. Every hour above {base} h costs energy.',
  'plan.hoursFree':
    'A normal week is {base} h. Up to {max} h is possible and costs energy. {n} h still free.',
  'plan.section.talkHint':
    "Costs {hours} each. Gives you one answer in the interviewee's own words about that market. Arrives at the end of this week.",
  'plan.section.buildHint':
    'Costs the hours shown. A feature ships once all its hours are in, and shipping brings a few bugs. Arrives the week you finish it.',
  'plan.section.fixHint':
    'Costs {hours} per bug. Removes one bug and lifts quality. Arrives this week.',
  'plan.section.sellHint':
    'Costs the hours you set, on one channel per market. Finds new leads at the end of this week, if anyone answers.',
  'plan.section.demosHint':
    'Costs {hours} per demo. A good demo starts a trial that runs {weeks}, and a trial can turn into a paying customer. The verdict on the demo arrives this week, the trial result {weeks} later.',
  'plan.section.restHint': 'Costs the hours you set. Restores energy this week.',
  'market.based.zero': 'No interviews yet. Plan some on the Plan tab and the answers collect here.',
  'market.tallyTitle': 'Features people asked for',
  'market.tally': '{feature}: asked for by {k} of {n}',
  'pipeline.empty':
    'Nobody yet. Leads appear here once you spend outreach hours on the Plan tab. Those who ask for a demo can be booked here.',
  'pipeline.noCustomers': 'No paying customers yet. A lead becomes one after a demo and a trial.',
  'money.historyNone': 'Nothing yet. A line appears here after every week you end.',
  'results.account': 'What happened',
  'results.numbers': 'The numbers',
  'results.interview': 'You spoke to someone at {segment}. Their view: {bucket}.',
  'plan.section.test': 'Test the demand',
  'plan.section.testHint':
    'A landing page test costs {hours} and the ad budget, and reports {weeks} later with visitors and sign ups. The page shows your current price, and a few people who sign up become leads. A pre-sale costs {presale} per batch and asks up to {size} of your open leads whether they would pay. It reports {presaleWeeks} later.',
  'plan.landing': 'Landing page: {segment}',
  'plan.landing.none': 'No test',
  'plan.landing.budget': '{budget} of ads, about {visitors} visitors',
  'plan.presale': 'Pre-sale: {segment}',
  'plan.presale.none': 'No pre-sale',
  'plan.presale.batches.one': '{n} batch',
  'plan.presale.batches.other': '{n} batches',
  'plan.presale.leads.one': '{n} open lead. A batch needs at least {min}.',
  'plan.presale.leads.other': '{n} open leads. A batch needs at least {min}.',
  'plan.chase.booked.one': '{n} invoice chased ({hours})',
  'plan.chase.booked.other': '{n} invoices chased ({hours})',
  'plan.forced':
    '{hours} of this week are already gone, thanks to a fine or something you promised.',
  'plan.committed': '{hours} are already spent on answers in your inbox.',
  'plan.team': 'Team',
  'plan.teamSummary': 'Searching for a {role} costs {hours}. Set it on the Team tab.',
  'plan.issue.presale_needs_leads': 'A pre-sale needs more open leads in that market.',
  'market.landing.title': 'Landing page tests',
  'market.landing.result':
    'Week {week}: {signups} of {visitors} visitors signed up ({budget} of ads).',
  'market.landing.pending': 'Landing page test running. Result in week {week}.',
  'market.presale.title': 'Pre-sales',
  'market.presale.result':
    'Week {week}: {commits} of {prospects} prospects would pay {price} a month.',
  'market.presale.pending': 'Pre-sale running. Result in week {week}.',
  'results.entry.invoices_issued.one': '{n} invoice sent, {amount} in total.',
  'results.entry.invoices_issued.other': '{n} invoices sent, {amount} in total.',
  'results.entry.invoice_written_off': '{name} never paid their {amount}. Written off.',
  'results.entry.ad_spend': 'Ads for landing page tests cost {amount}.',
  'results.entry.landing_result.one':
    'Landing page test for {segment}: {signups} of {visitors} visitors signed up, and {n} left their details.',
  'results.entry.landing_result.other':
    'Landing page test for {segment}: {signups} of {visitors} visitors signed up, and {n} left their details.',
  'results.entry.presale_result':
    'Pre-sale in {segment}: {commits} of {prospects} prospects would pay.',
  'results.entry.candidates_ready.one': 'One {role} candidate is ready to meet.',
  'results.entry.candidates_ready.other': '{n} {role} candidates are ready to meet.',
  'results.entry.hire_started': '{name} started work today.',
  'results.entry.member_let_go': '{name} is gone. It cost {amount}.',
  'results.entry.team_output.developer': 'Your developer put in {hours} build hours.',
  'results.entry.team_output.salesperson': 'Your salesperson put in {hours} hours of selling.',
  'results.entry.message_resolved': '{from}: {choice}.',
  'results.entry.message_expired': '{from}: you did not answer, so "{choice}" happened.',
  'results.entry.cash_effect.in': 'From the inbox: {amount} came in.',
  'results.entry.cash_effect.out': 'From the inbox: {amount} went out.',
  'inbox.title': 'Inbox',
  'inbox.empty': 'Nothing to answer. Enjoy it while it lasts.',
  'inbox.from': 'From {name}',
  'inbox.fromRole': '{name} ({role})',
  'inbox.expires': 'Answer by week {week}, or it answers itself.',
  'inbox.expiresThis': 'This is the last week to answer. After that it answers itself.',
  'inbox.answered': 'Your answer: {choice}. It takes effect when you end the week.',
  'inbox.noRoom': 'Not enough free hours this week.',
  'inbox.hoursLeft': '{n} h still free this week.',
  'inbox.free': 'Free',
  'team.title': 'Team',
  'team.hint':
    'One part time hire at most. A search costs {hours}, candidates arrive {weeks} later, and a hire starts {start} after the offer. Their pay is a fixed cost every month.',
  'team.role.developer': 'Developer',
  'team.role.salesperson': 'Salesperson',
  'team.perMonth': '{amount} per month',
  'team.search': 'Look for a {role}',
  'team.searchBooked': 'Search booked ({hours}). Tap to cancel.',
  'team.searching': 'Looking for a {role}. Candidates arrive in week {week}.',
  'team.candidates': 'Candidates',
  'team.candidatesHint':
    'This is only an impression from a short chat. Impressions are not always right.',
  'team.impression': 'Impression: {impression}',
  'team.offer': 'Make an offer',
  'team.offerBooked': 'Offer made. Tap to take it back.',
  'team.member': 'Your {role}',
  'team.starts': 'Starts in week {week}.',
  'team.working': 'At work since week {week}.',
  'team.letGo': 'Let go ({cost})',
  'team.letGoBooked': 'Will be let go this week. Tap to cancel.',
  'team.letGoHint': 'Letting someone go costs severance, shown in brackets.',
  'team.hadHire': 'You have had your one hire. No more searches in this run.',
  'team.devWork': 'The developer builds',
  'team.devNone': 'Nothing',
  'team.devHint': 'Their hours go to one feature. Hours with nothing to do are lost.',
  'team.salesWork': 'The salesperson does outreach to',
  'team.salesNone': 'Nobody',
  'team.salesHint':
    'They hold every demo they can first, and spend the rest of their hours on outreach here.',
  'money.invoices': 'Invoices',
  'money.invoicesHint':
    'Customers are invoiced at every month end. Some pay on time, some only once asked, a few never will. Chasing an overdue invoice costs {hours} and may get it paid next week. Unpaid invoices are written off two months after they were due.',
  'money.invoicesNone':
    'No invoices yet. They start once a customer has been with you for a month.',
  'money.receivables': 'Waiting to be paid',
  'money.invoice.open': 'Due in week {week}',
  'money.invoice.overdue.one': 'Overdue by {n} week',
  'money.invoice.overdue.other': 'Overdue by {n} weeks',
  'money.invoice.paid': 'Paid in week {week}',
  'money.invoice.written_off': 'Written off',
  'money.chase': 'Chase ({hours})',
  'money.chaseBooked': 'Chase booked, tap to cancel',
  'money.shutDown': 'Shut down the company',
  'money.shutDownHint':
    'If it is not going to work, you can stop here. The run ends this week and you see how it went.',
  'money.shutDownAsk': 'Shut down the company?',
  'money.shutDownWarn':
    'This ends the run for good. Customers are told, the laptop closes, and nothing can be undone.',
  'money.shutDownYes': 'Yes, shut it down',
  'money.shutDownNo': 'No, keep going',
  'end.shut_down': 'You closed the company on purpose. Tidy, and sadly final.',
} satisfies Record<string, LabelEntry>

export type LabelKey = keyof typeof labels

export type LabelVars = Record<string, string | number>

export function label(key: LabelKey, stage: UiStage, vars?: LabelVars): string {
  const entry: LabelEntry = labels[key]
  const text = typeof entry === 'string' ? entry : entry[stage]
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

type PluralBase = {
  [K in LabelKey]: K extends `${infer Base}.other` ? Base : never
}[LabelKey]

/** Picks `<base>.one` for 1 and `<base>.other` otherwise. `n` is available as {n}. */
export function count(base: PluralBase, stage: UiStage, n: number, vars: LabelVars = {}): string {
  const key = `${base}.${n === 1 ? 'one' : 'other'}` as LabelKey
  return label(key, stage, { ...vars, n })
}
