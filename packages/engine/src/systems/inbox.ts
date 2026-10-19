import { loseLeisureInstructor } from './leisure'
import type { Effect, ScenarioEvent } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  Customer,
  GameState,
  Lead,
  Message,
  MessageEvent,
  ReportEntry,
  SegmentId,
} from '../types'
import { conditionsHold } from './conditions'
import { activeCustomers } from './customers'
import { committedHours } from './founder'
import { isOverdue, nudgeInvoice } from './invoices'
import { OddsTally } from './odds'
import { qualityFor } from './product'
import { acceptOffice, moveOffice } from './office'
import { addLeads } from './sales'
import { applyTender } from './abroad'
import { chooseAsset, repairAsset } from './assets'

/** What resolving messages adds to the week besides changes to the state. */
export type MessageOutcome = {
  state: GameState
  entries: ReportEntry[]
  /** Hours taken out of next week. */
  lostHours: number
  costsCents: number
  incomeCents: number
  /** Chance outcomes of cash effects, logged for the post-mortem. */
  odds: OddsTally
}

const isOpenLead = (l: Lead) => l.stage === 'lead' || l.stage === 'demo' || l.stage === 'trial'

function eventById(state: GameState, id: string): ScenarioEvent {
  const event = state.scenario.events.find((e) => e.id === id)
  if (!event) throw new Error(`Unknown event ${id}`)
  return event
}

/** An effect that always lands: no chance roll and no condition at the end of the week. */
const isSure = (e: { chance: number; when: readonly unknown[] }) =>
  e.chance >= 1 && e.when.length === 0

/**
 * Answers a message. The hours count against this week at once, and the effects land when the
 * week ends (plan section 4.11 step 2). Throws if the message is not open, the choice does not
 * exist, or its hours do not fit into the week.
 */
export function respond(state: GameState, messageId: string, choiceId: string): GameState {
  if (state.status !== 'running') throw new Error('The run is over')
  const message = state.inbox.find((m) => m.id === messageId)
  if (!message || message.status !== 'open') throw new Error(`Message ${messageId} is not open`)
  const choice = message.choices.find((c) => c.id === choiceId)
  if (!choice) throw new Error(`Message ${messageId} has no choice ${choiceId}`)
  if (
    committedHours(state) + state.founder.forcedHours + choice.hours >
    state.founder.maxHoursPerWeek
  ) {
    throw new Error(`Choice ${choiceId} does not fit into the week`)
  }
  return {
    ...state,
    inbox: state.inbox.map((m) => (m === message ? { ...m, status: 'answered', choiceId } : m)),
    actionLog: [...state.actionLog, { type: 'respond', week: state.week, messageId, choiceId }],
  }
}

/**
 * Plan section 4.11 step 2: messages answered this week take effect, and messages whose last
 * week this is take their default choice.
 */
export function resolveMessages(input: GameState, rng: Rng): MessageOutcome {
  let state = input
  const out: MessageOutcome = {
    state,
    entries: [],
    lostHours: 0,
    costsCents: 0,
    incomeCents: 0,
    odds: new OddsTally(state.week),
  }
  const events: MessageEvent[] = []
  const inbox: Message[] = []
  for (const message of state.inbox) {
    const expired = message.status === 'open' && message.expiresWeek <= state.week
    if (message.status !== 'answered' && !expired) {
      inbox.push(message)
      continue
    }
    const event = eventById(state, message.eventId)
    const choiceId = expired ? event.defaultChoice : message.choiceId
    const choice = event.choices.find((c) => c.id === choiceId)
    if (!choice || choiceId === null) throw new Error(`Message ${message.id} has no valid choice`)
    for (const effect of choice.effects) {
      state = applyEffect(state, effect, message, rng, out)
    }
    inbox.push({ ...message, status: expired ? 'expired' : 'resolved', choiceId })
    events.push({
      kind: 'message',
      week: state.week,
      eventId: message.eventId,
      choiceId,
      expired,
    })
    out.entries.push({
      kind: 'message_resolved',
      fromName: message.fromName,
      choiceLabel: choice.label,
      expired,
    })
  }
  out.state = { ...state, inbox, eventLog: [...state.eventLog, ...events, ...out.odds.events()] }
  return out
}

function applyEffect(
  state: GameState,
  effect: Effect,
  message: Message,
  rng: Rng,
  out: MessageOutcome,
): GameState {
  // The situation is checked first, so an effect that does not apply never rolls. A chance of 1
  // needs no roll either, so certain effects do not move the random sequence.
  if (!conditionsHold(state, effect.when, message)) return state
  if (effect.chance < 1) {
    const hit = rng.chance(effect.chance)
    if (effect.type === 'cash') {
      out.odds.count(
        'message',
        null,
        effect.chance,
        hit ? 1 : 0,
        effect.amountCents,
        message.eventId,
      )
    }
    if (!hit) return state
  }
  const week = state.week
  switch (effect.type) {
    case 'cash':
      if (effect.amountCents >= 0) out.incomeCents += effect.amountCents
      else out.costsCents += -effect.amountCents
      out.entries.push({ kind: 'cash_effect', amountCents: effect.amountCents })
      return state
    case 'energy': {
      const max = state.scenario.founder.energy.max
      const energy = Math.min(max, Math.max(0, state.founder.energy + effect.delta))
      return { ...state, founder: { ...state.founder, energy } }
    }
    case 'bugs': {
      const bugs = Math.max(0, state.product.bugs + effect.delta)
      return {
        ...state,
        product: { ...state.product, bugs, quality: qualityFor(state, bugs) },
      }
    }
    case 'skill': {
      const cap =
        effect.skill === 'interviewing'
          ? state.scenario.experiments.interview.skillCap
          : state.scenario.sales.skillCap
      const value = Math.min(cap, Math.max(0, state.founder.skills[effect.skill] + effect.delta))
      return {
        ...state,
        founder: { ...state.founder, skills: { ...state.founder.skills, [effect.skill]: value } },
      }
    }
    case 'invoicePayChance': {
      let money = { payWeeks: state.hidden.payWeeks, waitsForChase: state.hidden.waitsForChase }
      for (const inv of state.invoices) {
        if (inv.customerId !== message.targetId || !isOverdue(inv, week)) continue
        if (rng.chance(effect.delta)) money = nudgeInvoice(money, inv.id, week)
      }
      return { ...state, hidden: { ...state.hidden, ...money } }
    }
    case 'churnChance': {
      const target = state.customers.find((c) => c.id === message.targetId)
      if (!target || target.churnedWeek !== null || !rng.chance(effect.delta)) return state
      const customers = state.customers.map((c) => (c === target ? { ...c, churnedWeek: week } : c))
      out.entries.push({
        kind: 'customer_churned',
        customerId: target.id,
        name: target.name,
        segmentId: target.segmentId,
        overPrice: false,
      })
      return { ...state, customers }
    }
    case 'newLeads':
      return addLeads(state, segmentOf(state, message, rng), effect.count, rng, 'inbox')
    case 'touchLead': {
      const leads = state.leads.map((l) =>
        l.id === message.targetId && isOpenLead(l)
          ? { ...l, silentSinceWeek: null, lastContactWeek: week }
          : l,
      )
      return { ...state, leads }
    }
    case 'lostHours':
      out.lostHours += effect.hours
      return state
    case 'moveOffice':
      return moveOffice(state, effect.stage)
    case 'officeMove': {
      const moved = acceptOffice(state, effect.stage)
      out.costsCents += moved.costCents
      out.entries.push(...moved.entries)
      return moved.state
    }
    case 'guests': {
      const b = state.bookings
      if (!b) return state
      const ids = Object.keys(b.repeatGuests)
      const seg = effect.segment ?? (ids.length ? rng.pick(ids) : null)
      if (!seg) return state
      const sent = b.eventGuests ?? {}
      return {
        ...state,
        bookings: { ...b, eventGuests: { ...sent, [seg]: (sent[seg] ?? 0) + effect.count } },
      }
    }
    case 'review': {
      const b = state.bookings
      if (!b) return state
      const reviews = b.reviews + effect.count
      const rating = ((b.rating ?? 0) * b.reviews + effect.rating * effect.count) / reviews
      return { ...state, bookings: { ...b, rating, reviews } }
    }
    case 'investorConfidence': {
      if (state.funding.stakes.length === 0) return state
      const confidence = Math.min(1, Math.max(0, state.hidden.funding.confidence + effect.delta))
      return {
        ...state,
        hidden: { ...state.hidden, funding: { ...state.hidden.funding, confidence } },
      }
    }
    case 'leisureInstructor':
      return loseLeisureInstructor(state, effect.role, rng)
    case 'leisureStart': {
      const b = state.bookings
      if (!b?.leisure) return state
      return {
        ...state,
        bookings: { ...b, leisure: { ...b.leisure, buildChoice: [...effect.products] } },
      }
    }
    case 'tender': {
      const t = applyTender(state, effect.bid, rng)
      out.entries.push(...t.entries)
      return t.state
    }
    case 'asset': {
      const done = chooseAsset(state, effect.id, effect.option)
      out.costsCents += done.costCents
      out.entries.push(...done.entries)
      return done.state
    }
    case 'assetRepair': {
      const done = repairAsset(state, effect.id)
      out.costsCents += done.costCents
      out.entries.push(...done.entries)
      return done.state
    }
    case 'fixedCost': {
      if (state.company.fixedCosts.some((c) => c.id === effect.id)) return state
      const cost = { id: effect.id, name: effect.name, monthlyCents: effect.monthlyCents }
      return {
        ...state,
        company: { ...state.company, fixedCosts: [...state.company.fixedCosts, cost] },
      }
    }
  }
}

/** The segment of the customer or lead a message is about, else a random one. */
function segmentOf(state: GameState, message: Message, rng: Rng): SegmentId {
  const target =
    state.customers.find((c) => c.id === message.targetId) ??
    state.leads.find((l) => l.id === message.targetId)
  return target?.segmentId ?? rng.pick(state.scenario.segments).id
}

function sender(state: GameState, event: ScenarioEvent, rng: Rng) {
  if (event.from === 'none') return { name: event.sender, targetId: null }
  if (event.from === 'customer') {
    const customer: Customer = rng.pick(activeCustomers(state))
    return { name: customer.name, targetId: customer.id }
  }
  const lead = rng.pick(state.leads.filter(isOpenLead))
  return { name: lead.name, targetId: lead.id }
}

/** Events that may arrive now: conditions hold, a sender exists, and not used up or cooling. */
function eligibleEvents(state: GameState, taken: ReadonlySet<string>): ScenarioEvent[] {
  return state.scenario.events.filter((e) => {
    if (taken.has(e.id)) return false
    // Triggered events arrive on their own (see `drawMessages`), never through the draw.
    if (e.trigger.length > 0) return false
    const drawn = state.drawnEvents.filter((d) => d.eventId === e.id)
    if (e.once && drawn.length > 0) return false
    const cooldown = e.cooldownWeeks ?? state.scenario.inbox.cooldownWeeks
    if (drawn.some((d) => state.week + 1 - d.week < cooldown)) return false
    if (e.from === 'customer' && activeCustomers(state).length === 0) return false
    if (e.from === 'lead' && !state.leads.some(isOpenLead)) return false
    return conditionsHold(state, e.when)
  })
}

/**
 * Plan section 4.10 and step 13: draws the messages for next week. Up to `maxPerWeek` slots, each
 * filled with the scenario's chance by a weighted draw among the eligible events, while fewer
 * than `openLimit` messages are open. If no slot was filled and fewer than `guaranteeBelowOpen`
 * messages are open, one more draw happens without the chance.
 */
/** The initial build choice is visible before the first week; older games add no messages. */
export function initialLeisureChoices(state: GameState): GameState {
  if (!state.scenario.bookings?.leisure) return state
  const events = state.scenario.events.filter(
    (event) =>
      event.choices.some((choice) =>
        choice.effects.some((effect) => effect.type === 'leisureStart'),
      ) && conditionsHold(state, event.when),
  )
  if (!events.length) return state
  return {
    ...state,
    inbox: [
      ...state.inbox,
      ...events.map((event, index) =>
        makeMessage(state, event, { name: event.sender, targetId: null }, state.week, index),
      ),
    ],
    drawnEvents: [
      ...state.drawnEvents,
      ...events.map((event) => ({ eventId: event.id, week: state.week })),
    ],
  }
}

export function drawMessages(state: GameState, rng: Rng): GameState {
  const cfg = state.scenario.inbox
  const arrival = state.week + 1
  const taken = new Set<string>()
  const added: Message[] = []
  const drawn: { eventId: string; week: number }[] = []
  let open = state.inbox.filter((m) => m.status === 'open' && !isTriggered(state, m)).length
  // Triggered events arrive for sure the first week any trigger holds. They sit outside the
  // draw: they never count as open messages for it and are made after it, so they never change
  // which events are drawn.
  // A triggered event that is not `once` (plan 3: an office offer) comes back once its cooldown
  // has passed since it last arrived, if a trigger still holds and no copy is open.
  const triggered = state.scenario.events.filter((e) => {
    if (e.trigger.length === 0) return false
    const drawn = state.drawnEvents.filter((d) => d.eventId === e.id)
    if (e.once ? drawn.length > 0 : drawn.some((d) => arrival - d.week < e.cooldownWeeks!)) {
      return false
    }
    if (state.inbox.some((m) => m.eventId === e.id && m.status === 'open')) return false
    return conditionsHold(state, e.when) && e.trigger.some((t) => conditionsHold(state, [t]))
  })
  for (let slot = 0; slot < cfg.maxPerWeek && open < cfg.openLimit; slot++) {
    if (!rng.chance(cfg.drawChance)) continue
    const eligible = eligibleEvents(state, taken)
    if (eligible.length === 0) break
    const total = eligible.reduce((sum, e) => sum + e.weight, 0)
    let r = rng.next() * total
    const event = eligible.find((e) => (r -= e.weight) < 0) ?? eligible[eligible.length - 1]
    if (!event) break
    const from = sender(state, event, rng)
    taken.add(event.id)
    open++
    drawn.push({ eventId: event.id, week: arrival })
    added.push(makeMessage(state, event, from, arrival, added.length))
  }
  // A quiet week still brings one message while the inbox is nearly empty.
  if (added.length === 0 && open < cfg.guaranteeBelowOpen) {
    const eligible = eligibleEvents(state, taken)
    const total = eligible.reduce((sum, e) => sum + e.weight, 0)
    if (total > 0) {
      let r = rng.next() * total
      const event = eligible.find((e) => (r -= e.weight) < 0) ?? eligible[eligible.length - 1]
      if (event) {
        const from = sender(state, event, rng)
        drawn.push({ eventId: event.id, week: arrival })
        added.push(makeMessage(state, event, from, arrival, 0))
      }
    }
  }
  for (const event of triggered) {
    const from = sender(state, event, rng)
    drawn.push({ eventId: event.id, week: arrival })
    added.push(makeMessage(state, event, from, arrival, added.length))
  }
  if (added.length === 0) return state
  return {
    ...state,
    inbox: [...state.inbox, ...added],
    drawnEvents: [...state.drawnEvents, ...drawn],
  }
}

function makeMessage(
  state: GameState,
  event: ScenarioEvent,
  from: { name: string; targetId: string | null },
  arrival: number,
  index: number,
): Message {
  const cfg = state.scenario.inbox
  return {
    id: `message_${state.inbox.length + index + 1}`,
    eventId: event.id,
    area: event.area,
    week: arrival,
    expiresWeek: arrival + (event.openWeeks ?? cfg.openWeeks) - 1,
    fromRole: event.sender,
    fromName: from.name,
    targetId: from.targetId,
    text: event.text.replaceAll('{name}', from.name),
    choices: event.choices.map((c) => ({
      id: c.id,
      label: c.label,
      hours: c.hours,
      costCents: c.effects.reduce(
        (sum, e) =>
          sum +
          (e.type === 'cash' && e.amountCents < 0 && isSure(e)
            ? -e.amountCents
            : e.type === 'officeMove'
              ? officeOneOff(state, e.stage)
              : 0),
        0,
      ),
      possibleCostCents: c.effects.reduce(
        (sum, e) =>
          sum + (e.type === 'cash' && e.amountCents < 0 && !isSure(e) ? -e.amountCents : 0),
        0,
      ),
      monthlyCostCents: c.effects.reduce(
        (sum, e) =>
          sum +
          (e.type === 'fixedCost'
            ? e.monthlyCents
            : e.type === 'moveOffice' || e.type === 'officeMove'
              ? officeRentChange(state, e.stage)
              : 0),
        0,
      ),
    })),
    status: 'open',
    choiceId: null,
  }
}

/** What a move adds to the monthly costs: the new stage's rent minus the current one. */
function officeRentChange(state: GameState, stageId: string): number {
  const rent = (id: string) =>
    state.scenario.officeStages.find((o) => o.id === id)?.monthlyCents ?? 0
  return Math.max(0, rent(stageId) - rent(state.company.officeStage))
}

/** What accepting a stage's offer costs at once: its one-off, unless a loan bought it. */
function officeOneOff(state: GameState, stageId: string): number {
  if (state.company.office.prepaid.includes(stageId)) return 0
  return state.scenario.officeStages.find((o) => o.id === stageId)?.oneOffCents ?? 0
}

/** A message from an event that arrives by trigger rather than by the draw. */
function isTriggered(state: GameState, m: Message): boolean {
  return (state.scenario.events.find((e) => e.id === m.eventId)?.trigger.length ?? 0) > 0
}
