// Browser-test entry only. The production entry never imports it.
import { createRoot } from 'react-dom/client'
import { parseScenario } from '../../../packages/content/src/parse'
import { sources } from '../../../packages/content/src/sources/griffig'
import { tourismPlayer, CAREFUL_TOURISM } from '../../../packages/bots/src/strategies/tourism'
import { App, preloadScreens } from '../src/App'
import { createGameStore } from '../src/store'
import { memoryStorage } from '../src/storage'
import '../src/index.css'
const stage = new URLSearchParams(location.search).get('stage')
const scenario = parseScenario(sources, 'long')
function preview(seed: string) {
  const store = createGameStore({
    storage: memoryStorage(),
    makeSeed: () => seed,
    scenario: () => scenario,
    ...(stage === 'established' || stage === 'organised' ? { previewStage: stage } : {}),
  })
  store.getState().startRun(seed)
  if (stage !== 'scrappy') {
    const player = tourismPlayer(scenario, CAREFUL_TOURISM, seed)
    while (store.getState().view!.status === 'running' && store.getState().view!.week < 32) {
      for (const a of player.respond?.(store.getState().view!) ?? [])
        store.getState().answer(a.messageId, a.choiceId)
      const week = store.getState().view!.week
      store.setState({ plan: player.plan(store.getState().view!) })
      store.getState().endWeek()
      if (store.getState().view!.week === week)
        throw Error('Climbing preview produced an invalid plan')
      player.observe?.(store.getState().report!, store.getState().view!)
      store.getState().dismissReport()
    }
  }
  store.setState({ introStep: null })
  return store
}
let store = preview('climbing-smoke')
// Numeric tuning can end a fixture before its screen week;use another real action sequence.
if (stage !== 'scrappy') {
  for (let i = 0; store.getState().view!.status !== 'running' && i < 50; i++)
    store = preview(`screen-${i}`)
  if (store.getState().view!.status !== 'running')
    throw Error('No climbing preview seed lasts to week32')
}
await preloadScreens()
store.getState().markReady()
createRoot(document.getElementById('root')!).render(<App store={store} />)
