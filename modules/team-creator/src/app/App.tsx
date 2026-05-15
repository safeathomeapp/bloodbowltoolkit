import styles from './App.module.css'
import { TeamCreator } from '../tools/team-creator/components/TeamCreator'

export function App() {
  return (
    <main className={styles.shell}>
      <section className={styles.workspace} aria-label="Team creator workspace">
        <TeamCreator />
      </section>
    </main>
  )
}
