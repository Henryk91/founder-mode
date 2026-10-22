import type { LeisureView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, voiceOf } from '../labels'
import { useGame } from '../useGame'
import { Choices, Market, SubHeading, Writing } from './Ruled'
import { Stepper } from './Stepper'
import ui from './ui.module.css'

export function MembershipPrices() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan.bookings)
  const set = useGame((s) => s.setBookings)
  const l = view?.bookings?.leisure
  if (!view || !l?.members.length) return null
  const stage = voiceOf(view),
    draft = plan?.leisure ?? {}
  return (
    <>
      <SubHeading>{label('leisure.membersTitle', stage)}</SubHeading>
      <Writing>{label('leisure.offerPrices', stage)}</Writing>
      {l.members.map((offer) => {
        const now = draft.offers?.[offer.offerId] ?? offer
        const ready = view.product.features.some((f) => f.id === offer.offerId && f.shipped)
        return (
          <div key={offer.offerId}>
            <SubHeading>{offer.name}</SubHeading>
            <Writing>
              {label('leisure.offerTerms', stage, {
                term: offer.termWeeks,
                notice: offer.noticeWeeks,
                slots: offer.slots
                  .map((id) => l.slots.find((s) => s.id === id)?.name ?? id)
                  .join(', '),
              })}
            </Writing>
            {offer.visits !== undefined && (
              <Writing>
                {label('leisure.offerPack', stage, {
                  visits: offer.visits,
                  weeks: offer.validWeeks ?? 0,
                })}
              </Writing>
            )}
            {offer.products && (
              <Writing>
                {label('leisure.offerProducts', stage, {
                  products: offer.products
                    .map((id) => view.product.features.find((f) => f.id === id)?.name ?? id)
                    .join(', '),
                })}
              </Writing>
            )}
            {!ready && <Writing>{label('leisure.offerPrepare', stage)}</Writing>}
            <Choices>
              <button
                type="button"
                className={`${ui.chip} ${now.enabled ? ui.chipOn : ''}`}
                aria-pressed={now.enabled}
                disabled={!ready}
                onClick={() =>
                  set({
                    leisure: {
                      ...draft,
                      offers: {
                        ...draft.offers,
                        [offer.offerId]: { priceCents: now.priceCents, enabled: !now.enabled },
                      },
                    },
                  })
                }
              >
                {label(now.enabled ? 'leisure.offerOff' : 'leisure.offerOn', stage)}
              </button>
            </Choices>
            <Market
              label={label(
                offer.kind === 'pack'
                  ? 'leisure.offer.kind.pack'
                  : offer.kind === 'annual'
                    ? 'leisure.offer.kind.annual'
                    : offer.kind === 'intro'
                      ? 'leisure.offer.kind.intro'
                      : offer.kind === 'corporate'
                        ? 'leisure.offer.kind.corporate'
                        : offer.kind === 'off_peak'
                          ? 'leisure.offer.kind.off_peak'
                          : 'leisure.offer.kind.monthly',
                stage,
              )}
              control={
                <Stepper
                  stage={stage}
                  value={now.priceCents}
                  min={100}
                  max={Math.max(now.priceCents, offer.priceCents * 3)}
                  step={500}
                  names={{ minus: 'tour.prices.minus', plus: 'tour.prices.plus' }}
                  display={formatEuro(now.priceCents)}
                  formatStep={formatEuro}
                  what={label('leisure.offerWhat', stage, { name: offer.name })}
                  onChange={(priceCents) =>
                    set({
                      leisure: {
                        ...draft,
                        offers: {
                          ...draft.offers,
                          [offer.offerId]: { enabled: now.enabled, priceCents },
                        },
                      },
                    })
                  }
                />
              }
            />
          </div>
        )
      })}
    </>
  )
}

export function AggregatorPlan() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan.bookings)
  const set = useGame((s) => s.setBookings)
  const l = view?.bookings?.leisure,
    a = l?.aggregator
  if (!view || !l || !a) return null
  const stage = voiceOf(view),
    draft = plan?.leisure ?? {}
  const now = draft.aggregator ?? { slots: a.slots, leave: a.leavingWeek !== null }
  const change = (slots: string[], leave = now.leave) =>
    set({ leisure: { ...draft, aggregator: { slots, leave } } })
  return (
    <>
      <SubHeading>{label('leisure.aggregatorTitle', stage)}</SubHeading>
      <Writing>
        {label('leisure.aggregatorTerms', stage, {
          name: a.name,
          cap: a.capPerMonth,
          weeks: a.noticeWeeks,
        })}
      </Writing>
      {a.leavingWeek !== null && (
        <Writing>{label('leisure.aggregatorLeaving', stage, { week: a.leavingWeek })}</Writing>
      )}
      <Writing>
        {label('leisure.aggregatorRecent', stage, {
          n: a.checkinsLast4,
          amount: formatEuro(a.payoutLast4Cents),
          cancelled: a.cancellationsLast4,
        })}
      </Writing>
      <Choices>
        {l.slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            className={`${ui.chip} ${now.slots.includes(slot.id) ? ui.chipOn : ''}`}
            aria-pressed={now.slots.includes(slot.id)}
            onClick={() =>
              change(
                now.slots.includes(slot.id)
                  ? now.slots.filter((id) => id !== slot.id)
                  : [...now.slots, slot.id],
              )
            }
          >
            {label('leisure.aggregatorSlot', stage, { name: slot.name })}
          </button>
        ))}
      </Choices>
      <Choices>
        <button
          type="button"
          className={ui.chip}
          aria-pressed={now.leave}
          onClick={() => change(now.slots, a.joined && !now.leave)}
        >
          {label(
            now.leave || !a.joined ? 'leisure.aggregatorJoin' : 'leisure.aggregatorLeave',
            stage,
          )}
        </button>
      </Choices>
    </>
  )
}

export function MembershipFacts({ leisure: l, view }: { leisure: LeisureView; view: PlayerView }) {
  if (!l.members.length) return null
  const stage = voiceOf(view)
  return (
    <>
      <h3 className={ui.title}>{label('leisure.membersTitle', stage)}</h3>
      <p>
        {label('leisure.memberChanges', stage, {
          joined: l.joinsLast4,
          cancelled: l.cancellationsLast4,
        })}
      </p>
      {l.members.map((m) => (
        <p key={m.offerId}>
          {m.name}:{' '}
          {label('leisure.memberCounts', stage, {
            active: m.active,
            inactive: m.inactive,
            owed: m.owedVisits,
          })}
        </p>
      ))}
      {l.foundingFollowing && <p>{label('leisure.following', stage, l.foundingFollowing)}</p>}
      {l.instructorWork && (
        <>
          <p>{label('leisure.instructorLimit', stage, { n: l.instructorWork.maxClasses })}</p>
          {l.instructorWork.loads.map((load) => (
            <p key={load.id}>
              {label('leisure.instructorLoad', stage, {
                name: load.name ?? label('leisure.instructorFounder', stage),
                n: load.classes,
              })}
            </p>
          ))}
        </>
      )}
      {l.instructorDepartures.map((d, i) => (
        <p key={i}>{label('leisure.departure', stage, d)}</p>
      ))}
    </>
  )
}

/** Editing a timetable changes shared room hours, never the number of physical rooms. */
export function ClassTimetable() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan.bookings)
  const set = useGame((s) => s.setBookings)
  const l = view?.bookings?.leisure
  if (!view || !l?.timetable.some((r) => r.classHours !== undefined)) return null
  const stage = voiceOf(view),
    draft = plan?.leisure ?? {}
  return (
    <section className={ui.card} aria-label={label('leisure.timetable', stage)}>
      <h2 className={ui.title}>{label('leisure.timetable', stage)}</h2>
      <p>{label('leisure.timetableHint', stage)}</p>
      {l.timetable.map((row) => {
        const ready = view.product.features.some((f) => f.id === row.productId && f.shipped)
        return (
          <details key={row.productId}>
            <summary>{row.name}</summary>
            <p>
              {label('leisure.classTerms', stage, {
                places: row.places,
                hours: row.classHours ?? 1,
                room: label(
                  row.room === 'spin'
                    ? 'leisure.room.spin'
                    : row.room === 'annex'
                      ? 'leisure.room.annex'
                      : 'leisure.room.studio',
                  stage,
                ),
              })}
            </p>
            {row.available === false ? (
              <p>{label('leisure.classUnavailable', stage)}</p>
            ) : !ready ? (
              <p>{label('leisure.classPrepare', stage)}</p>
            ) : (
              l.slots.map((slot) => {
                const now = draft.timetable?.[row.productId] ?? row.classes
                const value = now[slot.id] ?? 0
                const others = l.timetable
                  .filter((r) => r.productId !== row.productId && r.room === row.room)
                  .reduce(
                    (n, r) =>
                      n +
                      ((draft.timetable?.[r.productId] ?? r.classes)[slot.id] ?? 0) *
                        (r.classHours ?? 1),
                    0,
                  )
                const max = Math.max(
                  value,
                  Math.floor(Math.max(0, slot.hours - others) / (row.classHours ?? 1)),
                )
                return (
                  <div key={slot.id}>
                    <Market
                      label={slot.name}
                      control={
                        <Stepper
                          stage={stage}
                          value={value}
                          max={max}
                          what={label('leisure.classSlot', stage, {
                            name: row.name,
                            slot: slot.name,
                          })}
                          onChange={(n) =>
                            set({
                              leisure: {
                                ...draft,
                                timetable: {
                                  ...draft.timetable,
                                  [row.productId]: { ...now, [slot.id]: n },
                                },
                              },
                            })
                          }
                        />
                      }
                    />
                    {row.coveredClasses && (
                      <p>
                        {label('leisure.classCovered', stage, {
                          covered: row.coveredClasses[slot.id] ?? 0,
                          classes: row.classes[slot.id] ?? 0,
                          slot: slot.name,
                        })}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </details>
        )
      })}
    </section>
  )
}
