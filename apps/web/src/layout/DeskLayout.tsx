import { Explain } from '../components/Explain'
import { MilestoneBar } from '../components/MilestoneBar'
import { Scene } from '../components/Scene'
import { TopBar } from '../components/TopBar'
import { label } from '../labels'
import { Inbox } from '../screens/Inbox'
import { Market } from '../screens/Market'
import { Money } from '../screens/Money'
import { Pipeline } from '../screens/Pipeline'
import { Plan } from '../screens/Plan'
import { useGame } from '../useGame'
import styles from './Layout.module.css'

/**
 * 900 px and wider: the inbox on the left, the scene with My week or Market and the corkboard in
 * the centre, money and what is coming up on the right. Same screens as the phone, side by side.
 * Results and help take the centre alone.
 */
export function DeskLayout(props: { main: React.ReactNode | null }) {
  const view = useGame((s) => s.view)!
  const tab = useGame((s) => s.tab)
  const setTab = useGame((s) => s.setTab)
  const stage = view.company.uiStage
  const centre = tab === 'market' ? 'market' : 'plan'

  return (
    <div className={styles.desk} data-stage={stage} data-layout="desk">
      <TopBar wide />
      {props.main !== null ? (
        <main className={styles.deskSingle}>
          <Explain />
          {props.main}
        </main>
      ) : (
        <div className={styles.deskColumns}>
          <aside className={styles.left} aria-label={label('tab.inbox', stage)}>
            <Inbox desk />
          </aside>
          <main className={styles.centre}>
            <Explain />
            <Scene />
            <MilestoneBar />
            <nav className={styles.strip} aria-label={label('desk.centreNav', stage)}>
              {(['plan', 'market'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={t === centre ? 'page' : undefined}
                  className={`${styles.stripTab} ${t === centre ? styles.stripTabActive : ''}`}
                  onClick={() => setTab(t)}
                >
                  {label(t === 'plan' ? 'plan.title' : 'tab.market', stage)}
                </button>
              ))}
            </nav>
            {centre === 'plan' ? <Plan /> : <Market />}
            <Pipeline />
          </main>
          <aside className={styles.right} aria-label={label('tab.money', stage)}>
            <Money />
          </aside>
        </div>
      )}
    </div>
  )
}
