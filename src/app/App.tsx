import styles from './App.module.css'
import { BlockDiceCalculator } from '../tools/block-dice/components/BlockDiceCalculator'

export function App() {
  return (
    <main className={styles.shell}>
      <section className={styles.workspace} aria-label="Block dice workspace">
        <BlockDiceCalculator />
      </section>
    </main>
  )
}
