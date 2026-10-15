import type { PlayerView, WeekPlan } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type Voice, voiceOf } from '../labels'
import { useGame } from '../useGame'
import { Choices, HintLine, Row, Writing } from './Ruled'
import { Scene } from './Scene'
import styles from './ui.module.css'

/** Plan 3: whether the run has office stages to move between (long mode). */
export const hasOffice = (view: PlayerView) => view.office.noticeWeeks !== null

/** "stage 3 of 5". */
export const stageOf = (view: PlayerView, stage: Voice) =>
  label('office.stageOf', stage, { n: view.office.stage, of: view.office.stages })

/** One line for the closed Office section. */
export function officeSummary(view: PlayerView, p: WeekPlan, stage: Voice): string {
  const o = view.office
  if (p.office?.notice) return label('plan.sum.officeNoticeNow', stage)
  if (o.move) return label('plan.sum.officeMoving', stage, { week: o.move.readyWeek })
  if (o.notice) return label('plan.sum.officeNotice', stage, { week: o.notice.endWeek })
  return label('plan.sum.office', stage, { name: o.name, stage: stageOf(view, stage) })
}

/**
 * The facts of where the company works, as rows: rent, desks or how full the place is, a move or
 * notice under way, and a stage the bank paid for. Shared by the Plan's Office section and the
 * Office card on the money tab.
 */
export function OfficeFacts({ view }: { view: PlayerView }) {
  const stage = voiceOf(view)
  const o = view.office
  return (
    <>
      <Row
        label={label('office.rent', stage)}
        note={
          o.rentCents > 0
            ? label('office.rentValue', stage, { amount: formatEuro(o.rentCents) })
            : label('office.rentNone', stage)
        }
      />
      {o.desks !== null && (
        <Row
          label={label('office.desks', stage)}
          note={label('office.desksValue', stage, { used: o.people, desks: o.desks })}
        />
      )}
      {view.bookings && (
        <>
          <Row
            label={label('office.occupancy', stage)}
            note={label('office.occupancyValue', stage, { pct: o.occupancyPct })}
          />
          <Row
            label={label('office.turnedAway', stage)}
            note={label('office.turnedAwayValue', stage, { n: o.turnedAwayWeeks })}
          />
        </>
      )}
      {o.desks !== null && o.desksFree <= 0 && (
        <Writing warn>{label('office.desksFull', stage)}</Writing>
      )}
      {o.move && (
        <Writing>
          {label('office.moving', stage, { name: o.move.name, week: o.move.readyWeek })}
        </Writing>
      )}
      {o.notice && (
        <Writing>
          {label('office.notice', stage, {
            week: o.notice.endWeek,
            back: o.notice.backTo,
            deposit: formatEuro(o.notice.depositCents),
          })}
        </Writing>
      )}
      {o.prepaid.length > 0 && (
        <Writing>{label('office.prepaid', stage, { names: o.prepaid.join(', ') })}</Writing>
      )}
    </>
  )
}

/** The Plan's Office section (plan 3): the facts, and notice to leave a stage. */
export function OfficePlan() {
  const view = useGame((s) => s.view)
  const notice = useGame((s) => s.plan.office?.notice ?? false)
  const setNotice = useGame((s) => s.setOfficeNotice)
  if (!view || !hasOffice(view)) return null
  const stage = voiceOf(view)
  const o = view.office
  return (
    <>
      <Row label={o.name} note={stageOf(view, stage)} />
      <OfficeFacts view={view} />
      {o.canGiveNotice && (
        <>
          <Choices>
            <button
              type="button"
              aria-pressed={notice}
              className={`${styles.chip} ${notice ? styles.chipOn : ''}`}
              onClick={() => setNotice(!notice)}
            >
              {notice
                ? label('office.noticeBooked', stage)
                : label('office.giveNotice', stage, { weeks: o.noticeWeeks ?? 0 })}
            </button>
          </Choices>
          <Writing>{label('office.noticeLine', stage)}</Writing>
        </>
      )}
      {o.stage < o.stages && <Writing>{label('office.offers', stage)}</Writing>}
      <HintLine term="office" hint={label('plan.hint.office', stage)} />
    </>
  )
}

/** The Office card on the money tab (plan 3): the drawing, the stage and its facts as numbers. */
export function OfficeCard() {
  const view = useGame((s) => s.view)
  if (!view || !hasOffice(view)) return null
  const stage = voiceOf(view)
  const o = view.office
  const stat = (name: string, value: string) => (
    <div className={styles.rowHead}>
      <span>{name}</span>
      <span className={styles.mono}>{value}</span>
    </div>
  )
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{label('office.title', stage)}</h2>
      <Scene compact />
      {stat(o.name, stageOf(view, stage))}
      {stat(
        label('office.rent', stage),
        o.rentCents > 0
          ? label('office.rentValue', stage, { amount: formatEuro(o.rentCents) })
          : label('office.rentNone', stage),
      )}
      {o.desks !== null &&
        stat(
          label('office.desks', stage),
          label('office.desksValue', stage, { used: o.people, desks: o.desks }),
        )}
      {view.bookings &&
        stat(
          label('office.occupancy', stage),
          label('office.occupancyValue', stage, { pct: o.occupancyPct }),
        )}
      {o.move && (
        <p className={styles.hint}>
          {label('office.moving', stage, { name: o.move.name, week: o.move.readyWeek })}
        </p>
      )}
      {o.notice && (
        <p className={styles.hint}>
          {label('office.notice', stage, {
            week: o.notice.endWeek,
            back: o.notice.backTo,
            deposit: formatEuro(o.notice.depositCents),
          })}
        </p>
      )}
      {o.canGiveNotice && <p className={styles.hint}>{label('office.noticeLine', stage)}</p>}
    </section>
  )
}
