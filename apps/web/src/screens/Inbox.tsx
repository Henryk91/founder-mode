import { label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

/** Messages from customers, leads and everyone else. Tap a choice; the hours are shown, not the odds. */
export function Inbox() {
  const view = useGame((s) => s.view)
  const planned = useGame((s) => s.plannedHours)
  const answer = useGame((s) => s.answer)
  if (!view) return null
  const stage = view.company.uiStage
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  return (
    <>
      <h2 className={styles.title} style={{ color: 'var(--on-dark)' }}>
        {label('inbox.title', stage)}
      </h2>
      {view.inbox.length === 0 && (
        <section className={`${styles.card} ${styles.sticky}`}>
          <p>{label('inbox.empty', stage)}</p>
        </section>
      )}
      {view.inbox.map((m) => {
        const answered = m.answeredChoiceId !== null
        const chosen = m.choices.find((c) => c.id === m.answeredChoiceId)
        return (
          <section key={m.id} className={styles.card}>
            <div className={styles.rowHead}>
              <span>
                {m.fromName === m.fromRole
                  ? m.fromName
                  : label('inbox.fromRole', stage, { name: m.fromName, role: m.fromRole })}
              </span>
              <span className={styles.hint}>{label('market.week', stage, { week: m.week })}</span>
            </div>
            <p style={{ margin: 0 }}>{m.text}</p>
            {answered && chosen ? (
              <p className={styles.good}>
                {label('inbox.answered', stage, { choice: chosen.label })}
              </p>
            ) : (
              <>
                <p className={styles.hint}>
                  {label(
                    m.expiresWeek <= view.week ? 'inbox.expiresThis' : 'inbox.expires',
                    stage,
                    {
                      week: m.expiresWeek,
                    },
                  )}
                </p>
                {m.choices.map((c) => {
                  const fits = c.hours <= free
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.button}
                      disabled={!fits}
                      onClick={() => answer(m.id, c.id)}
                    >
                      {c.label} (
                      {c.hours === 0
                        ? label('inbox.free', stage)
                        : label('unit.hours', stage, { n: c.hours })}
                      )
                    </button>
                  )
                })}
                {m.choices.some((c) => c.hours > free) && (
                  <p className={styles.hint}>{label('inbox.noRoom', stage)}</p>
                )}
              </>
            )}
          </section>
        )
      })}
    </>
  )
}
