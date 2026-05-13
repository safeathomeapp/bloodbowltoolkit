import styles from './App.module.css'
import { BlockDiceCalculator } from '../tools/block-dice/components/BlockDiceCalculator'
import { blockDiceTool } from '../tools/block-dice'

const mvpScope = [
  '7x7 tactical grid',
  'Token placement',
  'Blocker and target selection',
  'Structured assist and block-dice explanation',
  'Guard and Defensive support',
]

export function App() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Blood Bowl Toolkit</p>
        <h1 className={styles.title}>Block dice first. Everything else stays out of scope.</h1>
        <p className={styles.summary}>
          This repository is structured as a toolkit, but the MVP ships one focused helper:
          a mobile-first block dice calculator with explainable assist logic.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="current-tool">
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Current MVP Module</p>
          <h2 id="current-tool" className={styles.cardTitle}>
            {blockDiceTool.name}
          </h2>
        </div>
        <p className={styles.cardText}>{blockDiceTool.description}</p>
        <ul className={styles.scopeList}>
          {mvpScope.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.grid} aria-label="Project status">
        <article className={styles.panel}>
          <p className={styles.eyebrow}>Architecture</p>
          <h2 className={styles.panelTitle}>Rules logic stays outside React.</h2>
          <p className={styles.panelText}>
            UI components should consume structured calculation output, not invent rules text or
            stateful logic on the fly.
          </p>
        </article>

        <article className={styles.panel}>
          <p className={styles.eyebrow}>Status</p>
          <h2 className={styles.panelTitle}>Bootstrap complete.</h2>
          <p className={styles.panelText}>
            The repository now has the agreed structure, PWA baseline, test runner, and
            documentation foundation for the first implementation passes.
          </p>
        </article>
      </section>

      <section className={styles.workspace} aria-labelledby="tool-workspace">
        <div className={styles.workspaceHeader}>
          <p className={styles.eyebrow}>Workspace</p>
          <h2 id="tool-workspace" className={styles.panelTitle}>
            {blockDiceTool.name}
          </h2>
        </div>
        <BlockDiceCalculator />
      </section>
    </main>
  )
}
