import { useState } from 'react'
import type { InterviewView, PlayerView, ReportEntry, WeekReport } from '@founder-mode/engine'
import { formatEnergy, formatEuro } from '../format'
import { count, label, type LabelKey, type UiStage } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

export function entryText(entry: ReportEntry, view: PlayerView): string {
  const stage = view.company.uiStage
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  switch (entry.kind) {
    case 'savings_transfer':
    case 'founder_draw':
    case 'auto_top_up':
      return label(`results.entry.${entry.kind}`, stage, { amount: formatEuro(entry.amountCents) })
    case 'revenue':
      return count('results.entry.revenue', stage, entry.customers, {
        amount: formatEuro(entry.amountCents),
      })
    case 'feature_shipped':
      return label('results.entry.feature_shipped', stage, {
        name: entry.name,
        bugs: entry.bugsAdded,
      })
    case 'bugs_fixed':
      return count('results.entry.bugs_fixed', stage, entry.count)
    case 'new_leads': {
      const vars = {
        segment: segment(entry.segmentId),
        channel: label(`channel.${entry.channel}`, stage),
      }
      const found =
        entry.count === 0
          ? label('results.entry.new_leads.zero', stage, vars)
          : count('results.entry.new_leads', stage, entry.count, vars)
      return entry.wornOut
        ? `${found} ${label('results.entry.new_leads.wornOut', stage, vars)}`
        : found
    }
    case 'lead_update':
      return label(`results.entry.${entry.change}`, stage, { name: entry.name })
    case 'customer_churned':
      return label('results.entry.customer_churned', stage, { name: entry.name })
    case 'invoices_issued':
      return count('results.entry.invoices_issued', stage, entry.count, {
        amount: formatEuro(entry.amountCents),
      })
    case 'invoice_written_off':
      return label('results.entry.invoice_written_off', stage, {
        name: entry.name,
        amount: formatEuro(entry.amountCents),
      })
    case 'ad_spend':
      return label('results.entry.ad_spend', stage, { amount: formatEuro(entry.amountCents) })
    case 'landing_result':
      return count('results.entry.landing_result', stage, entry.leads, {
        segment: segment(entry.segmentId),
        signups: entry.signups,
        visitors: entry.visitors,
      })
    case 'presale_result':
      return label('results.entry.presale_result', stage, {
        segment: segment(entry.segmentId),
        commits: entry.commits,
        prospects: entry.prospects,
      })
    case 'candidates_ready':
      return count('results.entry.candidates_ready', stage, entry.count, {
        role: label(`team.role.${entry.role}`, stage).toLowerCase(),
      })
    case 'hire_started':
      return label('results.entry.hire_started', stage, { name: entry.name })
    case 'member_let_go':
      return label('results.entry.member_let_go', stage, {
        name: entry.name,
        amount: formatEuro(entry.costCents),
      })
    case 'team_output':
      return label(`results.entry.team_output.${entry.role}`, stage, { hours: entry.hours })
    case 'message_resolved':
      return label(
        entry.expired ? 'results.entry.message_expired' : 'results.entry.message_resolved',
        stage,
        { from: entry.fromName, choice: entry.choiceLabel },
      )
    case 'cash_effect':
      return label(
        entry.amountCents >= 0 ? 'results.entry.cash_effect.in' : 'results.entry.cash_effect.out',
        stage,
        { amount: formatEuro(Math.abs(entry.amountCents)) },
      )
  }
}

type Group = 'money' | 'sales' | 'product' | 'learning' | 'founder'
const GROUP_ORDER: Group[] = ['money', 'sales', 'product', 'learning', 'founder']

type Line = { key: string; priority: number; node: React.ReactNode }

/** Which heading an entry belongs under, and how much it matters (higher comes first). */
function place(entry: ReportEntry): [Group, number] {
  switch (entry.kind) {
    case 'auto_top_up':
      return ['money', 8]
    case 'founder_draw':
    case 'invoice_written_off':
      return ['money', 7]
    case 'revenue':
      return ['money', 6]
    case 'cash_effect':
      return ['money', 4]
    case 'savings_transfer':
    case 'invoices_issued':
      return ['money', 3]
    case 'ad_spend':
      return ['money', 2]
    case 'lead_update':
      return ['sales', LEAD_PRIORITY[entry.change]]
    case 'customer_churned':
      return ['sales', 9]
    case 'new_leads':
      return ['sales', entry.count > 0 ? 4 : 2]
    case 'feature_shipped':
      return ['product', 7]
    case 'bugs_fixed':
      return ['product', 3]
    case 'team_output':
      return entry.role === 'developer' ? ['product', 3] : ['sales', 3]
    case 'landing_result':
    case 'presale_result':
      return ['learning', 6]
    case 'hire_started':
      return ['founder', 8]
    case 'member_let_go':
      return ['founder', 6]
    case 'candidates_ready':
      return ['founder', 5]
    case 'message_resolved':
      return ['founder', 2]
  }
}

const LEAD_PRIORITY: Record<Extract<ReportEntry, { kind: 'lead_update' }>['change'], number> = {
  won: 10,
  committed: 7,
  trial_started: 6,
  refunded: 6,
  wants_demo: 5,
  went_silent: 5,
  declined: 4,
  lost_silent: 4,
}

type Moment = { id: 'first_customer' | 'hire_started' | 'ending'; title: string; text: string }

/**
 * Notable moments get a full screen step before the week summary: the first paying customer, a
 * hire starting, and the end of the run. Milestones join them in Phase 7.
 */
export function notableMoments(report: WeekReport, view: PlayerView): Moment[] {
  const stage = view.company.uiStage
  const moments: Moment[] = []
  const won = report.entries.find((e) => e.kind === 'lead_update' && e.change === 'won')
  const hadCustomers = view.history.slice(0, -1).some((h) => h.customers > 0)
  if (won && won.kind === 'lead_update' && !hadCustomers) {
    const price = view.customers.find((c) => c.name === won.name)?.priceCentsPerMonth
    moments.push({
      id: 'first_customer',
      title: label('moment.first_customer.title', stage),
      text: label('moment.first_customer.text', stage, {
        name: won.name,
        amount: formatEuro(price ?? view.company.priceCentsPerMonth),
      }),
    })
  }
  for (const e of report.entries) {
    if (e.kind !== 'hire_started') continue
    moments.push({
      id: 'hire_started',
      title: label('moment.hire_started.title', stage),
      text: label('moment.hire_started.text', stage, {
        name: e.name,
        role: label(`team.role.${e.role}`, stage).toLowerCase(),
      }),
    })
  }
  if (report.ending) {
    moments.push({
      id: 'ending',
      title: label('end.title', stage),
      text: label(`end.${report.ending}`, stage, { max: view.maxWeeks }),
    })
  }
  return moments
}

/**
 * After End week: notable moments one at a time, then one screen with the week grouped under
 * money, sales, product, learning and founder, most important group first. A finished run goes
 * from its ending moment to the post-mortem instead (see App).
 */
export function Results() {
  const view = useGame((s) => s.view)
  const report = useGame((s) => s.report)
  const seen = useGame((s) => s.momentsSeen)
  const next = useGame((s) => s.nextMoment)
  const dismiss = useGame((s) => s.dismissReport)
  if (!view) return null
  const stage = view.company.uiStage
  const moment = report ? notableMoments(report, view)[seen] : undefined

  if (moment) {
    return (
      <section
        className={`${styles.card} ${styles.sticky} ${styles.moment}`}
        aria-label={moment.title}
      >
        <h2 className={styles.momentTitle}>{moment.title}</h2>
        <p className={styles.handText}>{moment.text}</p>
        {moment.id === 'ending' && (
          <p>{label('end.stats', stage, { weeks: view.week, customers: view.customers.length })}</p>
        )}
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={next}>
          {label(moment.id === 'ending' ? 'moment.toPostMortem' : 'moment.next', stage)}
        </button>
      </section>
    )
  }

  return (
    <>
      {report && <WeekSummary report={report} view={view} />}
      <div className={styles.stickyBottom}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={dismiss}>
          {label('results.continue', stage)}
        </button>
      </div>
    </>
  )
}

function WeekSummary({ report, view }: { report: WeekReport; view: PlayerView }) {
  const stage = view.company.uiStage
  const groups = groupWeek(report, view, stage)
  return (
    <>
      <h2 className={styles.hand}>{label('results.title', stage, { week: report.week })}</h2>
      {groups.map(([group, lines]) => (
        <section
          key={group}
          className={styles.card}
          aria-label={label(`results.group.${group}`, stage)}
        >
          <h3 className={styles.paperHead}>{label(`results.group.${group}`, stage)}</h3>
          <ul className={`${styles.list} ${group === 'money' ? styles.moneyLines : ''}`}>
            {lines.map((l) => (
              <li key={l.key} className={styles.row}>
                {l.node}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

/** The week's lines under their headings, most important group and line first, empty groups out. */
export function groupWeek(report: WeekReport, view: PlayerView, stage: UiStage): [Group, Line[]][] {
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  const lines: Record<Group, Line[]> = {
    money: [],
    sales: [],
    product: [],
    learning: [],
    founder: [],
  }
  report.entries.forEach((e, i) => {
    const [group, priority] = place(e)
    lines[group].push({ key: `e${i}`, priority, node: entryText(e, view) })
  })
  const bySegment = new Map<string, InterviewView[]>()
  for (const iv of report.interviews) {
    bySegment.set(iv.segmentId, [...(bySegment.get(iv.segmentId) ?? []), iv])
  }
  for (const [segmentId, ivs] of bySegment) {
    lines.learning.push({
      key: `iv-${segmentId}`,
      priority: 5,
      node: <InterviewSummary segmentName={segment(segmentId)} interviews={ivs} stage={stage} />,
    })
  }
  const low = report.energyAfter < view.founder.lowEnergyBelow
  lines.founder.push({
    key: 'energy',
    priority: low ? 7 : 1,
    node: (
      <span className={low ? styles.warn : undefined}>
        {label('results.hours', stage, {
          hours: report.plannedHours,
          before: formatEnergy(report.energyBefore),
          after: formatEnergy(report.energyAfter),
        })}
      </span>
    ),
  })
  lines.money.push({ key: 'numbers', priority: 3, node: <Numbers report={report} stage={stage} /> })

  const top = (g: Group) => Math.max(...lines[g].map((l) => l.priority))
  return GROUP_ORDER.filter((g) => lines[g].length > 0)
    .map((g): [Group, Line[]] => [g, [...lines[g]].sort((a, b) => b.priority - a.priority)])
    .sort(([a], [b]) => top(b) - top(a) || GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
}

/** One line per market, with the individual quotes a tap away. */
function InterviewSummary({
  segmentName,
  interviews,
  stage,
}: {
  segmentName: string
  interviews: InterviewView[]
  stage: UiStage
}) {
  const [open, setOpen] = useState(false)
  const tally = new Map<string, { name: string; n: number }>()
  for (const iv of interviews) {
    const t = tally.get(iv.bucketId) ?? { name: iv.bucketName, n: 0 }
    tally.set(iv.bucketId, { ...t, n: t.n + 1 })
  }
  const top = [...tally.values()].reduce((best, t) => (t.n > best.n ? t : best))
  return (
    <>
      <div>
        {count('results.interview', stage, interviews.length, {
          segment: segmentName,
          bucket: top.name,
        })}
      </div>
      <button
        type="button"
        className={styles.reveal}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.revealArrow} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span>{label(open ? 'results.quotes.hide' : 'results.quotes.show', stage)}</span>
      </button>
      {open &&
        interviews.map((iv, i) => (
          <blockquote key={i} className={styles.quote}>
            {iv.quote}
          </blockquote>
        ))}
    </>
  )
}

function Numbers({ report, stage }: { report: WeekReport; stage: UiStage }) {
  const l = report.ledger
  const received = l.revenueCents + l.otherIncomeCents + l.transferCents + l.autoTransferCents
  const paid = l.fixedCostsCents + l.founderDrawCents + l.adSpendCents + l.otherCostsCents
  const row = (key: LabelKey, cents: number, good = false) => (
    <div className={styles.rowHead}>
      <span>{label(key, stage)}</span>
      <span className={`${styles.mono} ${good ? styles.good : ''}`}>{formatEuro(cents)}</span>
    </div>
  )
  return (
    <div className={styles.group}>
      {row('results.in', received, received > 0)}
      {row('results.out', paid)}
      {row('results.cashNow', l.cashEndCents)}
      {row('results.living', l.livingCostsCents - l.founderDrawCents)}
      {row('results.savingsNow', l.savingsEndCents)}
    </div>
  )
}
