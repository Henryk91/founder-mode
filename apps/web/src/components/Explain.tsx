import { useEffect, useRef } from 'react'
import type { PlayerView } from '@founder-mode/engine'
import type { ExplainKey } from '../store'
import { count, label, type LabelKey, type LabelVars, voiceOf } from '../labels'
import { useGame } from '../useGame'
import styles from './ui.module.css'

/** A two sentence explanation of Runway, Cash, Energy or hours, opened by tapping the term. */
export function Explain() {
  const key = useGame((s) => s.explain)
  const stage = useGame((s) => (s.view ? voiceOf(s.view) : 'scrappy'))
  const close = useGame((s) => s.closeExplain)
  const founder = useGame((s) => s.view?.founder)
  const costs = useGame((s) => s.view?.costs)
  const ref = useRef<HTMLElement>(null)
  /** The control that opened the explanation, given focus back when it closes. */
  const opener = useRef<HTMLElement | null>(null)
  // The explanation opens at the top of the screen, so bring it into view from deep in the Plan,
  // and take keyboard focus with it. Escape closes it, as the button does.
  useEffect(() => {
    if (!key) return
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      opener.current = document.activeElement
    }
    ref.current?.scrollIntoView?.({ block: 'nearest' })
    ref.current?.focus?.({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener.current?.isConnected) opener.current.focus()
      opener.current = null
    }
  }, [key, close])
  if (!key) return null
  const unit = (n: number) => label('unit.hours', stage, { n })
  const weeks = (n: number) => count('unit.weeks', stage, n)
  const vars = {
    low: founder?.lowEnergyBelow ?? 0,
    tired: founder?.tiredBelow ?? 0,
    weeks: count('unit.weeks', stage, founder?.burnoutWeeks ?? 0),
    ...(costs && explainVars(key, costs, unit, weeks, (k, v) => label(k, stage, v))),
  }
  return (
    <section
      ref={ref}
      className={`${styles.card} ${styles.sticky}`}
      role="note"
      aria-labelledby="explain-title"
      tabIndex={-1}
      data-autofocus
    >
      <h2 id="explain-title" className={styles.title}>
        {label(`explain.${key}.title`, stage)}
      </h2>
      <p>{label(`explain.${key}.text`, stage, vars)}</p>
      <button type="button" className={styles.button} onClick={close}>
        {label('explain.close', stage)}
      </button>
    </section>
  )
}

type Costs = PlayerView['costs']

/** The numbers a section's explanation quotes, all from the scenario costs. */
function explainVars(
  key: ExplainKey,
  costs: Costs,
  hours: (n: number) => string,
  weeks: (n: number) => string,
  text: (key: LabelKey, vars: LabelVars) => string,
): Record<string, string | number> {
  switch (key) {
    case 'talk':
      return { hours: hours(costs.interviewHours) }
    case 'test':
      return {
        hours: hours(costs.landingHours),
        weeks: weeks(costs.landingWeeks),
        presaleWeeks: weeks(costs.presaleWeeks),
        presale: hours(costs.presaleHoursPerBatch),
        size: costs.presaleBatchSize,
        refund: weeks(costs.presaleRefundWeeks),
        max: costs.presaleMaxBatches,
      }
    case 'sell':
      return { hours: hours(costs.saturationHours), weeks: weeks(costs.saturationWeeks) }
    case 'demos':
      return { hours: hours(costs.demoHours), weeks: weeks(costs.trialWeeks) }
    case 'hiring':
      return {
        hours: hours(costs.searchHours),
        weeks: weeks(costs.searchWeeks),
        start: weeks(costs.startWeeks),
        notice: weeks(costs.freelanceNoticeWeeks),
        limit:
          costs.teamMaxMembers > 1
            ? text('explain.hiring.limitTeam', {
                n: costs.teamMaxMembers,
                hires: costs.teamMaxHires,
                manage: hours(costs.managementHoursPerMember),
              })
            : text('explain.hiring.limitOne', {}),
      }
    default:
      return {}
  }
}

/** A small tap target that opens an explanation. */
export function ExplainButton(props: { term: ExplainKey }) {
  const open = useGame((s) => s.openExplain)
  const stage = useGame((s) => (s.view ? voiceOf(s.view) : 'scrappy'))
  return (
    <button
      type="button"
      className={styles.infoButton}
      aria-label={`${label(`explain.${props.term}.title`, stage)}: ${label('explain.button', stage)}`}
      onClick={() => open(props.term)}
    >
      ?
    </button>
  )
}
