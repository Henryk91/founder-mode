import { preloadScreens } from '../src/App'
import { preloadScenarios } from '../src/scenarios'

// Tests build stores without injecting scenarios: load them all first, as the app does. The
// screens after the Start screen too, which the app fetches after its first paint.
await preloadScenarios()
await preloadScreens()
