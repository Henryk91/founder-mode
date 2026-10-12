import { Component, createRef, type ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { label } from '../labels'
import type { GameStore } from '../store'
import styles from './ui.module.css'
import startStyles from '../screens/Start.module.css'

type Props = { store: StoreApi<GameStore>; children: ReactNode }
type State = { failed: boolean }

/**
 * Catches anything the screens throw while drawing and offers a way back. Nothing here writes the
 * save: it was last written by the action before the crash, and stays as it was.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false }
  private heading = createRef<HTMLHeadingElement>()

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidUpdate(_: Props, before: State) {
    if (this.state.failed && !before.failed) this.heading.current?.focus()
  }

  private retry = () => this.setState({ failed: false })

  private toStart = () => {
    this.props.store.getState().recover()
    this.setState({ failed: false })
  }

  override render() {
    if (!this.state.failed) return this.props.children
    const stage = 'scrappy'
    return (
      <main className={startStyles.start}>
        <section className={`${styles.card} ${styles.sticky} ${styles.notice}`} role="alert">
          <h1 className={styles.title} ref={this.heading} tabIndex={-1} data-autofocus>
            {label('crash.title', stage)}
          </h1>
          <p>{label('crash.text', stage)}</p>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={this.retry}
          >
            {label('crash.retry', stage)}
          </button>
          <button type="button" className={styles.button} onClick={this.toStart}>
            {label('crash.start', stage)}
          </button>
        </section>
      </main>
    )
  }
}
