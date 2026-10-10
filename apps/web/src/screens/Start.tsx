import { useState } from 'react'
import { bestRuns, type Bests } from '../bestRuns'
import { formatEuro } from '../format'
import { count, label, type UiStage } from '../labels'
import type { RunRecord } from '../storage'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'
import startStyles from './Start.module.css'

/** The Start screen: the paper with the way in, the tagline on a note, and the best runs. */
export function Start() {
  const hasSave = useGame((s) => s.hasSave)
  const notice = useGame((s) => s.saveNotice)
  const startRun = useGame((s) => s.startRun)
  const continueRun = useGame((s) => s.continueRun)
  const runs = useGame((s) => s.runs)
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

      <p className={`${styles.card} ${styles.sticky} ${startStyles.note}`}>
        {label('app.tagline', stage)}
      </p>

      <BestRuns runs={runs} stage={stage} />
    </main>
  )
}

/** "Your best runs": a dark panel as on the desk mockup. Every seed can be played again. */
function BestRuns({ runs, stage }: { runs: RunRecord[]; stage: UiStage }) {
  const { ordinary, replays } = bestRuns(runs)
  return (
    <section className={startStyles.best} aria-labelledby="best-runs">
      <h2 id="best-runs" className={startStyles.bestTitle}>
        {label('start.best.title', stage)}
      </h2>
      {runs.length === 0 ? (
        <p className={startStyles.empty}>{label('start.best.empty', stage)}</p>
      ) : (
        <Group bests={ordinary} stage={stage} />
      )}
      {replays && (
        <>
          <h3 className={startStyles.bestTitle}>{label('start.best.replays', stage)}</h3>
          <Group bests={replays} stage={stage} />
        </>
      )}
    </section>
  )
}

function Group({ bests, stage }: { bests: Bests; stage: UiStage }) {
  const perMonth = (r: RunRecord) =>
    label('start.best.perMonth', stage, { amount: formatEuro(r.peakRevenueCents) })
  return (
    <dl className={startStyles.rows}>
      <Row name={label('start.best.longest', stage)} run={bests.longest} stage={stage}>
        {bests.longest ? count('unit.weeks', stage, bests.longest.weeks) : '-'}
      </Row>
      <Row name={label('start.best.revenue', stage)} run={bests.revenue} stage={stage}>
        {bests.revenue ? perMonth(bests.revenue) : '-'}
      </Row>
      <Row name={label('start.best.wins', stage)} run={null} stage={stage}>
        {bests.winCount}
      </Row>
      {bests.wins.map((r, i) => (
        <Row
          key={`${r.seed}-${i}`}
          name={label('start.best.winRow', stage)}
          run={r}
          stage={stage}
          indent
        >
          {perMonth(r)}
        </Row>
      ))}
    </dl>
  )
}

function Row(props: {
  name: string
  run: RunRecord | null
  stage: UiStage
  indent?: boolean
  children: React.ReactNode
}) {
  const replay = useGame((s) => s.replaySeed)
  return (
    <div className={`${startStyles.row} ${props.indent ? startStyles.indent : ''}`}>
      <dt>{props.name}</dt>
      <dd className={startStyles.value}>{props.children}</dd>
      {props.run && (
        <dd className={startStyles.seedCell}>
          <button
            type="button"
            className={startStyles.seed}
            aria-label={label('start.best.playAria', props.stage, { seed: props.run.seed })}
            onClick={() => replay(props.run!.seed)}
          >
            {label('start.best.play', props.stage, { seed: props.run.seed })}
          </button>
        </dd>
      )}
    </div>
  )
}
