import { label, type LabelKey } from '../labels'
import { fillText } from '../texts'
import { useGame } from '../useGame'
import styles from './ui.module.css'

const WEEK_STEPS = [
  'help.week.1',
  'help.week.2',
  'help.week.3',
  'help.week.4',
  'help.week.5',
] as const satisfies readonly LabelKey[]

/** Reopens the goal and a short account of how a week works. */
export function Help() {
  const view = useGame((s) => s.view)
  const close = useGame((s) => s.closeHelp)
  if (!view) return null
  const stage = view.company.uiStage
  const goal = view.guidance.intro.find((c) => c.id === 'goal')

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.title}>{label('help.goal', stage)}</h2>
        {goal && (
          <p>
            {fillText(goal.body, {
              maxWeeks: view.maxWeeks,
              cash: view.company.cashCents,
              savings: view.founder.savingsCents,
              living: view.founder.livingCostCentsPerWeek,
              livingMonth: view.founder.livingCostCentsPerMonth,
            })}
          </p>
        )}
      </section>
      <section className={styles.card}>
        <h2 className={styles.title}>{label('help.weekTitle', stage)}</h2>
        <ol className={styles.list}>
          {WEEK_STEPS.map((key) => (
            <li key={key}>
              {label(key, stage, {
                market: label('tab.market', stage),
                pipeline: label('tab.pipeline', stage),
              })}
            </li>
          ))}
        </ol>
      </section>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={close}>
        {label('help.close', stage)}
      </button>
    </>
  )
}
