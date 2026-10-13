import { preloadScenarios } from '../src/scenarios'

// Tests build stores without injecting scenarios: load them all first, as the app does.
await preloadScenarios()
