import { botScenario } from '../scenarios'
import { bookableLeads, PlanBuilder, type Strategy } from '../strategy'

/**
 * The hand playtest of 2026-10 (Kantino, seed "review1"), replayed on every seed: always the
 * scenario's playtest market (`BOT_SCENARIOS`), whether or not it is the good market in that run.
 */
export const playtest: Strategy = {
  id: 'playtest',
  description: 'The hand playtest, replayed on every seed.',
  describe: (scenario) => {
    const { segment } = botScenario(scenario.id).playtest
    return `The hand playtest: 5 interviews per market in week 1, builds the three ${segment} features in weeks 2 to 4, 45 h of in person outreach to ${segment} in weeks 5 to 7, then every demo plus 15 h of outreach a week.`
  },
  create: (scenario) => {
    const { segment, features, channel } = botScenario(scenario.id).playtest
    return {
      plan(view) {
        const b = new PlanBuilder(view, 65)
        b.chase(3)
        if (view.week === 1) {
          for (const s of view.segments) b.interviews(s.id, 5)
        } else if (view.week <= 4) {
          let hours = 45
          for (const f of features) hours -= b.build(f, hours)
        } else if (view.week <= 7) {
          b.demos(bookableLeads(view))
          b.outreach(segment, channel, 45)
        } else {
          b.demos(bookableLeads(view))
          b.outreach(segment, channel, 15)
        }
        return b.plan
      },
    }
  },
}
