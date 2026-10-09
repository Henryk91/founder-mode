import type { StoreApi } from 'zustand/vanilla'
import { TopBar } from './components/TopBar'
import { label, type UiStage } from './labels'
import { Market } from './screens/Market'
import { Money } from './screens/Money'
import { Pipeline } from './screens/Pipeline'
import { Plan } from './screens/Plan'
import { Results } from './screens/Results'
import { Start } from './screens/Start'
import type { GameStore, Tab } from './store'
import { StoreProvider, useGame } from './useGame'
import styles from './App.module.css'

const TABS: Tab[] = ['plan', 'market', 'pipeline', 'money']
const SCREENS: Record<Tab, () => React.JSX.Element | null> = {
  plan: Plan,
  market: Market,
  pipeline: Pipeline,
  money: Money,
}

export function App({ store }: { store: StoreApi<GameStore> }) {
  return (
    <StoreProvider value={store}>
      <Root />
    </StoreProvider>
  )
}

function Root() {
  const view = useGame((s) => s.view)
  const report = useGame((s) => s.report)
  const tab = useGame((s) => s.tab)
  const setTab = useGame((s) => s.setTab)
  if (!view) return <Start />

  const stage: UiStage = view.company.uiStage
  // A finished run goes straight to its ending, even after a reload.
  const showResults = report !== null || view.status === 'ended'
  const Screen = SCREENS[tab]

  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.content}>{showResults ? <Results /> : <Screen />}</main>
      {!showResults && (
        <nav className={styles.tabs} aria-label={label('tab.nav', stage)}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={t === tab ? 'page' : undefined}
              className={`${styles.tab} ${t === tab ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {label(`tab.${t}`, stage)}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
