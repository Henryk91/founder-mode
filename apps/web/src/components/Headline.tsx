import type { PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type LabelKey, type UiStage } from '../labels'
import type { ExplainKey } from '../store'
import { useGame } from '../useGame'
import styles from './Headline.module.css'

/**
 * Changes are measured over this many resolved weeks: one, so each matches the week's results
 * (plan section 6.4, changed in Phase 9).
 */
export const CHANGE_WEEKS = 1

/** `text` is shown, `spoken` is read out instead of its arrows. */
type Change = { text: string; spoken: string; good: boolean | null }

type Stat = {
  id: 'cash' | 'runway' | 'revenue' | 'customers'
  title: LabelKey
  /** A shorter title for the narrow phone band. */
  short: LabelKey
  value: string
  /** A short line after the value, such as the week the money runs out. */
  note: string | null
  change: Change | null
  explain: ExplainKey | null
}

/** The four headline numbers with their change over the last four weeks. */
export function headlineStats(view: PlayerView): Stat[] {
  const stage = view.company.uiStage
  const before = view.history.at(-1 - CHANGE_WEEKS) ?? null
  const runway = view.company.runwayWeeks
  return [
    {
      id: 'cash',
      title: 'stat.cash',
      short: 'stat.cash',
      value: formatEuro(view.company.cashCents),
      note: null,
      change: before && delta(stage, view.company.cashCents - before.cashCents, formatEuro),
      explain: 'cash',
    },
    {
      id: 'runway',
      title: 'stat.runway',
      short: 'stat.runway',
      value:
        runway === null ? label('stat.runway.safe', stage) : count('unit.weeks', stage, runway),
      // The last week the money lasts: `runway` weeks from this one, this one included.
      note:
        runway === null || runway === 0
          ? null
          : label('stat.runway.until', stage, { week: view.week + runway - 1 }),
      change: before && runwayChange(stage, before.runwayWeeks, runway),
      explain: 'runway',
    },
    {
      id: 'revenue',
      title: 'stat.revenue',
      short: 'stat.revenue.short',
      value: formatEuro(view.monthlyRevenueCents),
      note: null,
      change:
        before && delta(stage, view.monthlyRevenueCents - before.monthlyRevenueCents, formatEuro),
      explain: null,
    },
    {
      id: 'customers',
      title: 'stat.customers',
      short: 'stat.customers',
      value: String(view.customers.length),
      note: null,
      change: before && delta(stage, view.customers.length - before.customers, String),
      explain: null,
    },
  ]
}

function delta(stage: UiStage, d: number, format: (n: number) => string): Change {
  if (d === 0)
    return { text: label('stat.same', stage), spoken: label('stat.same', stage), good: null }
  const value = format(Math.abs(d))
  return {
    text: label(d > 0 ? 'stat.up' : 'stat.down', stage, { value }),
    spoken: label(d > 0 ? 'stat.upSpoken' : 'stat.downSpoken', stage, { value }),
    good: d > 0,
  }
}

function runwayChange(stage: UiStage, was: number | null, now: number | null): Change {
  if (was === null && now === null) {
    return { text: label('stat.same', stage), spoken: label('stat.same', stage), good: null }
  }
  if (now === null) {
    return {
      text: label('stat.runway.nowSafe', stage),
      spoken: label('stat.runway.nowSafeSpoken', stage),
      good: true,
    }
  }
  if (was === null) {
    return {
      text: label('stat.runway.nowShrinking', stage),
      spoken: label('stat.runway.nowShrinkingSpoken', stage),
      good: false,
    }
  }
  return delta(stage, now - was, (n) => count('unit.weeks', stage, n))
}

/** The numbers in a row: compact on the phone band, full size in the desk headline bar. */
export function Headline(props: { size: 'band' | 'bar' }) {
  const view = useGame((s) => s.view)
  const openExplain = useGame((s) => s.openExplain)
  if (!view) return null
  const stage = view.company.uiStage
  const period = label('stat.period', stage)
  return (
    <div className={props.size === 'bar' ? styles.bar : styles.band}>
      {headlineStats(view).map((stat) => {
        const body = (
          <>
            <span className={styles.title}>
              {label(props.size === 'bar' ? stat.title : stat.short, stage)}
            </span>
            <span className={styles.value}>
              {stat.value}
              {stat.note && props.size === 'bar' && (
                <span className={styles.note}> {stat.note}</span>
              )}
            </span>
            {stat.change && (
              <span
                className={`${styles.change} ${
                  stat.change.good === true
                    ? styles.good
                    : stat.change.good === false
                      ? styles.bad
                      : ''
                }`}
              >
                <span aria-hidden="true">{stat.change.text}</span>
                <span className="visually-hidden">
                  {stat.change.spoken} {period}
                </span>
              </span>
            )}
          </>
        )
        return stat.explain ? (
          <button
            key={stat.id}
            type="button"
            className={`${styles.stat} ${styles.tappable}`}
            onClick={() => openExplain(stat.explain!)}
          >
            {body}
          </button>
        ) : (
          <div key={stat.id} className={styles.stat}>
            {body}
          </div>
        )
      })}
    </div>
  )
}
