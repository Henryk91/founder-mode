import type { LossView, PlayerView } from '@founder-mode/engine'
import { count, label, type Voice, voiceOf } from '../labels'
import { useGame } from '../useGame'
import styles from './ui.module.css'

/**
 * Plan 7: what a lost lead or customer said, unprompted or when asked, or "no reason given" with
 * an Ask why button while it can still be asked. Never the real cause.
 */
export function LossReason({ loss, view }: { loss: LossView; view: PlayerView }) {
  const stage = voiceOf(view)
  if (loss.stated) {
    return (
      <blockquote className={styles.quote}>
        <span className={styles.hint}>
          {label(loss.stated.asked ? 'loss.answered' : 'loss.said', stage)}{' '}
        </span>
        {loss.stated.text}
      </blockquote>
    )
  }
  return (
    <div className={styles.rowHead}>
      <span className={styles.hint}>{lossNote(loss, stage)}</span>
      <AskWhy loss={loss} view={view} />
    </div>
  )
}

/** The line under a loss without a reason. */
export function lossNote(loss: LossView, stage: Voice): string {
  if (loss.tag === 'silent') return label('loss.silent', stage)
  if (loss.tag === 'stopped_paying') return label('loss.stoppedPaying', stage)
  if (loss.unanswered) return label('loss.unanswered', stage)
  return label('loss.noReason', stage)
}

/** Ask why, booked into this week's plan; shown only while the loss can be asked. */
export function AskWhy({ loss, view }: { loss: LossView; view: PlayerView }) {
  const asking = useGame((s) => (s.plan.askWhy ?? []).includes(loss.id))
  const planned = useGame((s) => s.plannedHours)
  const toggle = useGame((s) => s.toggleAskWhy)
  const stage = voiceOf(view)
  const hours = view.costs.askWhyHours
  if (!loss.canAsk || hours === null) return null
  const free = view.founder.maxHoursPerWeek - planned
  const text = asking
    ? label('loss.asking', stage)
    : label('loss.ask', stage, { hours: label('unit.hours', stage, { n: hours }) })
  return (
    <button
      type="button"
      aria-pressed={asking}
      disabled={!asking && free < hours}
      className={`${styles.chip} ${asking ? styles.chipOn : ''}`}
      aria-label={label('aria.forName', stage, { action: text, name: loss.name })}
      onClick={() => toggle(loss.id)}
    >
      {text}
    </button>
  )
}

/** The tag of a loss, as the lost list shows it. */
export function lossTag(loss: LossView, stage: Voice): string {
  switch (loss.tag) {
    case 'cancelled':
      return count('loss.cancelled', stage, Math.max(1, loss.paidWeeks ?? 0))
    case 'stopped_paying':
      return label('pipeline.lostStoppedPaying', stage)
    case 'silent':
      return label('pipeline.lostSilent', stage)
    case 'refunded':
      return label('pipeline.lostRefunded', stage)
    case 'price':
      return label('pipeline.lostPrice', stage)
    default:
      return label('pipeline.lostDeclined', stage)
  }
}

/** How many losses the lost list shows before "Show all". */
export const LOST_SHOWN = 8

/**
 * The Pipeline's lost list (plan 7): every lost lead and every customer who left, newest first,
 * with what they said, and Ask why on those still inside the window. "Show all" after the first 8.
 */
export function LostList({ view }: { view: PlayerView }) {
  const all = useGame((s) => s.showAllLost)
  const setAll = useGame((s) => s.setShowAllLost)
  const stage = voiceOf(view)
  const losses = view.losses
  if (losses.length === 0) return null
  const shown = all ? losses : losses.slice(0, LOST_SHOWN)
  return (
    <section className={styles.card} aria-label={label('pipeline.group.lost', stage)}>
      <h3 className={styles.subtitle}>
        {label('pipeline.group.lost', stage)} ({losses.length})
      </h3>
      <ul className={styles.list}>
        {shown.map((l) => (
          <li key={l.id} data-loss={l.id}>
            <div className={styles.rowHead}>
              <span>{l.name}</span>
              <span className={styles.hint}>
                {label('loss.when', stage, { week: l.week, segment: l.segmentName })},{' '}
                {lossTag(l, stage)}
              </span>
            </div>
            <LossReason loss={l} view={view} />
          </li>
        ))}
      </ul>
      {losses.length > LOST_SHOWN && (
        <button
          type="button"
          className={styles.reveal}
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          <span className={styles.revealArrow} aria-hidden="true">
            {all ? '▾' : '▸'}
          </span>
          <span>
            {all
              ? label('loss.showFewer', stage)
              : label('loss.showAll', stage, { n: losses.length })}
          </span>
        </button>
      )}
    </section>
  )
}

/** Plan 7: answers to Ask why in the inbox, as short notes, for the weeks the loss could be asked. */
export function LossAnswers({ view }: { view: PlayerView }) {
  const stage = voiceOf(view)
  const answers = view.losses.filter(
    (l) => l.askedWeek !== null && l.askedWeek >= view.week - view.costs.askWhyWeeks,
  )
  if (answers.length === 0) return null
  return (
    <>
      {answers.map((l) => (
        <section
          key={l.id}
          className={`${styles.card} ${styles.sticky}`}
          aria-label={label(
            l.kind === 'lead' ? 'loss.answerFromLead' : 'loss.answerFromCustomer',
            stage,
            { name: l.name },
          )}
          data-answer={l.id}
        >
          <h3 className={styles.paperHead}>
            {label(l.kind === 'lead' ? 'loss.answerFromLead' : 'loss.answerFromCustomer', stage, {
              name: l.name,
            })}
          </h3>
          <p className={styles.handText}>
            {l.stated ? l.stated.text : label('loss.unansweredLetter', stage)}
          </p>
        </section>
      ))}
    </>
  )
}
