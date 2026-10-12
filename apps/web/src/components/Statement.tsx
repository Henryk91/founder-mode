import type { PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type UiStage } from '../labels'
import styles from './Statement.module.css'

/** Weeks of balance in the trend line and lines in the statement. */
const TREND_WEEKS = 8
const STATEMENT_LINES = 4
const COMING_UP = 4

/** Balance, the trend of the last weeks, and the latest weekly changes. */
export function BankStatement({ view }: { view: PlayerView }) {
  const stage = view.company.uiStage
  const recent = view.history.slice(-TREND_WEEKS)
  const lines = view.history
    .map((h, i) => ({
      week: h.week,
      change: h.cashCents - (view.history[i - 1]?.cashCents ?? h.cashCents),
    }))
    .slice(1)
    .slice(-STATEMENT_LINES)
    .reverse()
  return (
    <section className={styles.statement} aria-label={label('money.statement', stage)}>
      <div className={styles.bank}>{label('money.statement', stage)}</div>
      <div className={styles.balance}>{formatEuro(view.company.cashCents)}</div>
      {recent.length >= 2 && <Trend values={recent.map((h) => h.cashCents)} />}
      <div className={styles.caption}>
        {recent.length >= 2
          ? count('money.trend', stage, recent.length, {
              savings: formatEuro(view.founder.savingsCents),
            })
          : label('money.savingsLine', stage, { savings: formatEuro(view.founder.savingsCents) })}
      </div>
      {lines.length === 0 && (
        <div className={styles.caption}>{label('money.historyNone', stage)}</div>
      )}
      {lines.length > 0 && (
        <ul className={styles.lines}>
          {lines.map((l) => (
            <li key={l.week} className={styles.line}>
              <span>{label('money.historyRow', stage, { week: l.week })}</span>
              <span className={l.change > 0 ? styles.up : undefined}>{signed(l.change)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function signed(cents: number): string {
  return cents > 0 ? `+${formatEuro(cents)}` : cents < 0 ? `-${formatEuro(-cents)}` : formatEuro(0)
}

/** A plain line of the balance; up or down is also said in the caption, never by colour alone. */
function Trend({ values }: { values: number[] }) {
  const width = 258
  const height = 44
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = 4 + (1 - (v - min) / span) * (height - 8)
    return [x, y] as const
  })
  const last = points.at(-1)!
  const falling = values.at(-1)! < values[0]!
  return (
    <svg
      className={styles.trend}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        className={falling ? styles.trendDown : styles.trendUp}
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
      />
      <circle className={falling ? styles.dotDown : styles.dotUp} cx={last[0]} cy={last[1]} r="4" />
    </svg>
  )
}

type Upcoming = { week: number; text: string; warn: boolean }

/** The next scheduled things, soonest first: month end, results, starts, trials, invoices. */
export function upcoming(view: PlayerView): Upcoming[] {
  const stage = view.company.uiStage
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  const items: Upcoming[] = [
    {
      week: view.company.nextMonthEndWeek,
      text: label('coming.monthEnd', stage, {
        amount: formatEuro(view.company.monthlyFixedCostsCents),
      }),
      warn: false,
    },
  ]
  for (const e of view.pendingExperiments) {
    items.push({
      week: e.resolveWeek,
      text: label(`coming.${e.kind}`, stage, { segment: segment(e.segmentId) }),
      warn: false,
    })
  }
  if (view.team.search) {
    items.push({
      week: view.team.search.readyWeek,
      text: label('coming.candidates', stage),
      warn: false,
    })
  }
  for (const member of view.team.members) {
    if (member.working) continue
    items.push({
      week: member.startWeek,
      text: label('coming.hireStarts', stage, { name: member.name }),
      warn: false,
    })
  }
  const living = view.founder.nextLivingStep
  if (living) {
    items.push({
      week: living.week,
      text: label('coming.livingRise', stage, { amount: formatEuro(living.centsPerWeek) }),
      warn: false,
    })
  }
  const freelancer = view.team.freelance.current
  if (freelancer?.endWeek != null) {
    items.push({
      week: freelancer.endWeek,
      text: label('coming.freelanceEnd', stage, { name: freelancer.name }),
      warn: false,
    })
  }
  for (const l of view.leads) {
    if (l.stage !== 'trial') continue
    items.push({
      week: view.week + Math.max(0, view.costs.trialWeeks - l.weeksInStage),
      // Said in words as well as in colour.
      text: label(l.silent ? 'coming.trialEndsSilent' : 'coming.trialEnds', stage, {
        name: l.name,
      }),
      warn: l.silent,
    })
  }
  for (const inv of view.invoices) {
    if (inv.status !== 'open') continue
    items.push({
      week: inv.dueWeek,
      text: label('coming.invoiceDue', stage, {
        name: inv.customerName,
        amount: formatEuro(inv.amountCents),
      }),
      warn: false,
    })
  }
  return items.sort((a, b) => a.week - b.week).slice(0, COMING_UP)
}

/** Fixed tilts for the calendar notes, so they look the same on every render. */
const NOTE_TILTS = [-1, 0.8, 1.2, -0.7]

/** "Coming up": calendar notes for the next scheduled things. */
export function ComingUp({ view }: { view: PlayerView }) {
  const stage = view.company.uiStage
  const items = upcoming(view)
  return (
    <section aria-label={label('coming.title', stage)} className={styles.coming}>
      <h2 className={styles.hand}>{label('coming.title', stage)}</h2>
      <ul className={styles.notes}>
        {items.map((item, i) => (
          <li
            key={item.week + item.text}
            className={styles.note}
            style={{ transform: `rotate(${NOTE_TILTS[i % NOTE_TILTS.length]}deg)` }}
          >
            <span className={styles.noteWeek}>
              {label('coming.week', stage, { week: item.week })}
            </span>
            <span className={item.warn ? styles.noteWarn : undefined}>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The sticky note of worry: when the money runs out, and who could stop it. */
export function WorryNote({ view }: { view: PlayerView }) {
  const text = worry(view, view.company.uiStage)
  if (!text) return null
  return <p className={styles.worry}>{text}</p>
}

export function worry(view: PlayerView, stage: UiStage): string | null {
  const runway = view.company.runwayWeeks
  if (runway === null) return view.customers.length > 0 ? label('worry.safe', stage) : null
  // Runway never counts past the last week: money that lasts that long does not run out here.
  if (view.week + runway > view.maxWeeks)
    return label('worry.toTheEnd', stage, { week: view.maxWeeks })
  const parts = [label('worry.outOfMoney', stage, { week: view.week + runway })]
  const owes = view.invoices.find((i) => i.status === 'overdue')
  if (owes) parts.push(label('worry.unlessPays', stage, { name: owes.customerName }))
  const trial = view.leads.find((l) => l.stage === 'trial')
  if (trial)
    parts.push(label(owes ? 'worry.orSigns' : 'worry.unlessSigns', stage, { name: trial.name }))
  return parts.join(' ')
}
