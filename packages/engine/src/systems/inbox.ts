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
import { isOverdue } from './invoices'
import { qualityFor } from './product'
import { pickName } from './sales'

/** What resolving messages adds to the week besides changes to the state. */
export type MessageOutcome = {
  state: GameState
  entries: ReportEntry[]
  /** Hours taken out of next week. */
  lostHours: number
  costsCents: number
  incomeCents: number
}

const isOpenLead = (l: Lead) => l.stage === 'lead' || l.stage === 'demo' || l.stage === 'trial'

function eventById(state: GameState, id: string): ScenarioEvent {
  const event = state.scenario.events.find((e) => e.id === id)
  if (!event) throw new Error(`Unknown event ${id}`)
  return event
}

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
  const out: MessageOutcome = { state, entries: [], lostHours: 0, costsCents: 0, incomeCents: 0 }
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
  out.state = { ...state, inbox, eventLog: [...state.eventLog, ...events] }
  return out
}

function applyEffect(
  state: GameState,
  effect: Effect,
  message: Message,
  rng: Rng,
  out: MessageOutcome,
): GameState {
  // A chance of 1 needs no roll, so certain effects do not move the random sequence.
  if (effect.chance < 1 && !rng.chance(effect.chance)) return state
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
      const payWeeks = { ...state.hidden.payWeeks }
      for (const inv of state.invoices) {
        if (inv.customerId !== message.targetId || !isOverdue(inv, week)) continue
        const planned = payWeeks[inv.id]
        if (rng.chance(effect.delta) && planned !== null && planned !== undefined) {
          payWeeks[inv.id] = Math.min(planned, week + 1)
        }
      }
      return { ...state, hidden: { ...state.hidden, payWeeks } }
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
      })
      return { ...state, customers }
    }
    case 'newLeads':
      return addLeads(state, segmentOf(state, message, rng), effect.count, rng)
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

function addLeads(state: GameState, segmentId: SegmentId, count: number, rng: Rng): GameState {
  const leads = [...state.leads]
  const used = new Set(leads.map((l) => l.name))
  const parts = state.scenario.companyNames[segmentId] ?? { first: [], second: [] }
  for (let i = 0; i < count; i++) {
    const name = pickName(parts, used, rng)
    used.add(name)
    leads.push({
      id: `lead_${leads.length + 1}`,
      name,
      segmentId,
      stage: 'lead',
      stageSinceWeek: state.week,
      lastContactWeek: state.week,
      silentSinceWeek: null,
      lostReason: null,
    })
  }
  return { ...state, leads }
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
 * than `openLimit` messages are open.
 */
export function drawMessages(state: GameState, rng: Rng): GameState {
  const cfg = state.scenario.inbox
  const arrival = state.week + 1
  const taken = new Set<string>()
  const added: Message[] = []
  const drawn: { eventId: string; week: number }[] = []
  let open = state.inbox.filter((m) => m.status === 'open').length
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
    added.push({
      id: `message_${state.inbox.length + added.length + 1}`,
      eventId: event.id,
      area: event.area,
      week: arrival,
      expiresWeek: arrival + cfg.openWeeks - 1,
      fromRole: event.sender,
      fromName: from.name,
      targetId: from.targetId,
      text: event.text.replaceAll('{name}', from.name),
      choices: event.choices.map((c) => ({
        id: c.id,
        label: c.label,
        hours: c.hours,
        costCents: c.effects.reduce(
          (sum, e) => sum + (e.type === 'cash' && e.amountCents < 0 ? -e.amountCents : 0),
          0,
        ),
        monthlyCostCents: c.effects.reduce(
          (sum, e) => sum + (e.type === 'fixedCost' ? e.monthlyCents : 0),
          0,
        ),
      })),
      status: 'open',
      choiceId: null,
    })
  }
  if (added.length === 0) return state
  return {
    ...state,
    inbox: [...state.inbox, ...added],
    drawnEvents: [...state.drawnEvents, ...drawn],
  }
}
