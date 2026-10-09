import { BotRng } from '../botRng'
import { bookableLeads, PlanBuilder, type Strategy } from '../strategy'

const BUILD_HOURS = 20

export const sellFirst: Strategy = {
  id: 'sell_first',
  description:
    'Does outreach from week 1 without interviews, by phone in every market, then focuses on the market that asked for most demos. Builds the core feature, then the others in a random order. Chases three late invoices a week.',
  create(_scenario, seed) {
    const rng = new BotRng(`sell_first/${seed}`)
    let order: string[] | null = null
    return {
      plan(view) {
        const b = new PlanBuilder(view, 50)
        b.chase(3)
        if (!order) {
          const [core, ...rest] = view.product.features.map((f) => f.id)
          order = [core!, ...rng.shuffle(rest)]
        }
        b.demos(bookableLeads(view))
        if (view.product.bugs >= 3) b.fixBugs(8)
        let building = BUILD_HOURS
        for (const id of order) building -= b.build(id, building)
        // Markets ranked by how many of their leads asked for a demo so far.
        const asked = (id: string) =>
          view.leads.filter((l) => l.segmentId === id && l.stage !== 'lead').length
        const ranked = [...view.segments].sort((x, y) => asked(y.id) - asked(x.id))
        if (view.week <= 4) {
          const share = Math.floor(b.free / ranked.length)
          for (const s of ranked) b.outreach(s.id, 'phone', share)
        } else {
          b.outreach(ranked[0]!.id, 'phone', b.free)
        }
        return b.plan
      },
    }
  },
}
