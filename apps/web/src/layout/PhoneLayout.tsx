import { useState } from 'react'
import { Explain } from '../components/Explain'
import { SceneStrip } from '../components/Scene'
import { StorageNote } from '../components/StorageNote'
import { TopBar } from '../components/TopBar'
import { label } from '../labels'
import type { Tab } from '../store'
import { useGame } from '../useGame'
import { HoursBarOutOfView } from './hoursBar'
import { SCREENS, TABS } from './screens'
import styles from './Layout.module.css'

/** Below 900 px: one screen at a time, pinned top bar and numbers, five tabs at the bottom. */
export function PhoneLayout(props: { main: React.ReactNode | null }) {
  const view = useGame((s) => s.view)!
  const tab = useGame((s) => s.tab)
  const setTab = useGame((s) => s.setTab)
  const stage = view.company.uiStage
  const openMessages = view.inbox.filter((m) => m.answeredChoiceId === null).length
  const Screen = SCREENS[tab]
  const [barOut, setBarOut] = useState(false)
  const onPlan = props.main === null && tab === 'plan'

  return (
    <div className={styles.phone} data-stage={stage} data-layout="phone">
      <TopBar wide={false} planHours={onPlan ? barOut : null} />
      {props.main === null && tab === 'inbox' && <SceneStrip />}
      <main className={styles.phoneContent}>
        <StorageNote />
        <Explain />
        <HoursBarOutOfView value={setBarOut}>{props.main ?? <Screen />}</HoursBarOutOfView>
      </main>
      {props.main === null && (
        <nav className={styles.tabs} aria-label={label('tab.nav', stage)}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={t === tab ? 'page' : undefined}
              className={`${styles.tab} ${t === tab ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              <TabIcon tab={t} />
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

/** Simple line icons; the tab name is always written below, so the icon is never the only cue. */
function TabIcon({ tab }: { tab: Tab }) {
  const paths: Record<Tab, React.ReactNode> = {
    inbox: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
    plan: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pipeline: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="10" rx="1" />
        <rect x="17" y="4" width="4" height="6" rx="1" />
      </>
    ),
    market: (
      <>
        <path d="M4 6h16v10H9l-5 4z" />
      </>
    ),
    money: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  }
  return (
    <svg
      className={styles.tabIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[tab]}
    </svg>
  )
}
