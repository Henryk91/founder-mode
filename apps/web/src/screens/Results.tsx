import type { PlayerView, ReportEntry, WeekReport } from '@founder-mode/engine'
import { formatEnergy, formatEuro } from '../format'
import { count, label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

function entryText(entry: ReportEntry, view: PlayerView): string {
  const stage = view.company.uiStage
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  switch (entry.kind) {
    case 'savings_transfer':
    case 'founder_draw':
    case 'auto_top_up':
      return label(`results.entry.${entry.kind}`, stage, { amount: formatEuro(entry.amountCents) })
    case 'revenue':
      return count('results.entry.revenue', stage, entry.customers, {
        amount: formatEuro(entry.amountCents),
      })
    case 'feature_shipped':
      return label('results.entry.feature_shipped', stage, {
        name: entry.name,
        bugs: entry.bugsAdded,
      })
    case 'bugs_fixed':
      return count('results.entry.bugs_fixed', stage, entry.count)
    case 'new_leads': {
      const vars = {
        segment: segment(entry.segmentId),
        channel: label(`channel.${entry.channel}`, stage),
      }
      return entry.count === 0
        ? label('results.entry.new_leads.zero', stage, vars)
        : count('results.entry.new_leads', stage, entry.count, vars)
    }
    case 'lead_update':
      return label(`results.entry.${entry.change}`, stage, { name: entry.name })
    case 'customer_churned':
      return label('results.entry.customer_churned', stage, { name: entry.name })
  }
}

/** Week summary after End week, or the ending of a finished run. */
export function Results() {
  const view = useGame((s) => s.view)
  const report = useGame((s) => s.report)
  const dismiss = useGame((s) => s.dismissReport)
  const leave = useGame((s) => s.leaveRun)
  if (!view) return null
  const stage = view.company.uiStage
  const finished = view.status === 'ended'

  return (
    <>
      {report && <WeekSection report={report} view={view} />}
      {finished && view.ending && (
        <section
          className={`${styles.card} ${styles.sticky}`}
          aria-label={label('end.title', stage)}
        >
          <h2 className={styles.title}>{label('end.title', stage)}</h2>
          <p>{label(`end.${view.ending}`, stage, { max: view.maxWeeks })}</p>
          <p>{label('end.stats', stage, { weeks: view.week, customers: view.customers.length })}</p>
        </section>
      )}
      {finished ? (
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={leave}>
          {label('end.backToStart', stage)}
        </button>
      ) : (
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={dismiss}>
          {label('results.continue', stage)}
        </button>
      )}
    </>
  )
}

function WeekSection({ report, view }: { report: WeekReport; view: PlayerView }) {
  const stage = view.company.uiStage
  const l = report.ledger
  const received = l.revenueCents + l.transferCents + l.autoTransferCents
  const paid = l.fixedCostsCents + l.founderDrawCents
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{label('results.title', stage, { week: report.week })}</h2>
      <p className={styles.hint}>
        {label('results.hours', stage, {
          hours: report.plannedHours,
          before: formatEnergy(report.energyBefore),
          after: formatEnergy(report.energyAfter),
        })}
      </p>
      <ul className={styles.list}>
        {report.interviews.map((iv, i) => (
          <li key={`iv${i}`} className={styles.row}>
            <div>
              {label('results.interview', stage, {
                segment: segment(iv.segmentId),
                bucket: iv.bucketName,
              })}
            </div>
            <blockquote className={styles.quote}>{iv.quote}</blockquote>
          </li>
        ))}
        {report.entries.map((e, i) => (
          <li key={`e${i}`} className={styles.row}>
            {entryText(e, view)}
          </li>
        ))}
      </ul>
      {report.interviews.length === 0 && report.entries.length === 0 && (
        <p>{label('results.quiet', stage)}</p>
      )}
      <div className={styles.row}>
        <div className={styles.rowHead}>
          <span>{label('results.in', stage)}</span>
          <span className={`${styles.mono} ${received > 0 ? styles.good : ''}`}>
            {formatEuro(received)}
          </span>
        </div>
        <div className={styles.rowHead}>
          <span>{label('results.out', stage)}</span>
          <span className={styles.mono}>{formatEuro(paid)}</span>
        </div>
        <div className={styles.rowHead}>
          <span>{label('results.cashNow', stage)}</span>
          <span className={styles.mono}>{formatEuro(l.cashEndCents)}</span>
        </div>
      </div>
    </section>
  )
}
