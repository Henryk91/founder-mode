import type { LeisureConfig } from '@founder-mode/content'
import type { Rng } from '../rng'
import type { Booking, GameState } from '../types'

type Qualifications = NonNullable<LeisureConfig['qualifications']>
const ordered = <T>(rows: Record<string, T>): [string, T][] =>
  Object.entries(rows).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

export function qualificationRates(config: Qualifications | undefined, rng: Rng) {
  if (!config) return undefined
  return Object.fromEntries(
    ordered(config.initial).map(([id, levels]) => [
      id,
      Object.fromEntries(
        ordered(levels).map(([level, share]) => [level, rng.range(share.min, share.max)]),
      ),
    ]),
  )
}

/** An earned advanced skill includes its stated prerequisites. Config validation rejects cycles. */
export function earnedLevels(
  config: Qualifications,
  previous: readonly string[],
  level: string,
): string[] {
  const out = new Set(previous)
  const add = (id: string) => {
    if (out.has(id)) return
    out.add(id)
    for (const before of config.levels[id]?.requires ?? []) add(before)
  }
  add(level)
  return [...out].sort()
}

export function drawLevels(
  config: Qualifications | undefined,
  rates: Record<string, number> | undefined,
  rng: Rng,
): string[] | undefined {
  if (!config) return undefined
  let levels: string[] = []
  for (const [level, share] of ordered(rates ?? {}))
    if (rng.chance(share)) levels = earnedLevels(config, levels, level)
  return levels
}

export function personLevels(s: GameState, segment: string, rng: Rng) {
  return drawLevels(
    s.scenario.bookings?.leisure?.qualifications,
    s.hidden.bookings?.leisure?.qualificationRates?.[segment],
    rng,
  )
}

/** Only served courses teach; member/user identities retain the actual earned skill. */
export function finishQualifications(
  input: GameState,
  served: readonly Booking[],
  rng?: Rng,
): GameState {
  const config = input.scenario.bookings?.leisure?.qualifications
  const l = input.bookings?.leisure
  if (!config || !l) return input
  const members = l.members.map((m) => ({ ...m, levels: [...(m.levels ?? [])] }))
  const aggregator = l.aggregator
    ? {
        ...l.aggregator,
        users: l.aggregator.users.map((u) => ({ ...u, levels: [...(u.levels ?? [])] })),
      }
    : null
  const people = (l.coursePeople ?? []).map((p) => ({ ...p, levels: [...p.levels] }))
  const pending = [...(l.qualifiedEnquiries ?? [])]
  const conversion = { ...(l.courseConversion ?? { graduates: 0, enquiries: 0, joined: 0 }) }
  const propose = (booking: Booking, levels: string[], units: number, personId?: string) => {
    if (
      !rng ||
      input.week >= input.scenario.maxWeeks ||
      (personId && pending.some((e) => e.personId === personId))
    )
      return
    let willing = 0
    for (let i = 0; i < units; i++)
      if (rng.chance(config.courseMembership[booking.productId] ?? 0)) willing++
    if (willing > 0)
      pending.push({
        week: input.week + 1,
        segmentId: booking.segmentId,
        units: willing,
        levels,
        ...(personId ? { personId } : {}),
      })
    conversion.enquiries += willing
  }
  for (const booking of served) {
    if (booking.week !== input.week || booking.status !== 'served') continue
    const course = input.scenario.bookings!.products[booking.productId]?.course
    if (!course) continue
    conversion.graduates += booking.units
    const levels = earnedLevels(config, booking.levels ?? [], course.level)
    const member = booking.memberId ? members.find((m) => m.id === booking.memberId) : undefined
    const user =
      booking.aggregatorUser === undefined ? undefined : aggregator?.users[booking.aggregatorUser]
    if (member) member.levels = earnedLevels(config, member.levels, course.level)
    else if (user) user.levels = earnedLevels(config, user.levels, course.level)
    else if (booking.coursePeople?.length) {
      for (const id of booking.coursePeople) {
        let person = people.find((p) => p.id === id)
        if (!person) {
          person = { id, memberId: null, levels: [...(booking.levels ?? [])] }
          people.push(person)
        }
        person.levels = earnedLevels(config, person.levels, course.level)
        const existing = members.find((m) => m.id === person.memberId)
        if (existing) existing.levels = earnedLevels(config, existing.levels, course.level)
        else propose(booking, person.levels, 1, person.id)
      }
    } else propose(booking, levels, booking.units)
  }
  return {
    ...input,
    bookings: {
      ...input.bookings!,
      leisure: {
        ...l,
        members,
        aggregator,
        coursePeople: people,
        qualifiedEnquiries: pending,
        courseConversion: conversion,
      },
    },
  }
}
