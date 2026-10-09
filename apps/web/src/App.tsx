import type { StoreApi } from 'zustand/vanilla'
import { Explain } from './components/Explain'
import { Help } from './components/Help'
import { Intro } from './components/Intro'
import { TopBar } from './components/TopBar'
import { label, type UiStage } from './labels'
import { Inbox } from './screens/Inbox'
import { Market } from './screens/Market'
import { Money } from './screens/Money'
import { Pipeline } from './screens/Pipeline'
import { Plan } from './screens/Plan'
import { Results } from './screens/Results'
import { Start } from './screens/Start'
import { Team } from './screens/Team'
import type { GameStore, Tab } from './store'
import { StoreProvider, useGame } from './useGame'
import styles from './App.module.css'

const TABS: Tab[] = ['plan', 'inbox', 'market', 'pipeline', 'team', 'money']
const SCREENS: Record<Tab, () => React.JSX.Element | null> = {
  plan: Plan,
  inbox: Inbox,
  market: Market,
  pipeline: Pipeline,
  team: Team,
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
  const introStep = useGame((s) => s.introStep)
  const helpOpen = useGame((s) => s.helpOpen)
  if (!view) return <Start />
  if (introStep !== null) return <Intro />

  const stage: UiStage = view.company.uiStage
  const openMessages = view.inbox.filter((m) => m.answeredChoiceId === null).length
  // A finished run goes straight to its ending, even after a reload.
  const showResults = report !== null || view.status === 'ended'
  const Screen = SCREENS[tab]

  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.content}>
        <Explain />
        {helpOpen ? <Help /> : showResults ? <Results /> : <Screen />}
      </main>
      {!showResults && !helpOpen && (
        <nav className={styles.tabs} aria-label={label('tab.nav', stage)}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={t === tab ? 'page' : undefined}
              className={`${styles.tab} ${t === tab ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'inbox' && openMessages > 0
                ? label('tab.inboxCount', stage, { n: openMessages })
                : label(`tab.${t}`, stage)}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
