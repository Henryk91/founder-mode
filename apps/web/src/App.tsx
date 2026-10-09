import type { StoreApi } from 'zustand/vanilla'
import { Help } from './components/Help'
import { Intro } from './components/Intro'
import { DeskLayout } from './layout/DeskLayout'
import { PhoneLayout } from './layout/PhoneLayout'
import { useWide } from './layout/useWide'
import { Results } from './screens/Results'
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
  const wide = useWide()
  if (!view) return <Start />
  if (introStep !== null) return <Intro />

  // A finished run goes straight to its ending, even after a reload.
  const showResults = report !== null || view.status === 'ended'
  const main = helpOpen ? <Help /> : showResults ? <Results /> : null
  const desk = props.layout ? props.layout === 'desk' : wide
  return desk ? <DeskLayout main={main} /> : <PhoneLayout main={main} />
}
