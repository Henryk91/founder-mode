import type { GameMode, ScenarioAbout } from '@founder-mode/content'
import { label, type Voice } from './labels'

/** How the Start screen offers its categories: by how many there are. */
export type CategoryLayout = 'none' | 'tabs' | 'chips' | 'grid'

/** None for one category, a tab switch for two or three, chips to six, a grid from seven. */
export function categoryLayout(count: number): CategoryLayout {
  if (count <= 1) return 'none'
  if (count <= 3) return 'tabs'
  if (count <= 6) return 'chips'
  return 'grid'
}

/** A category offers a tag filter only above this many companies. */
export const FILTER_ABOVE = 6

/** The run length tag: "60 weeks", "104 weeks", or "60 or 104 weeks". */
export function lengthTag(modes: readonly GameMode[], voice: Voice): string {
  if (modes.includes('standard') && modes.includes('long')) return label('start.length.both', voice)
  return label(modes.includes('long') ? 'start.mode.long' : 'start.mode.standard', voice)
}

/** A row's tags: its length first, then its own. */
export const tagsOf = (about: ScenarioAbout, voice: Voice): string[] => [
  lengthTag(about.modes, voice),
  ...about.tags,
]

/** The companies of a category: those played recently first, the most recent first, then content order. */
export function companiesIn(
  scenarios: readonly ScenarioAbout[],
  category: string,
  recent: readonly string[],
): ScenarioAbout[] {
  const rank = (id: string) => {
    const i = recent.indexOf(id)
    return i === -1 ? recent.length : i
  }
  return scenarios
    .map((about, order) => ({ about, order }))
    .filter((x) => x.about.category === category)
    .sort((a, b) => rank(a.about.id) - rank(b.about.id) || a.order - b.order)
    .map((x) => x.about)
}

/** Every tag of a list of companies, in the order they first appear. */
export function tagsIn(companies: readonly ScenarioAbout[], voice: Voice): string[] {
  return [...new Set(companies.flatMap((c) => tagsOf(c, voice)))]
}
