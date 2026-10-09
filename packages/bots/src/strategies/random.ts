import type { ChannelId } from '@founder-mode/engine'
import { BotRng } from '../botRng'
import { bookableLeads, PlanBuilder, type Strategy } from '../strategy'

export const random: Strategy = {
  id: 'random',
  description: 'Spends a random 30 to 65 h on random actions in random markets.',
  create(_scenario, seed) {
    const rng = new BotRng(`random/${seed}`)
    return {
      plan(view) {
        const b = new PlanBuilder(view, rng.int(30, 65))
        const segments = view.segments.map((s) => s.id)
        const leads = bookableLeads(view).filter(() => rng.next() < 0.5)
        b.demos(leads)
        while (b.free > 0) {
          const hours = Math.min(b.free, rng.int(2, 15))
          const seg = rng.pick(segments)
          let used = 0
          switch (rng.int(0, 5)) {
            case 0:
              used = b.interviews(seg, Math.ceil(hours / view.costs.interviewHours))
              break
            case 1:
            case 2:
              used = b.build(rng.pick(view.product.features).id, hours)
              break
            case 3:
              used = b.outreach(seg, rng.pick(view.channels) as ChannelId, hours)
              break
            case 4:
              used = b.fixBugs(hours)
              break
            default:
              used = b.rest(hours)
          }
          // Nothing fitted (a shipped feature, no bugs): rest instead so the loop ends.
          if (used === 0) b.rest(Math.min(b.free, 1))
        }
        return b.plan
      },
    }
  },
}
