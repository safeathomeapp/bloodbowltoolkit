import { useEffect, useRef, useState } from 'react'
import styles from './BlockDiceCalculator.module.css'
import type { BoardState, PlayerProfile, PlacedPlayer, Position, Skill, TeamSide } from '../../../shared/types/game'
import { calculateBlockDice } from '../rules/calculateBlockDice'
import { buildPositionKey, calculatePotentialBlockCandidates } from '../rules/calculatePotentialBlockCandidates'
import { calculateAllTargetPreviews } from '../rules/calculateTargetPreviews'

const GRID_SIZE = 7
const STRENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const STORAGE_KEY = 'blood-bowl-toolkit:block-dice'
type AppMode = 'EDIT' | 'CALCULATE'
type PreviewMode = 'STANDARD' | 'BLITZ'

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
  appMode: AppMode
  previewMode: PreviewMode
  invalidatedBlitzCandidates: Record<string, string[]>
  selectedBlitzCandidateKey: string | null
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

function getCandidateStatusLabel(
  status: 'VALID' | 'OCCUPIED' | 'INVALIDATED',
  options: { isTopTier: boolean; isSelected: boolean },
) {
  if (status === 'OCCUPIED') {
    return 'OCCUPIED'
  }

  if (status === 'INVALIDATED') {
    return 'OFF'
  }

  if (options.isSelected) {
    return 'SELECTED'
  }

  if (options.isTopTier) {
    return 'TOP'
  }

  return 'VALID'
}

export function BlockDiceCalculator() {
  const persistedState = loadPersistedState()
  const [draft, setDraft] = useState<PlacementDraft>(persistedState?.draft ?? defaultDraft)
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>(persistedState?.playerProfiles ?? [])
  const [boardState, setBoardState] = useState<BoardState>(persistedState?.boardState ?? emptyBoardState)
  const [nextNumbers, setNextNumbers] = useState<Record<TeamSide, number>>(
    persistedState?.nextNumbers ?? { A: 1, B: 1 },
  )
  const [appMode, setAppMode] = useState<AppMode>(persistedState?.appMode ?? 'EDIT')
  const [previewMode, setPreviewMode] = useState<PreviewMode>(persistedState?.previewMode ?? 'STANDARD')
  const [invalidatedBlitzCandidates, setInvalidatedBlitzCandidates] = useState<Record<string, string[]>>(
    persistedState?.invalidatedBlitzCandidates ?? {},
  )
  const [selectedBlitzCandidateKey, setSelectedBlitzCandidateKey] = useState<string | null>(
    persistedState?.selectedBlitzCandidateKey ?? null,
  )
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installStatus, setInstallStatus] = useState('PWA ready for install and offline use.')
  const [hasRestoredState] = useState(Boolean(persistedState))
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const payload: PersistedCalculatorState = {
      draft,
      playerProfiles,
      boardState,
      nextNumbers,
      appMode,
      previewMode,
      invalidatedBlitzCandidates,
      selectedBlitzCandidateKey,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    appMode,
    boardState,
    draft,
    invalidatedBlitzCandidates,
    nextNumbers,
    playerProfiles,
    previewMode,
    selectedBlitzCandidateKey,
  ])

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

  useEffect(() => {
    if (typeof window === 'undefined' || !isWhyPanelOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsWhyPanelOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isWhyPanelOpen])

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

  const toggleCandidateInvalidation = (key: string, options?: { selectAfterRestore?: boolean }) => {
    if (!invalidationSetKey) {
      return
    }

    const isCurrentlyInvalidated = invalidatedKeysForSelection.includes(key)

    setInvalidatedBlitzCandidates((current) => {
      const existing = current[invalidationSetKey] ?? []
      const next = isCurrentlyInvalidated ? existing.filter((entry) => entry !== key) : [...existing, key]

      return {
        ...current,
        [invalidationSetKey]: next,
      }
    })

    if (isCurrentlyInvalidated) {
      if (options?.selectAfterRestore) {
        setSelectedBlitzCandidateKey(key)
      }
      return
    }

    setSelectedBlitzCandidateKey((currentKey) => (currentKey === key ? null : currentKey))
  }

  const selectPlayer = (player: PlacedPlayer) => {
    setBoardState((currentState) => {
      const currentBlocker = currentState.placedPlayers.find((entry) => entry.id === currentState.blockerId)

      if (player.id === currentState.targetId) {
        return {
          ...currentState,
          blockerId: player.id,
          targetId: null,
        }
      }

      if (player.teamSide === currentBlocker?.teamSide || !currentBlocker) {
        return {
          ...currentState,
          blockerId: player.id,
          targetId: null,
        }
      }

      const previewIsAdjacent = isAdjacent(currentBlocker.position, player.position)

      if (previewMode === 'STANDARD' && !previewIsAdjacent) {
        return currentState
      }

      return {
        ...currentState,
        targetId: player.id,
      }
    })
  }

  const handleGridCellPress = (position: Position) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    const positionKey = buildPositionKey(position)
    const candidate = candidateMap.get(positionKey)

    if (appMode === 'CALCULATE' && previewMode === 'BLITZ' && target && candidate) {
      if (candidate.status === 'VALID') {
        setSelectedBlitzCandidateKey(candidate.key)
      } else if (candidate.status === 'INVALIDATED') {
        toggleCandidateInvalidation(candidate.key, { selectAfterRestore: true })
      }
      return
    }

    const existingPlayer = boardState.placedPlayers.find((player) => isSamePosition(player.position, position))

    if (appMode === 'EDIT') {
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
    setAppMode('EDIT')
    setPreviewMode('STANDARD')
    setInvalidatedBlitzCandidates({})
    setSelectedBlitzCandidateKey(null)
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
  const invalidationSetKey = blocker && target ? `${blocker.id}:${target.id}` : null
  const invalidatedKeysForSelection =
    invalidationSetKey ? invalidatedBlitzCandidates[invalidationSetKey] ?? [] : []
  const invalidatedByTarget =
    blocker && previewMode === 'BLITZ'
      ? Object.fromEntries(
          Object.entries(invalidatedBlitzCandidates)
            .filter(([key]) => key.startsWith(`${blocker.id}:`))
            .map(([key, keys]) => [key.split(':')[1] ?? '', keys]),
        )
      : {}
  const previews = blocker
    ? calculateAllTargetPreviews(boardState, playerProfiles, blocker.id, previewMode, invalidatedByTarget)
    : []
  const previewMap = new Map(previews.map((preview) => [preview.targetId, preview]))
  const activePreview = target ? previewMap.get(target.id) ?? null : null
  const candidateResult =
    blocker && target && previewMode === 'BLITZ'
      ? calculatePotentialBlockCandidates(
          boardState,
          playerProfiles,
          blocker.id,
          target.id,
          invalidatedKeysForSelection,
        )
      : null
  const candidateMap = new Map(candidateResult?.candidates.map((candidate) => [candidate.key, candidate]) ?? [])
  const topTierCandidateKeys = new Set(candidateResult?.topTierCandidates.map((candidate) => candidate.key) ?? [])
  const selectedCandidate =
    candidateResult && selectedBlitzCandidateKey
      ? candidateResult.candidates.find(
          (candidate) =>
            candidate.key === selectedBlitzCandidateKey &&
            candidate.status === 'VALID' &&
            candidate.calculation,
        ) ?? null
      : null
  const blockerLabel = blocker ? getProfileLabel(blocker, playerProfiles) : 'none'
  const targetLabel = target ? getProfileLabel(target, playerProfiles) : 'none'
  const selectionHint =
    appMode === 'EDIT'
      ? 'Edit mode is active. Tap an empty square to place the configured player or an occupied square to remove one.'
      : !blocker
        ? 'Calculate mode is active. Tap any player to choose the active blocker.'
        : !target
          ? previewMode === 'STANDARD'
            ? 'Adjacent opposing players now show dice overlays. Tap one of those targets to inspect the detailed result.'
            : 'Blitz Preview is active. Potential block dice show on opposing players without checking movement legality.'
          : previewMode === 'STANDARD'
            ? 'Preview target selected. Tap that target again to make them the blocker, tap another adjacent opposing player to switch the preview, or tap a friendly player to change blocker.'
            : 'Blitz target selected. Tap that target again to make them the blocker, tap a candidate square to inspect it, long press it for Why, or use the result action to mark it unreachable.'
  const calculation =
    previewMode === 'BLITZ' && target
      ? selectedCandidate?.calculation ?? candidateResult?.preferredCandidate?.calculation ?? activePreview?.calculation ?? null
      : activePreview?.calculation ?? (blocker && target ? calculateBlockDice(boardState, playerProfiles) : null)

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const startBlockerLongPress = (player: PlacedPlayer | undefined) => {
    if (appMode !== 'CALCULATE' || !player || player.id !== blocker?.id) {
      return
    }

    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      setPreviewMode((currentMode) => (currentMode === 'STANDARD' ? 'BLITZ' : 'STANDARD'))
      setSelectedBlitzCandidateKey(null)
      setBoardState((currentState) => ({
        ...currentState,
        targetId: null,
      }))
    }, 450)
  }

  const startCandidateLongPress = (position: Position) => {
    if (appMode !== 'CALCULATE' || previewMode !== 'BLITZ' || !invalidationSetKey) {
      return
    }

    const key = buildPositionKey(position)
    const candidate = candidateMap.get(key)

    if (!candidate || candidate.status === 'OCCUPIED') {
      return
    }

    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      setSelectedBlitzCandidateKey(key)
      setIsWhyPanelOpen(true)
    }, 450)
  }

  const currentCandidate = selectedCandidate ?? candidateResult?.preferredCandidate ?? null
  const currentCandidatePositionLabel = currentCandidate
    ? `${currentCandidate.position.row + 1},${currentCandidate.position.col + 1}`
    : null

  return (
    <div className={styles.layout}>
      <section className={styles.controls} aria-labelledby="placement-controls">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Mode</p>
          <h3 id="placement-controls" className={styles.title}>
            Edit and calculate
          </h3>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Top-level mode</span>
          <div className={styles.toggleRow}>
            {(['EDIT', 'CALCULATE'] as AppMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={appMode === mode ? styles.toggleActive : styles.toggle}
                onClick={() => {
                  setAppMode(mode)
                  if (mode === 'EDIT') {
                    setPreviewMode('STANDARD')
                  }
                }}
                aria-pressed={appMode === mode}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {appMode === 'EDIT' ? (
          <>
            <div className={styles.controlGroup}>
              <span className={styles.label}>Team</span>
              <div className={styles.toggleRow}>
                {(['A', 'B'] as TeamSide[]).map((teamSide) => (
                  <button
                    key={teamSide}
                    type="button"
                    className={teamSide === draft.teamSide ? styles.toggleActive : styles.toggle}
                    onClick={() => setDraft((currentDraft) => ({ ...currentDraft, teamSide }))}
                    aria-pressed={teamSide === draft.teamSide}
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
                    aria-pressed={draft.skills.includes(skill)}
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
          </>
        ) : (
          <div className={styles.summaryCard}>
            <p className={styles.eyebrow}>Calculate Mode</p>
            <ul className={styles.summaryList}>
              <li>Tap one player to make them the active blocker.</li>
              <li>
                {previewMode === 'STANDARD'
                  ? 'Adjacent opposing players show inline dice overlays automatically.'
                  : 'Blitz Preview is active and non-adjacent opposing players can show potential block dice.'}
              </li>
              <li>
                {previewMode === 'STANDARD'
                  ? 'Tap an adjacent opposing player when you want the detailed reasoning.'
                  : 'Tap a candidate square to inspect that attack position and long press it for Why.'}
              </li>
            </ul>
            {blocker ? (
              <div className={styles.summaryTagRow}>
                <span className={previewMode === 'BLITZ' ? styles.blitzTagActive : styles.blitzTag}>
                  {previewMode === 'BLITZ' ? 'BLITZ MODE' : 'STANDARD MODE'}
                </span>
              </div>
            ) : null}
            {previewMode === 'BLITZ' ? (
              <p className={styles.statusNote}>
                Potential block dice only. Movement legality is not checked.
              </p>
            ) : null}
            {previewMode === 'BLITZ' && target ? (
              <>
                <p className={styles.statusNote}>
                  Tap a candidate square to inspect it. Long press a candidate square to open Why. Tap a dimmed square to restore it.
                </p>
                <div className={styles.legendRow} aria-label="Blitz candidate legend">
                  <span className={`${styles.legendChip} ${styles.legendBest}`}>TOP</span>
                  <span className={`${styles.legendChip} ${styles.legendAlt}`}>VALID</span>
                  <span className={`${styles.legendChip} ${styles.legendOff}`}>OFF</span>
                  <span className={`${styles.legendChip} ${styles.legendOccupied}`}>OCCUPIED</span>
                </div>
              </>
            ) : null}
          </div>
        )}

        <div className={styles.summaryCard}>
          <p className={styles.eyebrow}>Local Toolkit</p>
          <ul className={styles.summaryList}>
            <li>Board setup is saved locally on this device.</li>
            <li>{hasRestoredState ? 'Previous local board state was restored for this session.' : 'No previous saved board state was restored.'}</li>
            <li>{installStatus}</li>
          </ul>
          <div className={styles.actionGrid} aria-label="Local toolkit actions">
            <button
              type="button"
              className={styles.actionButtonPrimary}
              onClick={() => void promptInstall()}
              aria-describedby="install-status"
            >
              Install app
            </button>
            <button type="button" className={styles.actionButtonSecondary} onClick={resetBoard}>
              Reset board
            </button>
          </div>
          <p id="install-status" className={styles.statusNote} aria-live="polite">
            {installStatus}
          </p>
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

        <div className={styles.summaryCard}>
          <p className={styles.eyebrow}>Tactical Flow</p>
          <ul className={styles.summaryList}>
            <li>{selectionHint}</li>
            <li>
              {previewMode === 'STANDARD'
                ? 'Standard calculate mode currently previews adjacent blocks only.'
                : 'Long press the active blocker again to leave Blitz Preview.'}
            </li>
            <li>Long press the active blocker in Calculate Mode to toggle Blitz Preview.</li>
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
              const preview = player ? previewMap.get(player.id) : undefined
              const isEligibleTarget = appMode === 'CALCULATE' && Boolean(preview)
              const candidateKey = buildPositionKey({ row, col })
              const candidate = candidateMap.get(candidateKey)
              const isSelectedCandidate = candidate?.key === selectedBlitzCandidateKey
              const isTopTierCandidate = candidate ? topTierCandidateKeys.has(candidate.key) : false
              const candidateStatusLabel = candidate
                ? getCandidateStatusLabel(candidate.status, {
                    isTopTier: isTopTierCandidate,
                    isSelected: isSelectedCandidate,
                  })
                : null
              const cellClassName = [
                player ? styles.cellOccupied : styles.cell,
                isEligibleTarget && !isTarget ? styles.cellEligibleTarget : '',
                candidate?.status === 'VALID' && isTopTierCandidate ? styles.candidateBest : '',
                candidate?.status === 'VALID' && !isTopTierCandidate ? styles.candidateFallback : '',
                candidate?.status === 'INVALIDATED' ? styles.candidateInvalidated : '',
                candidate?.status === 'OCCUPIED' ? styles.candidateOccupied : '',
                isSelectedCandidate ? styles.candidateSelected : '',
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
                  aria-label={
                    player
                      ? undefined
                      : candidate
                        ? `Candidate square ${row + 1},${col + 1}, ${candidateStatusLabel ?? 'candidate'}${candidate.diceLabel ? `, ${candidate.diceLabel}` : ''}`
                        : `Grid square ${row + 1},${col + 1}`
                  }
                  onPointerDown={() => {
                    startBlockerLongPress(player)
                    startCandidateLongPress({ row, col })
                  }}
                  onPointerUp={clearLongPressTimer}
                  onPointerLeave={clearLongPressTimer}
                  onPointerCancel={clearLongPressTimer}
                >
                  {player ? (
                    <span className={tokenClassName}>
                      <strong>{isBlocker ? `*${getProfileLabel(player, playerProfiles)}` : getProfileLabel(player, playerProfiles)}</strong>
                      <span className={styles.tokenMeta}>ST {getProfileStrength(player, playerProfiles)}</span>
                      <span className={styles.tokenMeta}>
                        {player.isStanding ? 'Standing' : 'Prone'}
                        {player.hasTackleZone ? ' · TZ' : ' · No TZ'}
                      </span>
                      {skills.length > 0 ? <span className={styles.tokenMeta}>{skills.join(', ')}</span> : null}
                      {preview ? <span className={styles.previewBadge}>{preview.diceLabel}</span> : null}
                      {isBlocker ? <span className={styles.tokenRole}>Blocker</span> : null}
                      {isTarget ? <span className={styles.tokenRole}>Target</span> : null}
                      {candidateStatusLabel ? <span className={styles.candidateTokenBadge}>{candidateStatusLabel}</span> : null}
                    </span>
                  ) : (
                    <span className={styles.cellHintStack}>
                      <span className={styles.cellHintPrimary}>{candidate?.diceLabel ?? `${row + 1},${col + 1}`}</span>
                      {candidateStatusLabel ? <span className={styles.cellHintStatus}>{candidateStatusLabel}</span> : null}
                    </span>
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
              {previewMode === 'BLITZ' && target ? (
                <p className={styles.resultCopy}>
                  {currentCandidatePositionLabel
                    ? `Current preview uses attack square ${currentCandidatePositionLabel}.`
                    : 'No reachable candidate squares remain for this blitz preview.'}
                </p>
              ) : null}
              <div className={styles.resultActions}>
                <button
                  type="button"
                  className={styles.whyButton}
                  onClick={() => setIsWhyPanelOpen(true)}
                  aria-expanded={isWhyPanelOpen}
                  aria-controls="why-panel-title"
                >
                  Why?
                </button>
                {previewMode === 'BLITZ' && currentCandidate ? (
                  <button
                    type="button"
                    className={styles.actionButtonSecondary}
                    onClick={() => toggleCandidateInvalidation(currentCandidate.key)}
                  >
                    Mark {currentCandidatePositionLabel} unreachable
                  </button>
                ) : null}
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
                Use the bottom-sheet explanation for the full reasoning, or switch back to edit
                mode to adjust the board without losing your saved local setup.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.resultCard}>
            <p className={styles.resultHeadline}>Preview ready</p>
            <p className={styles.resultCopy}>
              In Calculate Mode, choose a blocker first. Adjacent opposing players will show block
              dice overlays, and tapping one of those targets will open the detailed result.
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
