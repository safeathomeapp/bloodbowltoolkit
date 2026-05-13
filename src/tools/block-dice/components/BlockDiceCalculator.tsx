import { useEffect, useState } from 'react'
import styles from './BlockDiceCalculator.module.css'
import type { BoardState, PlayerProfile, PlacedPlayer, Position, Skill, TeamSide } from '../../../shared/types/game'
import { calculateBlockDice } from '../rules/calculateBlockDice'

const GRID_SIZE = 7
const STRENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const STORAGE_KEY = 'blood-bowl-toolkit:block-dice'
type InteractionMode = 'PLACE' | 'SELECT'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PlacementDraft {
  teamSide: TeamSide
  strength: number
  skills: Skill[]
  isStanding: boolean
  hasTackleZone: boolean
}

const defaultDraft: PlacementDraft = {
  teamSide: 'A',
  strength: 3,
  skills: [],
  isStanding: true,
  hasTackleZone: true,
}

const emptyBoardState: BoardState = {
  placedPlayers: [],
  blockerId: null,
  targetId: null,
}

interface PersistedCalculatorState {
  draft: PlacementDraft
  playerProfiles: PlayerProfile[]
  boardState: BoardState
  nextNumbers: Record<TeamSide, number>
  interactionMode: InteractionMode
}

function loadPersistedState(): PersistedCalculatorState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue) as PersistedCalculatorState
    return parsedValue
  } catch {
    return null
  }
}

function buildTokenId(teamSide: TeamSide, nextNumber: number) {
  return `${teamSide}${nextNumber}`
}

function isSamePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col
}

function isAdjacent(left: Position, right: Position) {
  const rowDelta = Math.abs(left.row - right.row)
  const colDelta = Math.abs(left.col - right.col)
  return (rowDelta > 0 || colDelta > 0) && rowDelta <= 1 && colDelta <= 1
}

function toggleSkill(skills: Skill[], skill: Skill) {
  return skills.includes(skill) ? skills.filter((entry) => entry !== skill) : [...skills, skill]
}

function getProfileLabel(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)
  return profile?.name ?? player.id
}

function getProfileStrength(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)
  return profile?.strength ?? 0
}

function getProfileSkills(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)
  return profile?.skills ?? []
}

export function BlockDiceCalculator() {
  const persistedState = loadPersistedState()
  const [draft, setDraft] = useState<PlacementDraft>(persistedState?.draft ?? defaultDraft)
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>(persistedState?.playerProfiles ?? [])
  const [boardState, setBoardState] = useState<BoardState>(persistedState?.boardState ?? emptyBoardState)
  const [nextNumbers, setNextNumbers] = useState<Record<TeamSide, number>>(
    persistedState?.nextNumbers ?? { A: 1, B: 1 },
  )
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    persistedState?.interactionMode ?? 'PLACE',
  )
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installStatus, setInstallStatus] = useState('PWA ready for install and offline use.')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const payload: PersistedCalculatorState = {
      draft,
      playerProfiles,
      boardState,
      nextNumbers,
      interactionMode,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [boardState, draft, interactionMode, nextNumbers, playerProfiles])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
      setInstallStatus('Install prompt is available on this device.')
    }

    const handleAppInstalled = () => {
      setInstallPromptEvent(null)
      setInstallStatus('App installed. This toolkit is available offline.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const placePlayer = (position: Position) => {
    const existingPlayer = boardState.placedPlayers.find((player) => isSamePosition(player.position, position))

    if (existingPlayer) {
      setBoardState((currentState) => ({
        ...currentState,
        placedPlayers: currentState.placedPlayers.filter((player) => player.id !== existingPlayer.id),
        blockerId: currentState.blockerId === existingPlayer.id ? null : currentState.blockerId,
        targetId: currentState.targetId === existingPlayer.id ? null : currentState.targetId,
      }))
      setPlayerProfiles((currentProfiles) =>
        currentProfiles.filter((profile) => profile.id !== existingPlayer.profileId),
      )
      return
    }

    const nextNumber = nextNumbers[draft.teamSide]
    const tokenId = buildTokenId(draft.teamSide, nextNumber)
    const profileId = `profile-${tokenId}`

    const nextProfile: PlayerProfile = {
      id: profileId,
      number: nextNumber,
      name: tokenId,
      strength: draft.strength,
      skills: draft.skills,
    }

    const nextPlacedPlayer: PlacedPlayer = {
      id: tokenId,
      profileId,
      teamSide: draft.teamSide,
      position,
      isStanding: draft.isStanding,
      hasTackleZone: draft.isStanding && draft.hasTackleZone,
    }

    setPlayerProfiles((currentProfiles) => [...currentProfiles, nextProfile])
    setBoardState((currentState) => ({
      ...currentState,
      placedPlayers: [...currentState.placedPlayers, nextPlacedPlayer],
    }))
    setNextNumbers((currentNumbers) => ({
      ...currentNumbers,
      [draft.teamSide]: currentNumbers[draft.teamSide] + 1,
    }))
  }

  const selectPlayer = (player: PlacedPlayer) => {
    setBoardState((currentState) => {
      const currentBlocker = currentState.placedPlayers.find(
        (entry) => entry.id === currentState.blockerId,
      )
      const currentTarget = currentState.placedPlayers.find((entry) => entry.id === currentState.targetId)

      if (!currentBlocker) {
        return {
          ...currentState,
          blockerId: player.id,
          targetId: null,
        }
      }

      if (currentBlocker.id === player.id) {
        return {
          ...currentState,
          blockerId: null,
          targetId: null,
        }
      }

      if (currentTarget?.id === player.id) {
        return {
          ...currentState,
          targetId: null,
        }
      }

      if (currentBlocker.teamSide === player.teamSide) {
        return {
          ...currentState,
          blockerId: player.id,
          targetId: null,
        }
      }

      if (!isAdjacent(currentBlocker.position, player.position)) {
        return currentState
      }

      return {
        ...currentState,
        targetId: player.id,
      }
    })
  }

  const handleGridCellPress = (position: Position) => {
    const existingPlayer = boardState.placedPlayers.find((player) => isSamePosition(player.position, position))

    if (interactionMode === 'PLACE') {
      placePlayer(position)
      return
    }

    if (existingPlayer) {
      selectPlayer(existingPlayer)
    }
  }

  const resetBoard = () => {
    setDraft(defaultDraft)
    setPlayerProfiles([])
    setBoardState(emptyBoardState)
    setNextNumbers({ A: 1, B: 1 })
    setInteractionMode('PLACE')
    setIsWhyPanelOpen(false)

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const promptInstall = async () => {
    if (!installPromptEvent) {
      setInstallStatus('Use your browser menu to install the app on this device.')
      return
    }

    await installPromptEvent.prompt()
    const outcome = await installPromptEvent.userChoice
    setInstallStatus(
      outcome.outcome === 'accepted'
        ? 'Install accepted. The PWA should now be added to your device.'
        : 'Install prompt dismissed. You can open it again later if the browser still offers it.',
    )
    setInstallPromptEvent(null)
  }

  const teamACount = boardState.placedPlayers.filter((player) => player.teamSide === 'A').length
  const teamBCount = boardState.placedPlayers.filter((player) => player.teamSide === 'B').length
  const blocker = boardState.placedPlayers.find((player) => player.id === boardState.blockerId) ?? null
  const target = boardState.placedPlayers.find((player) => player.id === boardState.targetId) ?? null
  const eligibleTargetIds = blocker
    ? boardState.placedPlayers
        .filter(
          (player) => player.teamSide !== blocker.teamSide && isAdjacent(blocker.position, player.position),
        )
        .map((player) => player.id)
    : []
  const blockerLabel = blocker ? getProfileLabel(blocker, playerProfiles) : 'none'
  const targetLabel = target ? getProfileLabel(target, playerProfiles) : 'none'
  const selectionHint =
    interactionMode === 'PLACE'
      ? 'Placement mode is active. Tap an empty square to place the configured player or an occupied square to remove one.'
      : !blocker
        ? 'Selection mode is active. Tap any player to choose the blocker.'
        : !target
          ? 'Tap an adjacent opposing player to choose the target. Tapping another friendly player switches the blocker.'
          : 'Blocker and target are selected. Tapping the blocker clears both selections, and tapping the target clears only the target.'
  const calculation = blocker && target ? calculateBlockDice(boardState, playerProfiles) : null

  return (
    <div className={styles.layout}>
      <section className={styles.controls} aria-labelledby="placement-controls">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Placement Controls</p>
          <h3 id="placement-controls" className={styles.title}>
            Place players on the 7x7 board
          </h3>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Team</span>
          <div className={styles.toggleRow}>
            {(['A', 'B'] as TeamSide[]).map((teamSide) => (
              <button
                key={teamSide}
                type="button"
                className={teamSide === draft.teamSide ? styles.toggleActive : styles.toggle}
                onClick={() => setDraft((currentDraft) => ({ ...currentDraft, teamSide }))}
              >
                Team {teamSide}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="strength-select">
            Strength
          </label>
          <select
            id="strength-select"
            className={styles.select}
            value={draft.strength}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                strength: Number(event.target.value),
              }))
            }
          >
            {STRENGTH_OPTIONS.map((value) => (
              <option key={value} value={value}>
                ST {value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Skills</span>
          <div className={styles.toggleRow}>
            {(['GUARD', 'DEFENSIVE'] as Skill[]).map((skill) => (
              <button
                key={skill}
                type="button"
                className={draft.skills.includes(skill) ? styles.toggleActive : styles.toggle}
                onClick={() =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    skills: toggleSkill(currentDraft.skills, skill),
                  }))
                }
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Status</span>
          <div className={styles.checkRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.isStanding}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    isStanding: event.target.checked,
                    hasTackleZone: event.target.checked ? currentDraft.hasTackleZone : false,
                  }))
                }
              />
              Standing
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.hasTackleZone}
                disabled={!draft.isStanding}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    hasTackleZone: event.target.checked,
                  }))
                }
              />
              Tackle zone
            </label>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.eyebrow}>Local Toolkit</p>
          <ul className={styles.summaryList}>
            <li>Board setup is saved locally on this device.</li>
            <li>{installStatus}</li>
          </ul>
          <div className={styles.actionGrid}>
            <button type="button" className={styles.actionButtonPrimary} onClick={() => void promptInstall()}>
              Install app
            </button>
            <button type="button" className={styles.actionButtonSecondary} onClick={resetBoard}>
              Reset board
            </button>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.eyebrow}>Board Summary</p>
          <ul className={styles.summaryList}>
            <li>{teamACount} players placed for Team A</li>
            <li>{teamBCount} players placed for Team B</li>
            <li>Blocker: {blockerLabel}</li>
            <li>Target: {targetLabel}</li>
          </ul>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Interaction mode</span>
          <div className={styles.toggleRow}>
            {(['PLACE', 'SELECT'] as InteractionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={interactionMode === mode ? styles.toggleActive : styles.toggle}
                onClick={() => setInteractionMode(mode)}
              >
                {mode === 'PLACE' ? 'Place / Remove' : 'Select Block'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.eyebrow}>Selection Flow</p>
          <ul className={styles.summaryList}>
            <li>{selectionHint}</li>
            <li>Only adjacent opposing players can become valid targets.</li>
            <li>Selection state remains reusable while the board layout stays in place.</li>
          </ul>
        </div>
      </section>

      <section className={styles.boardPanel} aria-labelledby="board-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Board</p>
          <h3 id="board-title" className={styles.title}>
            Tactical Grid
          </h3>
        </div>

        <div className={styles.grid} role="grid" aria-label="7 by 7 tactical grid">
          {Array.from({ length: GRID_SIZE }, (_, row) =>
            Array.from({ length: GRID_SIZE }, (_, col) => {
              const player = boardState.placedPlayers.find(
                (entry) => entry.position.row === row && entry.position.col === col,
              )
              const skills = player ? getProfileSkills(player, playerProfiles) : []
              const isBlocker = player?.id === boardState.blockerId
              const isTarget = player?.id === boardState.targetId
              const isEligibleTarget = player ? eligibleTargetIds.includes(player.id) : false
              const cellClassName = [
                player ? styles.cellOccupied : styles.cell,
                isEligibleTarget && !isTarget ? styles.cellEligibleTarget : '',
              ]
                .filter(Boolean)
                .join(' ')
              const tokenClassName = player
                ? [
                    player.teamSide === 'A' ? styles.tokenTeamA : styles.tokenTeamB,
                    isBlocker ? styles.tokenBlocker : '',
                    isTarget ? styles.tokenTarget : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : ''

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  role="gridcell"
                  className={cellClassName}
                  onClick={() => handleGridCellPress({ row, col })}
                >
                  {player ? (
                    <span className={tokenClassName}>
                      <strong>{getProfileLabel(player, playerProfiles)}</strong>
                      <span className={styles.tokenMeta}>ST {getProfileStrength(player, playerProfiles)}</span>
                      <span className={styles.tokenMeta}>
                        {player.isStanding ? 'Standing' : 'Prone'}
                        {player.hasTackleZone ? ' · TZ' : ' · No TZ'}
                      </span>
                      {skills.length > 0 ? <span className={styles.tokenMeta}>{skills.join(', ')}</span> : null}
                      {isBlocker ? <span className={styles.tokenRole}>Blocker</span> : null}
                      {isTarget ? <span className={styles.tokenRole}>Target</span> : null}
                    </span>
                  ) : (
                    <span className={styles.cellHint}>{row + 1},{col + 1}</span>
                  )}
                </button>
              )
            }),
          )}
        </div>
      </section>

      <section className={styles.resultsPanel} aria-labelledby="result-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Result</p>
          <h3 id="result-title" className={styles.title}>
            Block Dice Summary
          </h3>
        </div>

        {calculation ? (
          <div className={styles.resultStack}>
            <div className={styles.resultCard}>
              <p className={styles.resultHeadline}>
                {calculation.blocker.label} into {calculation.target.label}
              </p>
              <p className={styles.resultCopy}>{calculation.finalDice.summary}</p>
              <div className={styles.resultActions}>
                <button
                  type="button"
                  className={styles.whyButton}
                  onClick={() => setIsWhyPanelOpen(true)}
                >
                  Why?
                </button>
              </div>
              <ul className={styles.summaryList}>
                <li>
                  Attacker ST {calculation.attackerStrength.base}
                  {calculation.attackerStrength.assistModifier > 0
                    ? ` + ${calculation.attackerStrength.assistModifier}`
                    : ''}{' '}
                  = {calculation.attackerStrength.total}
                </li>
                <li>
                  Defender ST {calculation.defenderStrength.base}
                  {calculation.defenderStrength.assistModifier > 0
                    ? ` + ${calculation.defenderStrength.assistModifier}`
                    : ''}{' '}
                  = {calculation.defenderStrength.total}
                </li>
              </ul>
            </div>

            <div className={styles.resultCard}>
              <p className={styles.resultHeadline}>Offensive assists</p>
              <ul className={styles.summaryList}>
                {calculation.offensiveAssists.length > 0 ? (
                  calculation.offensiveAssists.map((assist) => (
                    <li key={assist.playerId} className={styles[`assist${assist.status}`]}>
                      {assist.reason}
                    </li>
                  ))
                ) : (
                  <li>No offensive assist candidates.</li>
                )}
              </ul>
            </div>

            <div className={styles.resultCard}>
              <p className={styles.resultHeadline}>Defensive assists</p>
              <ul className={styles.summaryList}>
                {calculation.defensiveAssists.length > 0 ? (
                  calculation.defensiveAssists.map((assist) => (
                    <li key={assist.playerId} className={styles[`assist${assist.status}`]}>
                      {assist.reason}
                    </li>
                  ))
                ) : (
                  <li>No defensive assist candidates.</li>
                )}
              </ul>
            </div>

            <div className={styles.resultCard}>
              <p className={styles.resultHeadline}>Next step</p>
              <p className={styles.resultCopy}>
                Use the bottom-sheet explanation for the full reasoning, or switch back to placement
                mode to adjust the board without losing your saved local setup.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.resultCard}>
            <p className={styles.resultHeadline}>Selection required</p>
            <p className={styles.resultCopy}>
              Place tokens, switch to selection mode, choose a blocker, then choose an adjacent
              opposing target to calculate block dice.
            </p>
          </div>
        )}
      </section>

      {isWhyPanelOpen && calculation ? (
        <div
          className={styles.bottomSheetBackdrop}
          role="presentation"
          onClick={() => setIsWhyPanelOpen(false)}
        >
          <section
            className={styles.bottomSheet}
            aria-labelledby="why-panel-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.bottomSheetHeader}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>Why</p>
                <h3 id="why-panel-title" className={styles.title}>
                  Why this block result happened
                </h3>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsWhyPanelOpen(false)}
              >
                Close
              </button>
            </div>

            <div className={styles.explanationStack}>
              {calculation.explanation.map((section) => (
                <div key={section.title} className={styles.explanationCard}>
                  <p className={styles.resultHeadline}>{section.title}</p>
                  <ul className={styles.summaryList}>
                    {section.entries.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
