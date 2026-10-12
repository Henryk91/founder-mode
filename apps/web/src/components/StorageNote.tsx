import { label } from '../labels'
import { useGame } from '../useGame'
import styles from './ui.module.css'

/**
 * In a run: the browser is not keeping the save, or the best runs. Said once, dismissible. After a
 * run (`finished`) it also says when the old best runs could not be read.
 */
export function StorageNote(props: { finished?: boolean }) {
  const storage = useGame((s) => s.storageNotice)
  const runs = useGame((s) => s.runsNotice)
  const dismiss = useGame((s) => s.dismissStorageNotice)
  const stage = useGame((s) => s.view?.company.uiStage ?? 'scrappy')
  const runsText = runs === 'unsaved' || (props.finished && runs === 'unreadable')
  if (!storage && !runsText) return null
  return (
    <section className={`${styles.card} ${styles.sticky} ${styles.notice}`} role="status">
      {storage && <p>{label(`storage.notice.${storage}`, stage)}</p>}
      {runsText && runs && <p>{label(`runs.notice.${runs}`, stage)}</p>}
      {storage && (
        <button type="button" className={styles.button} onClick={dismiss}>
          {label('storage.notice.dismiss', stage)}
        </button>
      )}
    </section>
  )
}
