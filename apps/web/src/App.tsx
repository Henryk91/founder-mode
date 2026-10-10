import type { StoreApi } from 'zustand/vanilla'
import { Help } from './components/Help'
import { Intro } from './components/Intro'
import { DeskLayout } from './layout/DeskLayout'
import { PhoneLayout } from './layout/PhoneLayout'
import { useWide } from './layout/useWide'
import { PostMortem } from './screens/PostMortem'
import { notableMoments, Results } from './screens/Results'
import { Start } from './screens/Start'
import type { GameStore } from './store'
import { StoreProvider, useGame } from './useGame'

export type LayoutChoice = 'desk' | 'phone'

/** `layout` forces one layout, for tests; otherwise the window width decides. */
export function App({ store, layout }: { store: StoreApi<GameStore>; layout?: LayoutChoice }) {
  return (
    <StoreProvider value={store}>
      <Root layout={layout} />
    </StoreProvider>
  )
}

function Root(props: { layout?: LayoutChoice | undefined }) {
  const view = useGame((s) => s.view)
  const report = useGame((s) => s.report)
  const introStep = useGame((s) => s.introStep)
  const helpOpen = useGame((s) => s.helpOpen)
  const momentsSeen = useGame((s) => s.momentsSeen)
  const wide = useWide()
  if (!view) return <Start />
  if (introStep !== null) return <Intro />
  const desk = props.layout ? props.layout === 'desk' : wide

  // A finished run shows its full screen moments, then the post-mortem, even after a reload.
  const momentPending = report !== null && notableMoments(report, view).length > momentsSeen
  if (view.status === 'ended' && !momentPending) return <PostMortem desk={desk} />

  const main = helpOpen ? <Help /> : report !== null ? <Results /> : null
  return desk ? <DeskLayout main={main} /> : <PhoneLayout main={main} />
}
