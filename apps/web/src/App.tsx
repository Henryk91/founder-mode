import { ENGINE_VERSION } from '@founder-mode/engine'
import { label } from './labels'
import styles from './App.module.css'

export function App() {
  const stage = 'scrappy'
  return (
    <main className={styles.app}>
      <h1>{label('app.title', stage)}</h1>
      <p>{label('app.placeholder', stage)}</p>
      <p className={styles.meta}>
        {label('app.engineVersion', stage)} {ENGINE_VERSION}
      </p>
    </main>
  )
}
