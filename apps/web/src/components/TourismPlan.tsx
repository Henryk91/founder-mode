import type { BookingsPlan, BookingsView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type Voice, voiceOf } from '../labels'
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
      // Contract staff working this week count with the shifts (plan 2).
      const contract = (role: string) =>
        b.contracts.filter((c) => c.roleId === role && c.working).reduce((n, c) => n + c.shifts, 0)
      const side = (floor: boolean) =>
        b.roles
          .filter((r) => (r.kind === 'floor') === floor)
          .reduce(
            (sum, r) =>
              sum +
              ((p.shifts[r.id] ?? 0) + (p.founderShifts[r.id] ?? 0) + contract(r.id)) *
                (r.units[t.productId] ?? 0),
            0,
          )
      const kitchen = Math.min(side(false), product.capacity)
      const needsFloor = b.roles.some((r) => r.kind === 'floor' && (r.units[t.productId] ?? 0) > 0)
      const floor = needsFloor ? side(true) : null
      return {
        product,
        booked: t.booked,
        covers: floor === null ? kitchen : Math.min(kitchen, floor),
        kitchen,
        floor,
      }
    })
}

export function rosterSummary(view: PlayerView, p: BookingsPlan | undefined, stage: Voice) {
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

export function guestsSummary(view: PlayerView, p: BookingsPlan | undefined, stage: Voice) {
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

export function pricesSummary(view: PlayerView, p: BookingsPlan | undefined, stage: Voice) {
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
  const stage = voiceOf(view)
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  return (
    <>
      <ConditionsPlan />
      <CruisePlan />
      {coverage(b, draft).map(({ product, booked, covers, kitchen, floor }) => (
        <Writing key={product.id} warn={covers < booked}>
          {floor === null
            ? label(covers < booked ? 'tour.roster.short' : 'tour.roster.line', stage, {
                product: product.name,
                booked,
                covers,
              })
            : label(covers < booked ? 'tour.roster.splitShort' : 'tour.roster.split', stage, {
                product: product.name,
                booked,
                kitchen,
                floor,
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
      <ContractsPlan />
      <PrepPlan />
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
  const stage = voiceOf(view)
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
  const stage = voiceOf(view)
  const policy = draft.policy ?? b.policy
  return (
    <>
      <Writing>{label(b.peak ? 'tour.prices.peakNow' : 'tour.prices.offNow', stage)}</Writing>
      {b.segments.flatMap((s) => {
        const now = draft.prices[s.id] ?? b.prices[s.id]!
        // Plan 4: products priced as a multiple of the group's price, at this season's price.
        const priced = b.products.filter(
          (p) => p.shipped && p.serves.includes(s.id) && p.priceFactor !== 1,
        )
        const price = b.peak ? now.peak : now.off
        const products =
          priced.length > 0
            ? [
                <Writing key={`${s.id}-products`}>
                  {label('tour.prices.products', stage, {
                    list: priced
                      .map((p) => `${p.name} ${formatEuro(Math.round(price * p.priceFactor))}`)
                      .join(', '),
                  })}
                </Writing>,
              ]
            : []
        return [
          ...products,
          ...(['peak', 'off'] as const).map((season) => {
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
          }),
        ]
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
      <MinStayPlan />
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

// Plan 2 step 1: the scenario's own trials and vouchers, contracts, food prepared, rooms renovated
// one at a time, and a minimum stay.

/** Founder hours of the week's trials and voucher batches. */
export function trialsHours(view: PlayerView, p: BookingsPlan | undefined): number {
  const b = view.bookings
  if (!b || !p) return 0
  let hours = 0
  for (const t of p.trials ?? []) hours += b.trials.find((x) => x.id === t.id)?.hours ?? 0
  for (const n of Object.values(p.vouchers ?? {})) hours += n * (b.vouchers?.hoursPerBatch ?? 0)
  return hours
}

export function trialsSummary(view: PlayerView, p: BookingsPlan | undefined, stage: Voice) {
  const b = view.bookings
  if (!b) return ''
  const names = (p?.trials ?? []).map((t) => b.trials.find((x) => x.id === t.id)?.name ?? t.id)
  const batches = Object.values(p?.vouchers ?? {}).reduce((t, n) => t + n, 0)
  const parts = [
    ...new Set(names),
    ...(batches > 0 ? [count('tour.sum.vouchers', stage, batches)] : []),
  ]
  return parts.length ? parts.join(', ') : label('plan.sum.none', stage)
}

/** The Test section where a scenario has its own trials: each trial, then vouchers. */
export function TrialsPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const planned = useGame((s) => s.plannedHours)
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = voiceOf(view)
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  const trials = draft.trials ?? []
  const has = (id: string, seg: string | null) =>
    trials.some((t) => t.id === id && t.segmentId === seg)
  const toggle = (id: string, seg: string | null) =>
    set({
      trials: has(id, seg)
        ? trials.filter((t) => !(t.id === id && t.segmentId === seg))
        : [...trials, { id, segmentId: seg }],
    })
  const runChip = (t: (typeof b.trials)[number], seg: string | null) => {
    const on = has(t.id, seg)
    const left = t.left[seg ?? ''] ?? 0
    if (!on && left <= 0) return <Writing>{label('tour.trial.done', stage)}</Writing>
    return (
      <button
        type="button"
        aria-pressed={on}
        disabled={!on && free < t.hours}
        className={`${styles.chip} ${on ? styles.chipOn : ''}`}
        onClick={() => toggle(t.id, seg)}
      >
        {on ? label('tour.trial.planned', stage) : label('tour.trial.run', stage)}
      </button>
    )
  }
  return (
    <>
      {b.trials.map((t) => (
        <div key={t.id}>
          <SubHeading>{t.name}</SubHeading>
          <Writing>
            {count('tour.trial.note', stage, t.weeks, {
              people: t.people,
              hours: label('unit.hours', stage, { n: t.hours }),
              amount: formatEuro(t.cents),
            })}
            {t.paid ? ` ${label('tour.trial.paid', stage)}` : ''}
          </Writing>
          {!t.open ? (
            <Writing>{label('tour.trial.closed', stage)}</Writing>
          ) : t.choose ? (
            <>
              <Writing>{label('tour.trial.pick', stage)}</Writing>
              {t.segments.map((seg) => (
                <Market
                  key={seg}
                  label={segName(view, seg)}
                  note={count('tour.trial.left', stage, t.left[seg] ?? 0)}
                  choices={runChip(t, seg)}
                />
              ))}
            </>
          ) : (
            <Market
              stack
              label={
                t.segments.length > 1
                  ? label('tour.trial.reach', stage, {
                      main: segName(view, t.segments[0]!),
                      others: t.segments
                        .slice(1)
                        .map((x) => segName(view, x))
                        .join(', '),
                    })
                  : label('tour.trial.reachOne', stage, { main: segName(view, t.segments[0]!) })
              }
              note={count('tour.trial.left', stage, t.left[''] ?? 0)}
              choices={runChip(t, null)}
            />
          )}
        </div>
      ))}
      {b.vouchers && (
        <>
          <SubHeading>{label('tour.vouchers', stage)}</SubHeading>
          {b.vouchers.segments.map((v) => {
            const n = draft.vouchers?.[v.id] ?? 0
            const per = b.vouchers!.hoursPerBatch
            return (
              <div key={v.id}>
                <Writing>
                  {label('tour.vouchers.note', stage, {
                    people: b.vouchers!.batchSize,
                    amount: formatEuro(v.priceCents),
                    hours: label('unit.hours', stage, { n: per }),
                  })}
                </Writing>
                <Market
                  stack
                  label={segName(view, v.id)}
                  control={
                    <Stepper
                      stage={stage}
                      value={n}
                      onChange={(x) => set({ vouchers: { ...draft.vouchers, [v.id]: x } })}
                      what={label('tour.vouchers.what', stage, { segment: segName(view, v.id) })}
                      display={
                        n === 0
                          ? label('tour.vouchers.none', stage)
                          : count('tour.vouchers.batches', stage, n)
                      }
                      max={Math.min(v.batchesLeft, n + Math.floor(free / Math.max(1, per)))}
                    />
                  }
                />
              </div>
            )
          })}
        </>
      )}
      <HintLine term="test" hint={label('plan.hint.trials', stage)} />
    </>
  )
}

const monthName = (m: number, stage: Voice) => label(`tour.month.${m}` as 'tour.month.1', stage)

/** Contracts running and on offer, inside the Who works section. */
function ContractsPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = voiceOf(view)
  if (!b.roles.some((r) => r.contracts.length > 0)) return null
  const hire = draft.hire ?? []
  const ending = draft.endContracts ?? []
  const roleName = (id: string) => b.roles.find((r) => r.id === id)?.name ?? id
  return (
    <>
      <SubHeading>{label('tour.contracts', stage)}</SubHeading>
      {b.contracts.map((c) => {
        const on = ending.includes(c.id)
        return (
          <Market
            key={c.id}
            stack
            label={label('tour.contract.line', stage, {
              name: c.name,
              role: roleName(c.roleId),
              kind: label(`tour.contract.kind.${c.kind}`, stage),
              shifts: c.shifts,
              amount: formatEuro(c.centsPerWeek),
            })}
            note={
              c.endWeek !== null
                ? label('tour.contract.ends', stage, { week: c.endWeek })
                : !c.working
                  ? label('tour.contract.waits', stage)
                  : undefined
            }
            choices={
              c.canEnd
                ? chip(
                    on,
                    on
                      ? label('tour.contract.noticeGiven', stage)
                      : label('tour.contract.notice', stage),
                    () =>
                      set({
                        endContracts: on ? ending.filter((x) => x !== c.id) : [...ending, c.id],
                      }),
                  )
                : undefined
            }
          />
        )
      })}
      {b.roles.flatMap((r) =>
        r.contracts.map((o) => {
          const planned = hire.filter((h) => h.roleId === r.id && h.kind === o.kind).length
          const on = planned > 0
          const full = o.running >= o.max
          const months = o.months ?? []
          return (
            <Market
              key={`${r.id}-${o.kind}`}
              stack
              label={label('tour.contract.option', stage, {
                role: r.name,
                kind: label(`tour.contract.kind.${o.kind}`, stage),
              })}
              note={
                o.noticeWeeks !== null && o.months !== null
                  ? label('tour.contract.noteSleeps', stage, {
                      shifts: o.shifts,
                      amount: formatEuro(o.centsPerWeek),
                      from: monthName(months[0] ?? 1, stage),
                      to: monthName(months.at(-1) ?? 12, stage),
                      weeks: o.noticeWeeks,
                    })
                  : o.noticeWeeks !== null
                    ? label('tour.contract.noteNotice', stage, {
                        shifts: o.shifts,
                        amount: formatEuro(o.centsPerWeek),
                        weeks: o.noticeWeeks,
                      })
                    : label('tour.contract.noteSeason', stage, {
                        shifts: o.shifts,
                        amount: formatEuro(o.centsPerWeek),
                        from: monthName(months[0] ?? 1, stage),
                        to: monthName(months.at(-1) ?? 12, stage),
                      })
              }
              choices={
                full && !on ? (
                  <Writing>{label('tour.contract.full', stage)}</Writing>
                ) : (
                  chip(
                    on,
                    on ? label('tour.contract.hiring', stage) : label('tour.contract.hire', stage),
                    () =>
                      set({
                        hire: on
                          ? hire.filter((h) => !(h.roleId === r.id && h.kind === o.kind))
                          : [...hire, { roleId: r.id, kind: o.kind }],
                      }),
                  )
                )
              }
            />
          )
        }),
      )}
    </>
  )
}

/** Food prepared per service, inside the Who works section (a restaurant). */
function PrepPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  if (!view?.bookings) return null
  const b = view.bookings
  const stage = voiceOf(view)
  const rows = b.prep.filter((x) => b.products.find((p) => p.id === x.productId)?.shipped)
  if (rows.length === 0) return null
  return (
    <>
      <SubHeading>{label('tour.prep', stage)}</SubHeading>
      <Writing>{label('tour.prep.note', stage)}</Writing>
      {rows.map((x) => {
        const product = b.products.find((p) => p.id === x.productId)!
        const set0 = draft.prep?.[x.productId]
        const now = set0 ?? x.units
        return (
          <Market
            key={x.productId}
            stack
            label={product.name}
            control={
              <Stepper
                stage={stage}
                value={now ?? 0}
                onChange={(v) => set({ prep: { ...draft.prep, [x.productId]: v } })}
                what={label('tour.prep.what', stage, { product: product.name })}
                step={10}
                bigStep={50}
                display={
                  now === null
                    ? label('tour.prep.auto', stage)
                    : label('tour.prep.n', stage, { n: now })
                }
                max={product.capacity}
              />
            }
          />
        )
      })}
    </>
  )
}

/** Rooms renovated one at a time, inside the Build section (a guesthouse). */
export function RenovationPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  const r = view?.bookings?.renovation
  if (!view || !r) return null
  const stage = voiceOf(view)
  const n = draft.renovate ?? 0
  const planned = r.canStart > 0 || r.renovated > 0 || r.inProgress.length > 0
  return (
    <>
      <SubHeading>{label('tour.reno', stage)}</SubHeading>
      <Writing>
        {label('tour.reno.state', stage, {
          done: r.renovated,
          rooms: r.rooms,
          works: r.underWorks,
        })}
      </Writing>
      {!planned ? (
        <Writing>{label('tour.reno.planFirst', stage)}</Writing>
      ) : (
        <>
          <Writing>
            {label('tour.reno.note', stage, {
              weeks: r.weeks,
              amount: formatEuro(r.centsPerRoom),
            })}
          </Writing>
          <Market
            stack
            label={label('tour.reno.what', stage)}
            control={
              <Stepper
                stage={stage}
                value={n}
                onChange={(v) => set({ renovate: v })}
                what={label('tour.reno.what', stage)}
                display={
                  n === 0
                    ? label('tour.reno.none', stage)
                    : count('tour.reno.rooms', stage, n, { amount: formatEuro(n * r.centsPerRoom) })
                }
                max={r.canStart}
              />
            }
          />
        </>
      )}
    </>
  )
}

/** The minimum stay, inside the Prices section (a guesthouse). */
function MinStayPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  const m = view?.bookings?.minStay
  if (!view || !m) return null
  const stage = voiceOf(view)
  const on = draft.minStay ?? m.on
  return (
    <>
      <SubHeading>{label('tour.minStay', stage)}</SubHeading>
      <Writing>
        {label('tour.minStay.note', stage, {
          from: monthName(m.months[0] ?? 1, stage),
          to: monthName(m.months.at(-1) ?? 12, stage),
          nights: m.nights,
        })}
      </Writing>
      <Choices>
        {chip(!on, label('tour.minStay.one', stage), () =>
          set({ minStay: m.on === false ? null : false }),
        )}
        {chip(on, label('tour.minStay.on', stage, { nights: m.nights }), () =>
          set({ minStay: m.on === true ? null : true }),
        )}
      </Choices>
    </>
  )
}

// Plan 4 (docs/abroad-mechanics.md): the forecast strip, what each product can run on this week,
// and the trip policy.

/** The forecast's states counted per slot, in the scenario's words: "5 calm, 2 light wind". */
export function forecastLine(
  states: { id: string; name: string }[],
  counts: Record<string, number>,
): string {
  return states
    .filter((st) => (counts[st.id] ?? 0) > 0)
    .map((st) => `${counts[st.id]} ${st.name}`)
    .join(', ')
}

/** This week's wind and sea as forecast, and the slots each product can run on. */
export function ConditionsPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  const a = view?.bookings?.abroad
  if (!view || !a) return null
  const b = view.bookings!
  const stage = voiceOf(view)
  const slotName = (id: string | null) =>
    id === 'spot'
      ? label('tour.runsOn.spot', stage, { spot: a.spot?.name ?? '' })
      : id === null
        ? label('tour.runsOn.slots', stage)
        : (a.slots.find((x) => x.id === id)?.name ?? id).toLowerCase()
  const shipped = (id: string) => b.products.find((p) => p.id === id)?.shipped
  const t = a.trips
  const tripProduct = b.products.find((p) => p.dayTrip)
  const min = draft.trips !== undefined ? draft.trips.min : (t?.min ?? null)
  const options: (number | null)[] = t
    ? [null, ...Array.from({ length: t.most }, (_, k) => k + 1)]
    : []
  return (
    <>
      <SubHeading>{label('tour.forecast.title', stage)}</SubHeading>
      {a.slots.map((slot) => (
        <Writing key={slot.id}>
          {label('tour.forecast.slot', stage, {
            slot: slot.name,
            states: forecastLine(a.states, a.forecastCounts[slot.id] ?? {}),
          })}
        </Writing>
      ))}
      {a.spot && (
        <Writing>
          {label('tour.forecast.slot', stage, {
            slot: a.spot.name,
            states: forecastLine(
              a.states,
              Object.fromEntries(
                a.states.map((st) => [st.id, a.spot!.forecast.filter((d) => d === st.id).length]),
              ),
            ),
          })}
        </Writing>
      )}
      {a.runsOn
        .filter((r) => shipped(r.productId))
        .map((r) => (
          <Writing key={r.productId} warn={r.suitable === 0}>
            {label('tour.runsOn', stage, {
              product: b.products.find((p) => p.id === r.productId)?.name ?? r.productId,
              n: r.suitable,
              total: r.total,
              slot: slotName(r.slot),
            })}
          </Writing>
        ))}
      {t && tripProduct?.shipped && tripProduct.dayTrip && (
        <Market
          label={label('tour.trips', stage, { product: tripProduct.name })}
          note={label(t.locked ? 'tour.trips.locked' : 'tour.trips.note', stage, {
            fuel: formatEuro(tripProduct.dayTrip.costCents),
          })}
          choices={options.map((o) =>
            chip(
              min === o,
              o === null
                ? label('tour.trips.never', stage)
                : label('tour.trips.min', stage, { n: o }),
              () => {
                if (t.locked) return
                set({ trips: { min: o } })
              },
            ),
          )}
        />
      )}
    </>
  )
}

/** "W22: 3 of 8 cabins", "W23: held for the whole boat", ... for one cruise week. */
export function cruiseWeekText(
  w: NonNullable<BookingsView['cruise']>['weeks'][number],
  stage: Voice,
): string {
  if (w.closed) return label('cruise.week.closed', stage, { week: w.week })
  if (w.chartered) return label('cruise.week.chartered', stage, { week: w.week })
  if (w.held) return label('cruise.week.held', stage, { week: w.week })
  return label('cruise.week.cabins', stage, { week: w.week, sold: w.sold, cabins: w.cabins })
}

/**
 * Plan 4 (the gulet): the minimum to sail, and holding the next season weeks for whole-boat
 * bookings. A held week sells no cabins.
 */
export function CruisePlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.bookings) ?? noBookings()
  const set = useGame((s) => s.setBookings)
  const c = view?.bookings?.cruise
  if (!view || !c) return null
  const stage = voiceOf(view)
  const m = c.minSail
  const min = draft.minSail?.min ?? m?.min ?? 0
  const move = draft.minSail?.move ?? m?.move ?? false
  const holds = new Map((draft.hold ?? []).map((h) => [h.week, h.on]))
  const heldNow = (w: (typeof c.weeks)[number]) => holds.get(w.week) ?? w.held
  const toggle = (week: number, on: boolean) => {
    const rest = (draft.hold ?? []).filter((h) => h.week !== week)
    const original = c.weeks.find((w) => w.week === week)?.held
    set({ hold: on === original ? rest : [...rest, { week, on }] })
  }
  return (
    <>
      <SubHeading>{label('cruise.title', stage)}</SubHeading>
      {m && (
        <Market
          label={label('cruise.minSail', stage)}
          note={label(m.locked ? 'cruise.minSail.locked' : 'cruise.minSail.note', stage, {
            weeks: m.weeksBefore,
          })}
          choices={[
            ...m.options.map((o) =>
              chip(
                min === o,
                o === 0
                  ? label('cruise.minSail.any', stage)
                  : label('cruise.minSail.min', stage, { n: o }),
                () => !m.locked && set({ minSail: { min: o, move } }),
              ),
            ),
            chip(
              move,
              label('cruise.minSail.move', stage, { amount: formatEuro(m.moveCents) }),
              () => !m.locked && set({ minSail: { min, move: !move } }),
            ),
          ]}
        />
      )}
      {c.weeks.slice(0, 8).map((w) => {
        const sellable = !w.closed && !w.chartered && w.sold === 0
        return (
          <Market
            key={w.week}
            label={cruiseWeekText({ ...w, held: heldNow(w) }, stage)}
            choices={
              sellable
                ? chip(
                    heldNow(w),
                    heldNow(w) ? label('cruise.release', stage) : label('cruise.hold', stage),
                    () => toggle(w.week, !heldNow(w)),
                  )
                : undefined
            }
          />
        )
      })}
      <HintLine term="guests" hint={label('cruise.hint', stage)} />
    </>
  )
}
