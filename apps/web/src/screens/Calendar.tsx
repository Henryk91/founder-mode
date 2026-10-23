import type { PlayerView } from '@founder-mode/engine'
import { label, stageOf, voiceOf } from '../labels'
import { Pipeline } from './Pipeline'
import { ClassTimetable } from '../components/Memberships'
import { LeisureCalendar } from '../components/Leisure'
import { cruiseWeekText, forecastLine } from '../components/TourismPlan'
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
      <ClassTimetable />
      {b.leisure && <LeisureCalendar view={view} />}
      {!b.leisure && (
        <section className={styles.card} aria-label={label('tour.calendar', stage)}>
          <h2 className={styles.title}>{label('tour.calendar', stage)}</h2>
          <p>
            {/* Plan 4: wind and sea by the half day instead of one weather. */}
            {b.leisure
              ? ''
              : b.abroad
                ? b.abroad.slots
                    .map((slot) =>
                      label('tour.forecast.slot', stage, {
                        slot: slot.name,
                        states: forecastLine(
                          b.abroad!.states,
                          b.abroad!.forecastCounts[slot.id] ?? {},
                        ),
                      }),
                    )
                    .join('. ') + '.'
                : label(`tour.forecast.${b.forecast}`, stage)}{' '}
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
      )}
      {b.cruise && (
        <section className={styles.card} aria-label={label('cruise.calendar', stage)}>
          <h2 className={styles.title}>{label('cruise.calendar', stage)}</h2>
          <ul className={styles.list}>
            {b.cruise.weeks.map((w) => (
              <li key={w.week}>{cruiseWeekText(w, stage)}</li>
            ))}
          </ul>
        </section>
      )}
      {b.abroad && b.products.some((p) => p.course) && (
        <section className={styles.card} aria-label={label('tour.ladder.title', stage)}>
          <h2 className={styles.title}>{label('tour.ladder.title', stage)}</h2>
          {ladderSteps(view).length > 2 && (
            <p>{label('tour.ladderLine', stage, { steps: ladderSteps(view).join(', then ') })}</p>
          )}
          <p>
            {b.abroad.ladderThisYear.students === 0 &&
            b.abroad.ladderThisYear.returnedDirect + b.abroad.ladderThisYear.returnedPlatform === 0
              ? label('tour.ladder.none', stage)
              : label('tour.ladder', stage, {
                  students: b.abroad.ladderThisYear.students,
                  same: b.abroad.ladderThisYear.sameStay,
                  back:
                    b.abroad.ladderThisYear.returnedDirect +
                    b.abroad.ladderThisYear.returnedPlatform,
                  direct: b.abroad.ladderThisYear.returnedDirect,
                })}
          </p>
        </section>
      )}
      <section className={styles.card} aria-label={label('tour.demand', stage)}>
        <h2 className={styles.title}>{label('tour.demand', stage)}</h2>
        {/* A two-line row, the group's name then its figures, so a phone never squeezes them. */}
        {b.segments.map((s) => (
          <div key={s.id} className={styles.twoLine}>
            <span className={styles.twoLineName}>
              {view.segments.find((x) => x.id === s.id)?.name ?? s.id}
            </span>
            <span>
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
 * Plan 3, the established stage: occupancy as a heat grid, as in the mockup, one per product: a
 * cell per week with the units booked in it and three shades of the accent by the share booked,
 * and a small legend. The bookings model counts weeks, not days, so the cells are weeks
 * (docs/decisions.md).
 */
function HeatGrid({ view }: { view: PlayerView }) {
  const stage = voiceOf(view)
  const b = view.bookings!
  // Only what has room of its own (a whole-house booking shares the rooms' pool).
  const pools = b.calendar.filter(
    (c) => (b.products.find((p) => p.id === c.productId)?.capacity ?? 0) > 0,
  )
  const shown = pools.length > 0 ? pools : b.calendar
  return (
    <>
      {shown.map((c) => {
        const capacity = Math.max(0, ...c.cells.map((x) => x.capacity))
        const closed = c.cells.some((x) => x.capacity === 0)
        return (
          <div key={c.productId} className={styles.heatProduct}>
            <h3 className={styles.heatName}>
              {b.products.find((p) => p.id === c.productId)?.name ?? c.productId}
            </h3>
            <p className={styles.hint}>
              {label(closed ? 'tour.heat.subClosed' : 'tour.heat.sub', stage, {
                n: c.cells.length,
                capacity,
              })}
            </p>
            <ol className={styles.heatWeeks}>
              {c.cells.map((cell) => (
                <li key={cell.week} className={`${styles.heatCell} ${shade(cell)}`}>
                  <span aria-hidden="true" className={styles.heatWeek}>
                    {label('coming.week', stage, { week: cell.week })}
                  </span>
                  <span aria-hidden="true" className={styles.heatNumber}>
                    {cell.capacity > 0 ? cell.booked : label('tour.heat.shut', stage)}
                  </span>
                  <span className="visually-hidden">
                    {cell.capacity > 0
                      ? label('tour.heat.cellSpoken', stage, {
                          week: cell.week,
                          booked: cell.booked,
                          capacity: cell.capacity,
                        })
                      : label('tour.heat.closedSpoken', stage, { week: cell.week })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
      <p className={styles.heatLegend}>
        <span>{label('tour.heat.legend', stage)}</span>
        {(['low', 'half', 'full'] as const).map((k) => (
          <span key={k} className={styles.heatKey}>
            <span
              aria-hidden="true"
              className={`${styles.heatSwatch} ${
                k === 'low' ? styles.heatLow : k === 'half' ? styles.heatHalf : styles.heatFull
              }`}
            />
            {label(`tour.heat.${k}`, stage)}
          </span>
        ))}
      </p>
    </>
  )
}

/** A week's shade: closed, under 40% booked, under 85%, or nearly full. */
function shade(cell: { booked: number; capacity: number }): string {
  if (cell.capacity === 0) return styles.heatClosed!
  const share = cell.booked / cell.capacity
  return share >= 0.85 ? styles.heatFull! : share >= 0.4 ? styles.heatHalf! : styles.heatLow!
}

/** The pipeline tab: the calendar in a tourism scenario, else the corkboard. */
export function PipelineOrCalendar() {
  const tourism = useGame((s) => s.view?.bookings != null)
  return tourism ? <Calendar /> : <Pipeline />
}

/**
 * Plan 4: the ladder of courses, in order: the courses anyone can book (cheapest first), then
 * what the last one's level opens, and so on. Empty where no product needs a level a course
 * reaches (no ladder to speak of).
 */
function ladderSteps(view: PlayerView): string[] {
  const products = view.bookings?.products ?? []
  const base = products
    .filter((p) => p.course && p.needsLevel === null)
    .sort((a, b) => a.priceFactor - b.priceFactor)
  const out = base.map((p) => p.name)
  let level = base.at(-1)?.course ?? null
  let climbed = false
  for (let i = 0; level !== null && i < 6; i++) {
    const opens = products.filter((p) => p.needsLevel === level)
    const course = opens.find((p) => p.course)
    if (!course) {
      out.push(...opens.map((p) => p.name))
      climbed ||= opens.length > 0
      break
    }
    out.push(course.name)
    climbed = true
    level = course.course
  }
  return climbed ? out : []
}
