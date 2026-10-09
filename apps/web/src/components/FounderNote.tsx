import { label } from '../labels'
import { fillText } from '../texts'
import { useGame } from '../useGame'
import styles from './ui.module.css'

/** The founder's note of weeks 1 to 4. It describes the situation and can be dismissed. */
export function FounderNote() {
  const view = useGame((s) => s.view)
  const dismissed = useGame((s) => s.dismissedNotes)
  const dismiss = useGame((s) => s.dismissNote)
  const note = view?.guidance.founderNote
  if (!view || !note || dismissed.includes(note.id)) return null
  const stage = view.company.uiStage
  return (
    <section className={`${styles.card} ${styles.sticky}`} aria-label={label('note.title', stage)}>
      <h2 className={styles.title}>{label('note.title', stage)}</h2>
      <p>{fillText(note.template, note.values)}</p>
      <button type="button" className={styles.button} onClick={() => dismiss(note.id)}>
        {label('note.dismiss', stage)}
      </button>
    </section>
  )
}
