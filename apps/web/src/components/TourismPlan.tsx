import type { BookingsPlan, BookingsView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type UiStage } from '../labels'
import { noBookings } from '../store'
import { useGame } from '../useGame'
import { Choices, HintLine, Market, SubHeading, Writing } from './Ruled'
import { Stepper } from './Stepper'
import styles from './ui.module.css'

// The tourism sections of the Plan tab (step 4): who works this week, how guests find you, and
// prices with the cancellation policy. Only shown in a bookings scenario.

const segName = (view: PlayerView, id: string) => view.segments.find((s) => s.id === id)?.name ?? id

/** Founder hours the roster, outreach and new partnerships take. */
export function tourismHours(view: PlayerView, p: BookingsPlan | undefined): number {
  const b = view.bookings
  if (!b || !p) return 0
  let hours = p.partnerships.length * b.partnershipHours
  for (const [role, n] of Object.entries(p.founderShifts)) {
    hours += n * (b.roles.find((r) => r.id === role)?.founderHours ?? 0)
  }
  for (const h of Object.values(p.outreach)) hours += h
  return hours
}

/** Hours each tourism section adds: own shifts to the roster, the rest to getting guests. */
export function rosterHours(view: PlayerView, p: BookingsPlan | undefined): number {
  const b = view.bookings
  if (!b || !p) return 0
  return Object.entries(p.founderShifts).reduce(
    (t, [role, n]) => t + n * (b.roles.find((r) => r.id === role)?.founderHours ?? 0),
    0,
  )
}

export const guestsHours = (view: PlayerView, p: BookingsPlan | undefined) =>
  tourismHours(view, p) - rosterHours(view, p)

/** Products that need someone on the roster: they have capacity and a role that serves them. */
const staffed = (b: BookingsView, id: string) => {
  const product = b.products.find((x) => x.id === id)
  return !!product?.shipped && product.capacity > 0 && b.roles.some((r) => (r.units[id] ?? 0) > 0)
}

/** Units the roster covers per staffed product this week, and what is booked. */
export function coverage(b: BookingsView, p: BookingsPlan) {
  return b.thisWeek
    .filter((t) => staffed(b, t.productId))
    .map((t) => {
      const product = b.products.find((x) => x.id === t.productId)!
      const units = b.roles.reduce(
        (sum, r) =>
          sum +
          ((p.shifts[r.id] ?? 0) + (p.founderShifts[r.id] ?? 0)) * (r.units[t.productId] ?? 0),
        0,
      )
      return { product, booked: t.booked, covers: Math.min(units, product.capacity) }
    })
}

export function rosterSummary(view: PlayerView, p: BookingsPlan | undefined, stage: UiStage) {
  const b = view.bookings
  if (!b) return ''
  const plan = p ?? noBookings()
  const shifts = Object.values(plan.shifts).reduce((t, n) => t + n, 0)
  const own = Object.values(plan.founderShifts).reduce((t, n) => t + n, 0)
  const booked = b.thisWeek.reduce((t, x) => t + x.booked, 0)
  if (shifts + own === 0)
    return booked > 0 ? count('tour.sum.unstaffed', stage, booked) : label('plan.sum.none', stage)
  return count('tour.sum.shifts', stage, shifts + own, { booked })
}

export function guestsSummary(view: PlayerView, p: BookingsPlan | undefined, stage: UiStage) {
  const b = view.bookings
  if (!b) return ''
  const parts: string[] = []
  if (p?.platform ?? b.platform.listed) parts.push(b.platform.name)
  if (b.partnerships.length + (p?.partnerships.length ?? 0) > 0)
    parts.push(label('tour.sum.partners', stage))
  if (Object.values(p?.outreach ?? {}).some((h) => h > 0))
    parts.push(label('tour.sum.outreach', stage))
  return parts.length ? parts.join(', ') : label('plan.sum.none', stage)
}

export function pricesSummary(view: PlayerView, p: BookingsPlan | undefined, stage: UiStage) {
  const b = view.bookings
  if (!b) return ''
  const policy = p?.policy ?? b.policy
  return label(`tour.policy.${policy}`, stage)
}

/** Who works this week: shifts per role, your own shifts, and what they cover of the bookings. */
export function RosterPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const planned = useGame((s) => s.plannedHours)
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = view.company.uiStage
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  return (
    <>
      {coverage(b, draft).map(({ product, booked, covers }) => (
        <Writing key={product.id} warn={covers < booked}>
          {label(covers < booked ? 'tour.roster.short' : 'tour.roster.line', stage, {
            product: product.name,
            booked,
            covers,
          })}
        </Writing>
      ))}
      {b.roles.map((r) => {
        const n = draft.shifts[r.id] ?? 0
        return (
          <Market
            key={r.id}
            stack
            label={r.name}
            note={label('tour.roster.pay', stage, {
              amount: formatEuro(r.centsPerShift),
              available: r.available,
            })}
            control={
              <Stepper
                stage={stage}
                value={n}
                onChange={(v) => set({ shifts: { ...draft.shifts, [r.id]: v } })}
                what={label('tour.roster.what', stage, { role: r.name })}
                max={r.available}
              />
            }
          />
        )
      })}
      {b.roles
        .filter((r) => r.founderHours !== null)
        .map((r) => {
          const n = draft.founderShifts[r.id] ?? 0
          const per = r.founderHours ?? 1
          return (
            <Market
              key={`own-${r.id}`}
              stack
              label={label('tour.roster.own', stage, { role: r.name })}
              note={label('unit.hours', stage, { n: per })}
              control={
                <Stepper
                  stage={stage}
                  value={n}
                  onChange={(v) => set({ founderShifts: { ...draft.founderShifts, [r.id]: v } })}
                  what={label('tour.roster.ownWhat', stage, { role: r.name })}
                  max={n + Math.floor(free / per)}
                />
              }
            />
          )
        })}
      <HintLine term="roster" hint={label('plan.hint.roster', stage)} />
    </>
  )
}

/** How guests find you: the platform, partners and your own outreach. */
export function GuestsPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const planned = useGame((s) => s.plannedHours)
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = view.company.uiStage
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  const listed = draft.platform ?? b.platform.listed
  return (
    <>
      <Market
        label={b.platform.name}
        note={label('tour.platform.note', stage, {
          share: Math.round(b.platform.commission * 100),
        })}
        choices={chip(
          listed,
          listed ? label('tour.platform.listed', stage) : label('tour.platform.list', stage),
          () => set({ platform: listed === b.platform.listed ? !listed : null }),
        )}
      />
      <SubHeading>{label('tour.partners', stage)}</SubHeading>
      {b.segments.map((s) => {
        const has = b.partnerships.includes(s.id)
        const on = draft.partnerships.includes(s.id)
        return (
          <Market
            key={s.id}
            label={segName(view, s.id)}
            choices={
              has ? (
                <Writing>{label('tour.partners.has', stage)}</Writing>
              ) : (
                chip(
                  on,
                  on
                    ? label('tour.partners.booked', stage)
                    : label('tour.partners.setUp', stage, {
                        hours: label('unit.hours', stage, { n: b.partnershipHours }),
                      }),
                  () =>
                    set({
                      partnerships: on
                        ? draft.partnerships.filter((x) => x !== s.id)
                        : [...draft.partnerships, s.id],
                    }),
                )
              )
            }
          />
        )
      })}
      <SubHeading>{label('tour.outreach', stage)}</SubHeading>
      {b.segments.map((s) => {
        const h = draft.outreach[s.id] ?? 0
        return (
          <Market
            key={`out-${s.id}`}
            stack
            label={segName(view, s.id)}
            control={
              <Stepper
                stage={stage}
                value={h}
                onChange={(v) => set({ outreach: { ...draft.outreach, [s.id]: v } })}
                what={label('tour.outreach.what', stage, { segment: segName(view, s.id) })}
                step={2}
                display={label('unit.hours', stage, { n: h })}
                hoursValue
                max={Math.min(b.outreachHoursFull * 2, h + Math.floor(free / 2) * 2)}
              />
            }
          />
        )
      })}
      <HintLine term="guests" hint={label('plan.hint.guests', stage)} />
    </>
  )
}

/** Steps for money, in cents: whole euros a price list would use. */
const NICE_STEPS = [100, 200, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000]
const nice = (target: number) => NICE_STEPS.filter((s) => s <= target).at(-1) ?? NICE_STEPS[0]!

/**
 * A small and a large step scaled to a price: about 3% and 15% of it, as round euro amounts, the
 * large one at least five small ones. A 2,800 EUR team day moves by 50 or 250, an 85 EUR hike
 * by 2 or 10.
 */
export function priceSteps(cents: number): { step: number; big: number } {
  const step = nice(cents * 0.03)
  const big = Math.max(
    nice(cents * 0.15),
    NICE_STEPS.find((s) => s >= step * 5)!,
  )
  return { step, big }
}

/** Prices per segment, for peak and off season, and the cancellation policy. */
export function PricesPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = view.company.uiStage
  const policy = draft.policy ?? b.policy
  return (
    <>
      <Writing>{label(b.peak ? 'tour.prices.peakNow' : 'tour.prices.offNow', stage)}</Writing>
      {b.segments.flatMap((s) => {
        const now = draft.prices[s.id] ?? b.prices[s.id]!
        return (['peak', 'off'] as const).map((season) => {
          // Steps follow the price this week started with, so they hold still while tapping.
          const { step, big } = priceSteps(b.prices[s.id]![season])
          return (
            <Market
              key={`${s.id}-${season}`}
              stack
              label={label(`tour.prices.${season}`, stage, { segment: segName(view, s.id) })}
              note={label(`tour.unit.${s.unit}`, stage)}
              control={
                <Stepper
                  stage={stage}
                  value={now[season]}
                  onChange={(v) =>
                    set({
                      prices: {
                        ...draft.prices,
                        [s.id]: { ...now, [season]: Math.max(NICE_STEPS[0]!, v) },
                      },
                    })
                  }
                  what={label(`tour.prices.what.${season}`, stage, {
                    segment: segName(view, s.id),
                  })}
                  names={{ minus: 'tour.prices.minus', plus: 'tour.prices.plus' }}
                  step={step}
                  bigStep={big}
                  formatStep={(c) => formatEuro(c)}
                  display={formatEuro(now[season])}
                  min={NICE_STEPS[0]!}
                  max={b.prices[s.id]![season] * 3}
                />
              }
            />
          )
        })
      })}
      <SubHeading>{label('tour.policy', stage)}</SubHeading>
      {b.policyLocked ? (
        <Writing>{label('tour.policy.locked', stage)}</Writing>
      ) : (
        <Choices>
          {(['flexible', 'strict'] as const).map((x) =>
            chip(policy === x, label(`tour.policy.${x}`, stage), () =>
              set({ policy: x === b.policy ? null : x }),
            ),
          )}
        </Choices>
      )}
      <HintLine term="prices" hint={label('plan.hint.prices', stage)} />
    </>
  )
}

function chip(on: boolean, text: string, onClick: () => void) {
  return (
    <button
      key={text}
      type="button"
      aria-pressed={on}
      className={`${styles.chip} ${on ? styles.chipOn : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  )
}
