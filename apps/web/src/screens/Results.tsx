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
    case 'invoices_issued':
      return count('results.entry.invoices_issued', stage, entry.count, {
        amount: formatEuro(entry.amountCents),
      })
    case 'invoice_written_off':
      return label('results.entry.invoice_written_off', stage, {
        name: entry.name,
        amount: formatEuro(entry.amountCents),
      })
    case 'ad_spend':
      return label('results.entry.ad_spend', stage, { amount: formatEuro(entry.amountCents) })
    case 'bookkeeping_penalty':
      return label('results.entry.bookkeeping_penalty', stage, {
        fee: formatEuro(entry.feeCents),
        hours: label('unit.hours', stage, { n: entry.lostHours }),
      })
    case 'landing_result':
      return label('results.entry.landing_result', stage, {
        segment: segment(entry.segmentId),
        signups: entry.signups,
        visitors: entry.visitors,
      })
    case 'presale_result':
      return label('results.entry.presale_result', stage, {
        segment: segment(entry.segmentId),
        commits: entry.commits,
        prospects: entry.prospects,
      })
    case 'candidates_ready':
      return count('results.entry.candidates_ready', stage, entry.count, {
        role: label(`team.role.${entry.role}`, stage).toLowerCase(),
      })
    case 'hire_started':
      return label('results.entry.hire_started', stage, { name: entry.name })
    case 'member_let_go':
      return label('results.entry.member_let_go', stage, {
        name: entry.name,
        amount: formatEuro(entry.costCents),
      })
    case 'team_output':
      return label(`results.entry.team_output.${entry.role}`, stage, { hours: entry.hours })
    case 'message_resolved':
      return label(
        entry.expired ? 'results.entry.message_expired' : 'results.entry.message_resolved',
        stage,
        { from: entry.fromName, choice: entry.choiceLabel },
      )
    case 'cash_effect':
      return label(
        entry.amountCents >= 0 ? 'results.entry.cash_effect.in' : 'results.entry.cash_effect.out',
        stage,
        { amount: formatEuro(Math.abs(entry.amountCents)) },
      )
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
  const received = l.revenueCents + l.otherIncomeCents + l.transferCents + l.autoTransferCents
  const paid = l.fixedCostsCents + l.founderDrawCents + l.adSpendCents + l.otherCostsCents
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  const quiet = report.interviews.length === 0 && report.entries.length === 0
  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.title}>{label('results.title', stage, { week: report.week })}</h2>
        <h3 className={styles.hint}>{label('results.account', stage)}</h3>
        {quiet && <p>{label('results.quiet', stage)}</p>}
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
      </section>
      <section className={styles.card}>
        <h2 className={styles.title}>{label('results.numbers', stage)}</h2>
        <p className={styles.hint}>
          {label('results.hours', stage, {
            hours: report.plannedHours,
            before: formatEnergy(report.energyBefore),
            after: formatEnergy(report.energyAfter),
          })}
        </p>
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
        <div className={styles.rowHead}>
          <span>{label('results.living', stage)}</span>
          <span className={styles.mono}>{formatEuro(l.livingCostsCents - l.founderDrawCents)}</span>
        </div>
        <div className={styles.rowHead}>
          <span>{label('results.savingsNow', stage)}</span>
          <span className={styles.mono}>{formatEuro(l.savingsEndCents)}</span>
        </div>
      </section>
    </>
  )
}
