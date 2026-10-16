import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, preloadScreens } from './App'
import { browserProfiles, browserStorage } from './storage'
import { preloadScenarios } from './scenarios'
import { createGameStore } from './store'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

// The seed only picks the market; the engine itself never reads the clock or Math.random.
const makeSeed = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 36 ** 4).toString(36)}`
// Plan 3: a dev build can preview a UI stage, `?stage=established`. Never in production.
const preview = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('stage')
  : null
const store = createGameStore({
  storage: browserStorage(),
  makeSeed,
  profiles: browserProfiles(),
  ...(preview === 'established' || preview === 'organised' ? { previewStage: preview } : {}),
})

createRoot(root).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)

// The scenarios and the screens after the Start screen load after the first paint; the Start
// screen offers a run once both are in, so opening a run never shows a blank page.
void Promise.all([preloadScenarios(), preloadScreens()]).then(() => store.getState().markReady())
