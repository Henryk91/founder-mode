import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { browserStorage } from './storage'
import { createGameStore } from './store'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

// The seed only picks the market; the engine itself never reads the clock or Math.random.
const makeSeed = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 36 ** 4).toString(36)}`
const store = createGameStore({ storage: browserStorage(), makeSeed })

createRoot(root).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
