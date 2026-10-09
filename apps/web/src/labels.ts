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
  'plan.hours': '{planned} of {base} h planned',
  'plan.hoursOver': '{planned} of {base} h planned. Hours above {base} cost energy.',
  'plan.hoursFree': '{n} h left to plan (up to {max})',
  'plan.energy': 'Energy {energy} of {max}',
  'plan.issue.too_many_hours': 'That is more than {max} hours. Take something out.',
  'plan.issue.transfer_exceeds_savings': 'You do not have that much in savings.',
  'plan.issue.other': 'Something in this plan does not add up.',
  'plan.section.talk': 'Talk to people',
  'plan.section.talkHint': 'Interviews tell you what people say. {hours} each.',
  'plan.section.build': 'Build',
  'plan.section.buildHint': 'Shipped features add bugs.',
  'plan.section.fix': 'Fix bugs',
  'plan.section.fixHint': '{hours} per bug.',
  'plan.section.sell': 'Find customers',
  'plan.section.sellHint': 'Pick a channel for each market and the hours to spend.',
  'plan.section.demos': 'Demos',
  'plan.section.rest': 'Rest',
  'plan.section.restHint': 'Restores energy.',
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
  'market.based.zero': 'No interviews yet.',
  'market.based.one': 'Based on {n} interview.',
  'market.based.other': 'Based on {n} interviews.',
  'market.mentioned': 'Asked for: {feature}',
  'market.product': 'Your product',
  'market.quality': 'Quality {quality} of 100',
  'market.week': 'Week {week}',

  'pipeline.title': { scrappy: 'Who might pay us', organised: 'Sales pipeline' },
  'pipeline.empty': 'Nobody yet. Plan some outreach hours and see who answers.',
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
  'money.historyNone': 'Nothing yet.',
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
  'results.interview': 'Interview, {segment}: {bucket}',
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
