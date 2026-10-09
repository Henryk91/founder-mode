import { useState } from 'react'
import { label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'
import startStyles from './Start.module.css'

export function Start() {
  const hasSave = useGame((s) => s.hasSave)
  const notice = useGame((s) => s.saveNotice)
  const startRun = useGame((s) => s.startRun)
  const continueRun = useGame((s) => s.continueRun)
  const [seed, setSeed] = useState('')
  const stage = 'scrappy'

  return (
    <main className={startStyles.start}>
      {notice && (
        <div className={`${styles.card} ${styles.sticky}`} role="status">
          <p>{label(`start.notice.${notice}`, stage)}</p>
        </div>
      )}

      <div className={`${styles.card} ${startStyles.paper}`}>
        <h1 className={startStyles.title}>{label('app.title', stage)}</h1>
        <p className={startStyles.tagline}>{label('app.tagline', stage)}</p>
        {hasSave && (
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={continueRun}
          >
            {label('start.continue', stage)}
          </button>
        )}
        <button
          type="button"
          className={`${styles.button} ${hasSave ? '' : styles.primary}`}
          onClick={() => startRun(seed)}
        >
          {label('start.newRun', stage)}
        </button>
        <label className={styles.field}>
          <span>{label('start.seedLabel', stage)}</span>
          <input
            className={styles.input}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className={styles.hint}>{label('start.seedHint', stage)}</span>
        </label>
      </div>
    </main>
  )
}
