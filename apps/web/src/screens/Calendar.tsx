import type { PlayerView } from '@founder-mode/engine'
import { label, stageOf, voiceOf } from '../labels'
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
  const stage = voiceOf(view)
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
        {stageOf(stage) === 'established' && b.calendar.length > 0 && <HeatGrid view={view} />}
        {stageOf(stage) !== 'established' &&
          b.calendar.map((c) => {
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

/**
 * Plan 3, the established stage: occupancy as a heat grid, a row per week and a column per product,
 * the units booked in each cell and three shades of the accent by the share booked. The bookings
 * model counts weeks, not days, so the grid is by week and product (docs/decisions.md).
 */
function HeatGrid({ view }: { view: PlayerView }) {
  const stage = voiceOf(view)
  const b = view.bookings!
  // Only what has room of its own (a whole-house booking shares the rooms' pool).
  const pools = b.calendar.filter(
    (c) => (b.products.find((p) => p.id === c.productId)?.capacity ?? 0) > 0,
  )
  const weeks = (pools[0] ?? b.calendar[0]!).cells.map((c) => c.week).slice(0, 8)
  const shade = (booked: number, capacity: number) =>
    capacity === 0
      ? styles.heatClosed
      : booked / capacity >= 0.85
        ? styles.heatFull
        : booked / capacity >= 0.4
          ? styles.heatHalf
          : styles.heatLow
  return (
    <table className={styles.heat}>
      <caption className="visually-hidden">{label('tour.heat.caption', stage)}</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">{label('tour.heat.week', stage)}</span>
          </th>
          {pools.map((c) => (
            <th key={c.productId} scope="col">
              {b.products.find((p) => p.id === c.productId)?.name ?? c.productId}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week}>
            <th scope="row">{label('coming.week', stage, { week })}</th>
            {pools.map((c) => {
              const cell = c.cells.find((x) => x.week === week)
              return (
                <td key={c.productId} className={shade(cell?.booked ?? 0, cell?.capacity ?? 0)}>
                  {cell && cell.capacity > 0
                    ? label('tour.heat.cell', stage, {
                        booked: cell.booked,
                        capacity: cell.capacity,
                      })
                    : label('tour.calendar.closed', stage)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** The pipeline tab: the calendar in a tourism scenario, else the corkboard. */
export function PipelineOrCalendar() {
  const tourism = useGame((s) => s.view?.bookings != null)
  return tourism ? <Calendar /> : <Pipeline />
}
