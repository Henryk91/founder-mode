import type { FounderNoteView, GameState } from '../types'

/** The founder's note is shown in the first weeks only. */
export const FOUNDER_NOTE_LAST_WEEK = 4

/**
 * Picks the founder's note (plan section 2b). First matching rule wins. Rules read only what the
 * player can see, and the notes describe the situation, they never recommend a move. The text
 * comes from the scenario; `values` fill its placeholders ({name} plain, {name:eur} cents).
 */
export function selectFounderNote(state: GameState): FounderNoteView | null {
  if (state.week > FOUNDER_NOTE_LAST_WEEK) return null
  const notes = state.scenario.founderNotes
  const interviews = Object.values(state.knowledge).reduce((sum, list) => sum + list.length, 0)
  const shipped = state.product.features.some((f) => f.shippedWeek !== null)
  const leads = state.leads.length
  const living = state.founder.livingCostCentsPerWeek

  const note = (id: FounderNoteView['id'], values: Record<string, number>): FounderNoteView => ({
    id,
    template: notes[id],
    values,
  })

  if (state.week === 1) return note('first_week', {})
  if (leads === 0 && !shipped) {
    return interviews === 0
      ? note('no_evidence', { week: state.week, living })
      : note('only_interviews', { n: interviews })
  }
  if (leads === 0) return note('built_unseen', {})
  if (state.customers.length === 0) return note('leads_only', { n: leads })
  return null
}
