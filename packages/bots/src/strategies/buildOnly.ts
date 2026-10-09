import { PlanBuilder, type Strategy } from '../strategy'

export const buildOnly: Strategy = {
  id: 'build_only',
  description:
    'Builds every feature in list order and fixes bugs. Never talks to anyone. Does the books.',
  create: () => ({
    plan(view) {
      const b = new PlanBuilder(view, 50)
      b.bookkeeping()
      for (const f of view.product.features) b.build(f.id, b.free)
      b.fixBugs(b.free)
      return b.plan
    },
  }),
}
