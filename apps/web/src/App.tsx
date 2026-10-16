import { useEffect, useRef } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { ErrorBoundary } from './components/ErrorBoundary'
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

/**
 * Plan 3: the UI stage and scenario on <html>, so every screen (the post-mortem and Help too) takes
 * the stage's tokens and the scenario's accent. The established stage's CSS and heading font load
 * only when a run first reaches it, so the Start screen never waits for them.
 */
function useStageTheme(stage: string | null, scenarioId: string | null) {
  useEffect(() => {
    const html = document.documentElement
    if (stage) html.dataset['stage'] = stage
    else delete html.dataset['stage']
    if (scenarioId) html.dataset['scenario'] = scenarioId
    else delete html.dataset['scenario']
    if (stage === 'established') void import('./theme/established.css')
  }, [stage, scenarioId])
}

/** `layout` forces one layout, for tests; otherwise the window width decides. */
export function App({ store, layout }: { store: StoreApi<GameStore>; layout?: LayoutChoice }) {
  return (
    <StoreProvider value={store}>
      <ErrorBoundary store={store}>
        <Root layout={layout} />
      </ErrorBoundary>
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
  const desk = props.layout ? props.layout === 'desk' : wide
  // A finished run shows its full screen moments, then the post-mortem, even after a reload.
  const momentPending =
    view !== null && report !== null && notableMoments(report, view).length > momentsSeen
  const screen = !view
    ? 'start'
    : introStep !== null
      ? `intro-${introStep}`
      : view.status === 'ended' && !momentPending
        ? 'postmortem'
        : helpOpen
          ? 'help'
          : report !== null
            ? `report-${momentsSeen}`
            : 'game'
  useFocusOnScreenChange(screen)
  useStageTheme(view?.company.uiStage ?? null, view?.scenarioId ?? null)

  if (!view) return <Start />
  if (introStep !== null) return <Intro />
  if (screen === 'postmortem') return <PostMortem desk={desk} />

  const main = helpOpen ? <Help /> : report !== null ? <Results /> : null
  return desk ? <DeskLayout main={main} /> : <PhoneLayout main={main} />
}

/**
 * When the screen changes, keyboard focus moves to its heading (the last element marked
 * `data-autofocus`), so Tab carries on from there and a screen reader reads the new screen. The
 * button that was pressed has often just gone. Never on the first render: a page load keeps focus.
 */
function useFocusOnScreenChange(screen: string) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const targets = document.querySelectorAll<HTMLElement>('[data-autofocus]')
    targets[targets.length - 1]?.focus()
  }, [screen])
}
