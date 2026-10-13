import { label } from '../labels'
import { Pipeline } from './Pipeline'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

/**
 * The occupancy calendar (tourism, step 4): replaces the pipeline. The next twelve weeks per
 * product, units booked against what it can sell, last year's figure in the second year, the
 * forecast and the reviews.
 */
export function Calendar() {
  const view = useGame((s) => s.view)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = view.company.uiStage
  return (
    <>
      <section className={styles.card} aria-label={label('tour.calendar', stage)}>
        <h2 className={styles.title}>{label('tour.calendar', stage)}</h2>
        <p>
          {label(`tour.forecast.${b.forecast}`, stage)}{' '}
          {b.rating === null
            ? label('tour.rating.none', stage)
            : label('tour.rating', stage, { rating: b.rating.toFixed(1), reviews: b.reviews })}
        </p>
        {b.calendar.length === 0 && (
          <p className={styles.hint}>{label('tour.calendar.empty', stage)}</p>
        )}
        {b.calendar.map((c) => {
          const product = b.products.find((p) => p.id === c.productId)
          return (
            <div key={c.productId}>
              <h3 className={styles.title}>{product?.name ?? c.productId}</h3>
              <ul className={styles.list}>
                {c.cells.map((cell) => (
                  <li key={cell.week} className={styles.rowHead}>
                    <span>{label('tour.calendar.week', stage, { week: cell.week })}</span>
                    <span className={styles.mono}>
                      {cell.capacity === 0
                        ? label('tour.calendar.closed', stage)
                        : label(
                            cell.lastYear === null
                              ? 'tour.calendar.cell'
                              : 'tour.calendar.cellLast',
                            stage,
                            {
                              booked: cell.booked,
                              capacity: cell.capacity,
                              last: cell.lastYear ?? 0,
                            },
                          )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
      <section className={styles.card} aria-label={label('tour.demand', stage)}>
        <h2 className={styles.title}>{label('tour.demand', stage)}</h2>
        {b.segments.map((s) => (
          <div key={s.id} className={styles.rowHead}>
            <span>{view.segments.find((x) => x.id === s.id)?.name ?? s.id}</span>
            <span className={styles.mono}>
              {label('tour.demand.line', stage, {
                away: s.turnedAwayLast4,
                repeat: s.repeatGuests,
              })}
            </span>
          </div>
        ))}
      </section>
    </>
  )
}

/** The pipeline tab: the calendar in a tourism scenario, else the corkboard. */
export function PipelineOrCalendar() {
  const tourism = useGame((s) => s.view?.bookings != null)
  return tourism ? <Calendar /> : <Pipeline />
}
