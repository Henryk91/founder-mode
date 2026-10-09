import type { ChannelId } from '@founder-mode/engine'
import { BotRng } from '../botRng'
import { bookableLeads, PlanBuilder, type Strategy } from '../strategy'

/**
 * The random bot. Its answers to the inbox use their own random stream, so with or without
 * answers the plan decisions come from the same sequence of draws.
 */
function makeRandom(id: string, answers: boolean): Strategy {
  return {
    id,
    description:
      'Spends a random 30 to 65 h on random actions in random markets, including tests, pre-sales and invoice chasing' +
      (answers
        ? ', and answers about half of the messages with a random choice.'
        : ', and never answers a message.'),
    create(_scenario, seed) {
      const rng = new BotRng(`random/${seed}`)
      const answerRng = new BotRng(`random-answers/${seed}`)
      return {
        respond(view) {
          if (!answers) return []
          // Answers about half of the messages with a random choice that fits the week.
          const fits = (hours: number) =>
            view.committedHours + view.forcedHours + hours <= view.founder.maxHoursPerWeek
          return view.inbox
            .filter((m) => m.answeredChoiceId === null && answerRng.next() < 0.5)
            .flatMap((m) => {
              const choice = answerRng.pick(m.choices)
              return fits(choice.hours) ? [{ messageId: m.id, choiceId: choice.id }] : []
            })
        },
        plan(view) {
          const b = new PlanBuilder(view, rng.int(30, 65))
          // Sometimes runs a test, a pre-sale or a chase, like everything else at random.
          if (rng.next() < 0.3) b.landing(rng.pick(view.segments).id)
          if (rng.next() < 0.3) b.presale(rng.pick(view.segments).id)
          if (rng.next() < 0.5) b.chase(rng.int(1, 3))
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
}

export const random = makeRandom('random', true)
/** For the report only: the random bot with the inbox left alone. */
export const randomNoInbox = makeRandom('random_no_inbox', false)
