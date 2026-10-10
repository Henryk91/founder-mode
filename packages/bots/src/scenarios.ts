import type { ScenarioId } from '@founder-mode/content'
import type { ChannelId } from '@founder-mode/engine'

/**
 * What the bots need to know about a scenario beyond its content: parameters of the bots, not
 * scenario values (decisions log, Phase 3), so they live in bot code.
 */
export type BotScenario = {
  /**
   * The hand playtest, replayed on every seed: always this market, whether or not it is the good
   * one, building these features. `note` is what the hand playtest itself reached by the check
   * week, or null when nobody has played the scenario by hand yet.
   */
  playtest: { segment: string; features: string[]; channel: ChannelId; note: string | null }
}

export const BOT_SCENARIOS: Record<ScenarioId, BotScenario> = {
  kantino: {
    playtest: {
      segment: 'coworking',
      features: ['basic_ordering', 'multi_site', 'member_billing'],
      channel: 'in_person',
      note: 'The hand playtest found 9 customers and 2,700 EUR monthly revenue by week {week}.',
    },
  },
}

export function botScenario(id: string): BotScenario {
  const found = (BOT_SCENARIOS as Record<string, BotScenario | undefined>)[id]
  if (!found) throw new Error(`No bot settings for scenario ${id}`)
  return found
}
