import type { BookingsPlan, LeisureView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, voiceOf } from '../labels'
import { useGame } from '../useGame'
import { Choices, Market, SubHeading, Writing } from './Ruled'
import { Stepper } from './Stepper'
import ui from './ui.module.css'

/** The same public costs as the engine uses, without reading scenario or hidden state. */
export function leisurePlanHours(view: PlayerView, plan: BookingsPlan | undefined): number {
  const l = view.bookings?.leisure
  if (!l) return 0
  return l.freshness.reduce(
    (sum, f) =>
      sum +
      (plan?.leisure?.settingHours?.[f.productId] ?? f.settingHours) +
      (plan?.leisure?.refresh?.includes(f.productId) ? f.resetHours : 0),
    0,
  )
}

/** Refresh work belongs in the notebook's building section. */
export function LeisureUpkeep() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan.bookings)
  const planned = useGame((s) => s.plannedHours)
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings?.leisure) return null
  const l = view.bookings.leisure
  const stage = voiceOf(view)
  const draft = plan?.leisure ?? {}
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  return (
    <>
      {l.space && (
        <Writing>{label('leisure.space', stage, { used: l.space.used, max: l.space.max })}</Writing>
      )}
      {l.builds
        .filter((b) => b.started && !b.complete)
        .map((b) => (
          <Writing key={b.productId}>
            {label(b.readyWeek === null ? 'leisure.buildPrep' : 'leisure.buildProgress', stage, {
              name: b.name,
              week: b.readyWeek ?? view.week,
              weeks: b.weeks,
              amount: formatEuro(b.costCents),
            })}
          </Writing>
        ))}
      {l.freshness
        .filter((f) => view.product.features.some((p) => p.id === f.productId && p.shipped))
        .map((f) => {
          const refresh = draft.refresh ?? []
          const chosen = refresh.includes(f.productId)
          const setting = draft.settingHours?.[f.productId] ?? f.settingHours
          return (
            <div key={f.productId}>
              <SubHeading>{f.name}</SubHeading>
              <Writing>
                {label('leisure.freshnessLine', stage, {
                  word: label(`leisure.freshness.${f.word}`, stage),
                  groups: f.localGroups,
                })}
              </Writing>
              {f.refreshingUntil !== null ? (
                <Writing>{label('leisure.reopening', stage, { week: f.refreshingUntil })}</Writing>
              ) : f.refreshWeeks > 0 ? (
                <>
                  <Writing>
                    {label('leisure.refreshCost', stage, {
                      hours: f.resetHours,
                      amount: formatEuro(f.refreshCents),
                      weeks: f.refreshWeeks,
                    })}
                  </Writing>
                  <Choices>
                    <button
                      type="button"
                      className={`${ui.chip} ${chosen ? ui.chipOn : ''}`}
                      aria-pressed={chosen}
                      disabled={
                        !chosen && (free < f.resetHours || view.company.cashCents < f.refreshCents)
                      }
                      onClick={() =>
                        set({
                          leisure: {
                            ...draft,
                            refresh: chosen
                              ? refresh.filter((id) => id !== f.productId)
                              : [...refresh, f.productId],
                          },
                        })
                      }
                    >
                      {label(chosen ? 'leisure.refreshCancel' : 'leisure.refresh', stage)}
                    </button>
                  </Choices>
                </>
              ) : (
                <Market
                  label={label('leisure.setting', stage)}
                  note={label('leisure.settingProgress', stage, {
                    done: f.settingProgressHours,
                    total: f.resetHours,
                  })}
                  control={
                    <Stepper
                      stage={stage}
                      value={setting}
                      max={setting + free}
                      what={label('leisure.settingWhat', stage, { name: f.name })}
                      onChange={(n) =>
                        set({
                          leisure: {
                            ...draft,
                            settingHours: { ...draft.settingHours, [f.productId]: n },
                          },
                        })
                      }
                    />
                  }
                />
              )}
            </div>
          )
        })}
    </>
  )
}

/** Actual slot observations and upcoming reservations, shown in every visual stage. */
export function LeisureCalendar({ view }: { view: PlayerView }) {
  const l = view.bookings?.leisure
  if (!l) return null
  const stage = voiceOf(view)
  const product = (id: string) => view.product.features.find((f) => f.id === id)?.name ?? id
  return (
    <section className={ui.card} aria-label={label('leisure.calendar', stage)}>
      <h2 className={ui.title}>{label('leisure.calendar', stage)}</h2>
      <p>
        {label(l.openingWeek === null ? 'leisure.beforeOpening' : 'leisure.opened', stage, {
          week: l.openingWeek ?? 0,
        })}
      </p>
      <p>
        {view.bookings!.rating === null
          ? label('tour.rating.none', stage)
          : label('tour.rating', stage, {
              rating: view.bookings!.rating.toFixed(1),
              reviews: view.bookings!.reviews,
            })}
      </p>
      {Object.entries(l.minimumAreas).map(([id, n]) => (
        <p key={id}>
          {label('leisure.minimumAreas', stage, {
            name: view.segments.find((s) => s.id === id)?.name ?? id,
            n,
          })}
        </p>
      ))}
      {l.slots.map((slot) => {
        const visits = l.load.filter((x) => x.slotId === slot.id)
        return (
          <div key={slot.id}>
            <h3 className={ui.title}>{slot.name}</h3>
            <p>{label('leisure.refused', stage, { n: l.turnedAwayBySlot[slot.id] ?? 0 })}</p>
            {visits.map((v) => (
              <p key={v.productId}>
                {label('leisure.slotLoad', stage, {
                  name: product(v.productId),
                  visits: v.visits,
                  word: label(`leisure.load.${v.load}`, stage),
                })}
              </p>
            ))}
            <details>
              <summary>{label('leisure.futureDates', stage)}</summary>
              <ul className={ui.list}>
                {l.slotCalendar
                  .filter((c) => c.slotId === slot.id)
                  .map((c) => (
                    <li key={`${c.productId}-${c.week}`}>
                      {label('leisure.calendarCell', stage, {
                        name: product(c.productId),
                        week: c.week,
                        booked: c.booked,
                        held: c.held,
                        free: Math.max(0, c.capacity - c.booked - c.held),
                      })}
                    </li>
                  ))}
              </ul>
            </details>
          </div>
        )
      })}
      {l.freshness
        .filter((f) => f.openedWeek !== null)
        .map((f) => (
          <p key={f.productId}>
            {label('leisure.roomLife', stage, {
              name: f.name,
              word: label(`leisure.freshness.${f.word}`, stage),
              served: f.served,
              refreshes: f.refreshes,
            })}
          </p>
        ))}
    </section>
  )
}

/** New sales can be priced and opened separately without cancelling accepted dates. */
export function LeisurePrices() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan.bookings)
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings?.leisure?.slotPrices) return null
  const l = view.bookings.leisure
  const stage = voiceOf(view)
  const draft = plan?.leisure ?? {}
  return (
    <>
      <Writing>{label('leisure.salesHint', stage)}</Writing>
      {Object.entries(l.slotPrices!).map(([segment, prices]) => {
        const name = view.segments.find((s) => s.id === segment)?.name ?? segment
        const open =
          draft.salesSlots?.[segment] ?? l.salesSlots?.[segment] ?? l.slots.map((s) => s.id)
        return (
          <div key={segment}>
            <SubHeading>{name}</SubHeading>
            {l.slots.map((slot) => {
              const now = draft.slotPrices?.[segment]?.[slot.id] ?? prices[slot.id]
              if (!now) return null
              const enabled = open.includes(slot.id)
              return (
                <div key={slot.id}>
                  <Choices>
                    <button
                      type="button"
                      className={`${ui.chip} ${enabled ? ui.chipOn : ''}`}
                      aria-pressed={enabled}
                      onClick={() =>
                        set({
                          leisure: {
                            ...draft,
                            salesSlots: {
                              ...draft.salesSlots,
                              [segment]: enabled
                                ? open.filter((id) => id !== slot.id)
                                : [...open, slot.id],
                            },
                          },
                        })
                      }
                    >
                      {label('leisure.salesSlot', stage, { name: slot.name })}
                    </button>
                  </Choices>
                  {(['peak', 'off'] as const).map((season) => (
                    <Market
                      key={season}
                      label={label(`leisure.price.${season}`, stage)}
                      control={
                        <Stepper
                          stage={stage}
                          value={now[season]}
                          min={100}
                          max={Math.max(now[season], prices[slot.id]![season] * 3)}
                          step={500}
                          names={{ minus: 'tour.prices.minus', plus: 'tour.prices.plus' }}
                          display={formatEuro(now[season])}
                          formatStep={formatEuro}
                          what={label('leisure.priceWhat', stage, {
                            segment: name,
                            slot: slot.name,
                            season: label(`leisure.price.${season}`, stage),
                          })}
                          onChange={(n) =>
                            set({
                              leisure: {
                                ...draft,
                                slotPrices: {
                                  ...draft.slotPrices,
                                  [segment]: {
                                    ...draft.slotPrices?.[segment],
                                    [slot.id]: { ...now, [season]: n },
                                  },
                                },
                              },
                            })
                          }
                        />
                      }
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

/** Facts for the end of a run, with the same no-probability boundary as the calendar. */
export function LeisureSummary({ leisure: l, view }: { leisure: LeisureView; view: PlayerView }) {
  const stage = voiceOf(view)
  return (
    <section className={ui.card}>
      <h2 className={ui.title}>{label('leisure.lessons', stage)}</h2>
      {l.slots.map((slot) => {
        const rows = l.history.flatMap((w) => w.slots.filter((s) => s.slotId === slot.id))
        return (
          <p key={slot.id}>
            {label('leisure.slotHistory', stage, {
              name: slot.name,
              packed: rows.filter((s) => s.load === 'packed').length,
              quiet: rows.filter((s) => s.load === 'quiet').length,
            })}
          </p>
        )
      })}
      {l.signed > 0 && (
        <p>{label('leisure.membersHistory', stage, { retained: l.retained, signed: l.signed })}</p>
      )}
      {l.aggregator && (
        <p>
          {label('leisure.aggregatorHistory', stage, {
            name: l.aggregator.name,
            amount: formatEuro(l.aggregator.payoutCents),
            cancellations: l.aggregator.cancellations,
          })}
        </p>
      )}
      {l.holds && (
        <p>
          {label('leisure.holdsHistory', stage, {
            granted: l.holds.granted,
            converted: l.holds.converted,
            lost: l.holds.lateReleased,
          })}
        </p>
      )}
      {l.freshness
        .filter((f) => f.openedWeek !== null)
        .map((f) => (
          <p key={f.productId}>
            {label('leisure.lifeHistory', stage, {
              name: f.name,
              served: f.served,
              refreshes: f.refreshes,
              tired: f.weeksTired,
              closed: f.closedWeeks,
            })}
          </p>
        ))}
    </section>
  )
}
