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
  /**
   * Share of landing page visitors who must sign up for the careful bot to keep a market. Set to
   * the scenario's sign up rate at a pain of about 0.33. A relative rule (markets compared with
   * each other, no fixed bar) is to replace it in the Phase 8 balance pass.
   */
  landingBar: number
  /**
   * The careful bot's pre-sales in its chosen market: `refute` pitches a second batch only when
   * the first found nobody (Kantino); `all` pitches every batch the market allows, deposit or not,
   * where deposits are the strong signal (Zollstock: tradespeople ignore adverts).
   */
  presales: 'refute' | 'all'
}

export const BOT_SCENARIOS: Record<ScenarioId, BotScenario> = {
  kantino: {
    playtest: {
      segment: 'coworking',
      features: ['basic_ordering', 'multi_site', 'member_billing'],
      channel: 'in_person',
      note: 'The hand playtest found 9 customers and 2,700 EUR monthly revenue by week {week}.',
    },
    // 0.02 + 0.15 x 0.33
    landingBar: 0.07,
    presales: 'refute',
  },
  // Nobody has played Zollstock by hand yet. The bot replays Kantino's playtest on the market
  // that plays coworking's part: the highest willingness to pay and the longest build.
  zollstock: {
    playtest: {
      segment: 'contractors',
      features: ['job_board', 'crew_dispatch', 'material_lists'],
      channel: 'in_person',
      note: null,
    },
    // 0.01 + 0.08 x 0.33: tradespeople click ads about half as often
    landingBar: 0.037,
    presales: 'all',
  },
}

export function botScenario(id: string): BotScenario {
  const found = (BOT_SCENARIOS as Record<string, BotScenario | undefined>)[id]
  if (!found) throw new Error(`No bot settings for scenario ${id}`)
  return found
}
