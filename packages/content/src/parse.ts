import { parse } from 'yaml'
import { EVENT_AREAS, ScenarioSchema, type EventArea, type GameMode, type Scenario } from './schema'

// Parsing a scenario's YAML files into a checked `Scenario`. No YAML files are imported here, so
// the web bundle can load each scenario's files separately (step 8).

export type ScenarioSources = {
  scenario: string
  features: string
  interviewQuotes: string
  companyNames: string
  intro: string
  /**
   * One events file per area. Every event in a file belongs to that area. An entry
   * `{ shared: <id> }` places a shared event of the same area at that position.
   */
  events: Record<EventArea, string>
  /** Events shared by every scenario, one file per area. */
  sharedEvents: Record<EventArea, string>
  /**
   * Long mode only: events of the second year, shared by every scenario with a long mode, any
   * area. The 60 week game never loads them, so its scenario and fingerprint are untouched.
   */
  longEvents: string
  /** Long mode events about investors (Part D), drawn only once money is raised. */
  fundingEvents?: string
}

/** Events every scenario gets: the founder's life, money, the hire, generic sales moments. */
/** The id of an event entry, or of the shared event it places. */
const entryKey = (e: unknown): { id: unknown; shared: unknown } => {
  const obj = (e ?? {}) as { id?: unknown; shared?: unknown }
  return { id: obj.id, shared: obj.shared }
}

/**
 * A scenario's events of one area, with shared events in place: each `{ shared: id }` entry is
 * replaced by that shared event, and shared events not placed follow the scenario's own, in the
 * shared file's order. Placement keeps the draw order, which decides which event a roll picks.
 */
export function areaEvents(area: EventArea, own: string, shared: string): unknown[] {
  const pool = eventsIn(shared)
  const byId = new Map<unknown, unknown>()
  for (const e of pool) {
    const { id, area: actual } = (e ?? {}) as { id?: unknown; area?: unknown }
    if (actual !== area) {
      throw new Error(
        `shared event ${String(id)} is in the ${area} file but has area ${String(actual)}`,
      )
    }
    byId.set(id, e)
  }
  const placed = new Set<unknown>()
  const list = eventsIn(own).map((e) => {
    const { id, shared: ref } = entryKey(e)
    if (ref === undefined) {
      const actual = (e as { area?: unknown }).area
      if (actual !== area) {
        throw new Error(`event ${String(id)} is in the ${area} file but has area ${String(actual)}`)
      }
      return e
    }
    if (!byId.has(ref)) throw new Error(`no shared ${area} event ${String(ref)}`)
    if (placed.has(ref)) throw new Error(`shared event ${String(ref)} is placed twice`)
    placed.add(ref)
    return byId.get(ref)
  })
  return [...list, ...pool.filter((e) => !placed.has(entryKey(e).id))]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * `base` with `over` laid on top: objects merge key by key, everything else (numbers, strings,
 * arrays) is replaced. Neither input is changed.
 */
export function mergeOverride(base: unknown, over: unknown): unknown {
  if (!isObject(base) || !isObject(over)) return over
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? mergeOverride(base[k], v) : v
  return out
}

/**
 * The scenario file for one mode. The 60 week game is the file without its `modes` block, so its
 * parsed scenario and fingerprint are exactly those of a file that never had one. Long mode lays
 * `modes.long` over the file and marks the result `mode: long`.
 */
function fileForMode(file: unknown, mode: GameMode, id: string): unknown {
  if (!isObject(file)) return file
  // `longOnly`: a scenario that has no 60 week game (the tourism scenarios).
  const { modes, longOnly, ...rest } = file
  if (mode === 'standard') {
    if (longOnly === true) throw new Error(`scenario ${id} has no standard mode`)
    return rest
  }
  const over = isObject(modes) ? modes[mode] : undefined
  if (!isObject(over)) throw new Error(`scenario ${id} has no ${mode} mode`)
  return { ...(mergeOverride(rest, over) as Record<string, unknown>), mode }
}

/** The modes a scenario's file defines: always the 60 week game, plus any `modes` block. */
export function modesIn(source: string): GameMode[] {
  const file: unknown = parse(source)
  const modes = isObject(file) && isObject(file['modes']) ? Object.keys(file['modes']) : []
  const long = modes.includes('long') ? (['long'] as const) : []
  if (isObject(file) && file['longOnly'] === true) return [...long]
  return ['standard', ...long]
}

/** Parses and validates the YAML files of one scenario. Throws on any schema error. */
export function parseScenario(sources: ScenarioSources, mode: GameMode = 'standard'): Scenario {
  const raw: unknown = parse(sources.scenario)
  const file = fileForMode(raw, mode, String(isObject(raw) ? raw['id'] : ''))
  const intro: unknown = parse(sources.intro)
  // Long mode adds the second year's events after every area's own, so the draw order of the
  // others is kept.
  const events = [
    ...EVENT_AREAS.flatMap((area) =>
      areaEvents(area, sources.events[area], sources.sharedEvents[area]),
    ),
    ...(mode === 'long' ? eventsIn(sources.longEvents) : []),
    ...(mode === 'long' && sources.fundingEvents ? eventsIn(sources.fundingEvents) : []),
  ]
  return ScenarioSchema.parse({
    ...(typeof file === 'object' && file !== null ? file : {}),
    ...(typeof intro === 'object' && intro !== null ? intro : {}),
    events,
    features: parse(sources.features),
    interviewQuotes: parse(sources.interviewQuotes),
    companyNames: parse(sources.companyNames),
  })
}

/** The `events` list of one events file, unchecked; the scenario schema checks it. */
export function eventsIn(source: string): unknown[] {
  const file: unknown = parse(source)
  const events =
    typeof file === 'object' && file !== null ? (file as { events?: unknown }).events : null
  return Array.isArray(events) ? events : []
}
