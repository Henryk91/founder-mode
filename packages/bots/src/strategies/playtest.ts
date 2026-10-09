import { bookableLeads, PlanBuilder, type Strategy } from '../strategy'

const SEGMENT = 'coworking'
const FEATURES = ['basic_ordering', 'multi_site', 'member_billing']

/**
 * The hand playtest of 2026-10 (seed "review1"), replayed on every seed: always coworking,
 * whether or not coworking is the good market in that run.
 */
export const playtest: Strategy = {
  id: 'playtest',
  description:
    'The hand playtest: 5 interviews per market in week 1, builds the three coworking features in weeks 2 to 4, 45 h of in person outreach to coworking in weeks 5 to 7, then every demo plus 15 h of outreach a week.',
  create: () => ({
    plan(view) {
      const b = new PlanBuilder(view, 65)
      b.bookkeeping()
      b.chase(3)
      if (view.week === 1) {
        for (const s of view.segments) b.interviews(s.id, 5)
      } else if (view.week <= 4) {
        let hours = 45
        for (const f of FEATURES) hours -= b.build(f, hours)
      } else if (view.week <= 7) {
        b.demos(bookableLeads(view))
        b.outreach(SEGMENT, 'in_person', 45)
      } else {
        b.demos(bookableLeads(view))
        b.outreach(SEGMENT, 'in_person', 15)
      }
      return b.plan
    },
  }),
}
