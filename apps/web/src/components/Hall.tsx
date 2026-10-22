import type { BookingsPlan, PlayerView } from '@founder-mode/engine'
import { label, voiceOf } from '../labels'
import { useGame } from '../useGame'
import { Market } from './Ruled'
import { Stepper } from './Stepper'
import ui from './ui.module.css'

/** Paid hours available now,including this week's explicitly selected contracts. */
export function hallRoleHours(
  view: PlayerView,
  plan: BookingsPlan | undefined,
  id: string,
  hours: number,
): number {
  const b = view.bookings!
  const role = b.roles.find((r) => r.id === id)
  const contracts = b.contracts
    .filter((c) => c.roleId === id && c.working)
    .reduce((n, c) => n + c.shifts, 0)
  const hired = (plan?.hire ?? [])
    .filter((c) => c.roleId === id)
    .reduce((n, c) => {
      const terms = role?.contracts.find((t) => t.kind === c.kind)
      return n + (terms && (!terms.months || terms.months.includes(b.month)) ? terms.shifts : 0)
    }, 0)
  return ((plan?.shifts[id] ?? 0) + (plan?.founderShifts[id] ?? 0) + contracts + hired) * hours
}

/** Hall choices use public opening and staffing terms,never comfort thresholds. */
export function HallPlan() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan.bookings)
  const set = useGame((s) => s.setBookings)
  const l = view?.bookings?.leisure,
    h = l?.hall
  if (!view || !l || !h) return null
  const stage = voiceOf(view),
    draft = plan?.leisure ?? {}
  const requested = { ...h.requestedHours, ...draft.openHours }
  const total = l.slots.reduce((n, s) => n + (requested[s.id] ?? s.hours), 0)
  const cover = hallRoleHours(view, plan, h.deskRoleId, h.deskHoursPerShift)
  const paid = h.settingRoleId
    ? hallRoleHours(view, plan, h.settingRoleId, h.settingHoursPerShift ?? 0)
    : 0
  const allocation = draft.paidSettingHours ?? {}
  const allocated = Object.values(allocation).reduce((n, hours) => n + hours, 0)
  return (
    <section className={ui.card} aria-label={label('hall.title', stage)}>
      <h2 className={ui.title}>{label('hall.title', stage)}</h2>
      <p>{label('hall.hoursHint', stage, { visit: h.visitHours, shift: h.deskHoursPerShift })}</p>
      <p>
        {label('hall.cover', stage, {
          requested: total,
          covered: cover,
          shifts: Math.ceil(total / h.deskHoursPerShift),
        })}
      </p>
      {l.slots.map((slot) => (
        <div key={slot.id}>
          <Market
            label={slot.name}
            control={
              <Stepper
                stage={stage}
                value={requested[slot.id] ?? slot.hours}
                max={slot.hours}
                what={label('hall.openWhat', stage, { slot: slot.name })}
                onChange={(n) =>
                  set({ leisure: { ...draft, openHours: { ...requested, [slot.id]: n } } })
                }
              />
            }
          />
          <p>{label('hall.lastOpen', stage, { hours: h.openHours[slot.id] ?? 0 })}</p>
        </div>
      ))}
      {h.settingRoleId && (
        <>
          <h3 className={ui.title}>{label('hall.settingTitle', stage)}</h3>
          <p>{label('hall.settingHint', stage, { paid, allocated })}</p>
          {l.freshness
            .filter((f) => view.product.features.some((p) => p.id === f.productId && p.shipped))
            .map((f) => {
              const value = allocation[f.productId] ?? 0
              return (
                <Market
                  key={f.productId}
                  label={f.name}
                  control={
                    <Stepper
                      stage={stage}
                      value={value}
                      max={value + Math.max(0, paid - allocated)}
                      what={label('hall.settingWhat', stage, { name: f.name })}
                      onChange={(n) =>
                        set({
                          leisure: {
                            ...draft,
                            paidSettingHours: { ...allocation, [f.productId]: n },
                          },
                        })
                      }
                    />
                  }
                />
              )
            })}
        </>
      )}
      {l.qualifications && (
        <>
          <h3 className={ui.title}>{label('hall.skillsTitle', stage)}</h3>
          <p>{label('hall.skillsHint', stage)}</p>
          {l.qualifications.levels.map((level) => (
            <p key={level.id}>{label('hall.skillsCount', stage, level)}</p>
          ))}
          <p>
            {label('hall.courseJoins', stage, {
              graduates: l.qualifications.graduates,
              enquiries: l.qualifications.enquiries,
              joined: l.qualifications.joined,
            })}
          </p>
        </>
      )}
    </section>
  )
}
