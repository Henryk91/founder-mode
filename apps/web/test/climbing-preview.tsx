// Browser-test entry only. The production entry and scenario catalogue never import it.
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
const store = createGameStore({
  storage: memoryStorage(),
  makeSeed: () => 'climbing-smoke',
  scenario: () => scenario,
  ...(stage === 'established' || stage === 'organised' ? { previewStage: stage } : {}),
})
store.getState().startRun('climbing-smoke')
if (stage !== 'scrappy') {
  const player = tourismPlayer(scenario, CAREFUL_TOURISM, 'climbing-smoke')
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
await preloadScreens()
store.getState().markReady()
createRoot(document.getElementById('root')!).render(<App store={store} />)
