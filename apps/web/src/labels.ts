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

  'bar.week': 'Week {week} of {max}',
  'bar.endWeek': 'End week',
  'bar.cash': 'Cash',
  'bar.runway.none': 'Runway: not enough history yet',
  'bar.runway.safe': 'Runway: cash is not shrinking',
  'bar.runway.weeks.one': 'Runway: {n} week',
  'bar.runway.weeks.other': 'Runway: {n} weeks',

  'tab.plan': 'Plan',
  'tab.market': 'Market',
  'tab.pipeline': { scrappy: 'Who pays', organised: 'Pipeline' },
  'tab.money': 'Money',
  'tab.nav': 'Main sections',

  'unit.hours': '{n} h',
  'unit.hoursEach': '{n} h each',

  'plan.title': 'This week',
  'plan.energy': 'Energy {energy} of {max}',
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

  'results.title': 'Week {week}',
  'results.hours': '{hours} h planned. Energy {before} to {after}.',
  'results.quiet': 'A quiet week.',
  'results.money': 'Money this week',
  'results.cashNow': 'Company cash now',
  'results.in': 'Received',
  'results.out': 'Paid',
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
  'help.week.4': 'Every fourth week is a month end. Fixed costs go out and customers pay.',
  'help.week.5':
    'Use what you learned. The Market tab keeps your interview notes and the Pipeline tab keeps your leads.',
  'help.close': 'Back to the game',
  'explain.close': 'Got it',
  'explain.button': 'What does this mean?',
  'explain.runway.title': 'Runway',
  'explain.runway.text':
    'Runway is how many weeks the company cash lasts at the pace of the last four weeks. It says nothing until four weeks have been played, and your savings stretch it further.',
  'explain.cash.title': 'Cash',
  'explain.cash.text':
    'Cash is the money in the company account. Fixed costs leave it and customer payments arrive at every month end, and your savings top it up if it goes negative.',
  'explain.energy.title': 'Energy',
  'explain.energy.text':
    'Energy is how much you have left in the tank, out of 100. Hours above 50 in a week drain it, and rest hours and lighter weeks refill it.',
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
    'Costs {hours} per demo. A good demo starts a {weeks} week trial, and a trial can turn into a paying customer. The verdict on the demo arrives this week, the trial result {weeks} weeks later.',
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
