import type { PlayerView } from '@founder-mode/engine'
import { Letter } from '../components/Letters'
import { count, label, type UiStage } from '../labels'
import type { Tab } from '../store'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

/** Fixed tilts for answered paper, so the desk looks the same on every render. */
const TILTS = [-0.6, 1.2, -1, 0.8]

/** Messages from customers, leads and everyone else. Tap a choice; the hours are shown, not the odds. */
export function Inbox(props: { desk?: boolean }) {
  const view = useGame((s) => s.view)
  const planned = useGame((s) => s.plannedHours)
  const answer = useGame((s) => s.answer)
  if (!view) return null
  const stage = view.company.uiStage
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  const open = view.inbox.filter((m) => m.answeredChoiceId === null).length
  return (
    <>
      <h2 className={styles.hand}>
        {open > 0
          ? count('inbox.deskTitle', stage, open)
          : label(props.desk ? 'inbox.deskTitle.zero' : 'inbox.title', stage)}
      </h2>
      {!props.desk && <NeedsYou view={view} free={free} />}
      {view.inbox.length === 0 && (
        <section className={`${styles.card} ${styles.sticky}`}>
          <p className={styles.handText}>{label('inbox.empty', stage)}</p>
        </section>
      )}
      {view.inbox.map((m, i) => (
        <Letter
          key={m.id}
          message={m}
          view={view}
          freeHours={free}
          tilt={TILTS[i % TILTS.length]}
          onAnswer={(choiceId) => answer(m.id, choiceId)}
        />
      ))}
    </>
  )
}

type Need = { text: string; tab: Tab }

/** "Things that need you": a short list that jumps to the tab where each is handled. */
function NeedsYou({ view, free }: { view: PlayerView; free: number }) {
  const setTab = useGame((s) => s.setTab)
  const stage = view.company.uiStage
  const needs = thingsThatNeedYou(view, free, stage)
  if (needs.length === 0) return null
  return (
    <section className={styles.card} aria-label={count('needs.title', stage, needs.length)}>
      <h3 className={styles.caps}>{count('needs.title', stage, needs.length)}</h3>
      {needs.map((n) => (
        <button key={n.text} type="button" className={styles.linkRow} onClick={() => setTab(n.tab)}>
          <span>{n.text}</span>
          <span className={styles.linkTab}>{label(`tab.${n.tab}`, stage)}</span>
        </button>
      ))}
    </section>
  )
}

export function thingsThatNeedYou(view: PlayerView, free: number, stage: UiStage): Need[] {
  const needs: Need[] = []
  const lastWeek = view.inbox.filter(
    (m) => m.answeredChoiceId === null && m.expiresWeek <= view.week,
  ).length
  if (lastWeek > 0) needs.push({ text: count('needs.lastWeek', stage, lastWeek), tab: 'inbox' })
  const overdue = view.invoices.filter((i) => i.status === 'overdue').length
  if (overdue > 0) needs.push({ text: count('needs.overdue', stage, overdue), tab: 'money' })
  const demos = view.leads.filter((l) => l.canBookDemo).length
  if (demos > 0) needs.push({ text: count('needs.demos', stage, demos), tab: 'pipeline' })
  const silent = view.leads.filter((l) => l.stage === 'trial' && l.silent).length
  if (silent > 0) needs.push({ text: count('needs.silent', stage, silent), tab: 'pipeline' })
  if (free > view.founder.maxHoursPerWeek - view.founder.baseHoursPerWeek) {
    const unplanned = free - (view.founder.maxHoursPerWeek - view.founder.baseHoursPerWeek)
    needs.push({ text: count('needs.hours', stage, unplanned), tab: 'plan' })
  }
  return needs
}
