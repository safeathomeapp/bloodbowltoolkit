import { useEffect, useRef, useState } from 'react'
import styles from './BlockDiceCalculator.module.css'
import type { BoardState, PlayerProfile, PlacedPlayer, Position, Skill, TeamSide } from '../../../shared/types/game'
import { calculateBlockDice } from '../rules/calculateBlockDice'
import { buildPositionKey, calculatePotentialBlockCandidates } from '../rules/calculatePotentialBlockCandidates'
import { calculateAllTargetPreviews } from '../rules/calculateTargetPreviews'

const GRID_SIZE = 7
const STRENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const STORAGE_KEY = 'blood-bowl-toolkit:block-dice'
const PLAYER_SKILL_OPTIONS: Skill[] = ['GUARD', 'DEFENSIVE', 'DAUNTLESS', 'HORNS']
// Keep blitz candidate invalidation logic dormant for now.
// The current MVP hides the explicit action because the UX is too loose for release.
const SHOW_BLITZ_INVALIDATION_ACTION = false
type AppMode = 'EDIT' | 'CALCULATE'
type PreviewMode = 'STANDARD' | 'BLITZ'

interface TeamDraft {
  strength: number
  skills: Skill[]
  isStanding: boolean
  hasTackleZone: boolean
}

const defaultTeamDraft: TeamDraft = {
  strength: 3,
  skills: [],
  isStanding: true,
  hasTackleZone: true,
}

const defaultTeamDrafts: Record<TeamSide, TeamDraft> = {
  A: { ...defaultTeamDraft },
  B: { ...defaultTeamDraft },
}

const emptyBoardState: BoardState = {
  placedPlayers: [],
  blockerId: null,
  targetId: null,
}

interface PersistedCalculatorState {
  draft?: TeamDraft & { teamSide?: TeamSide }
  teamDrafts: Record<TeamSide, TeamDraft>
  playerProfiles: PlayerProfile[]
  boardState: BoardState
  nextNumbers: Record<TeamSide, number>
  activeTeam: TeamSide
  appMode: AppMode
  previewMode: PreviewMode
  focusSelectedDefender: boolean
  selectedEditPlayerIds: Record<TeamSide, string | null>
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

function getProfileTokenNumber(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)

  if (typeof profile?.number === 'number') {
    return String(profile.number)
  }

  const numericId = (profile?.name ?? player.id).match(/(\d+)$/)?.[1]
  return numericId ?? player.id
}

function getProfileForPlayer(player: PlacedPlayer | null, profiles: PlayerProfile[]) {
  if (!player) {
    return null
  }

  return profiles.find((entry) => entry.id === player.profileId) ?? null
}

function getTokenRoleLabel(options: { isBlocker: boolean; isTarget: boolean; isBlitzing: boolean }) {
  if (options.isBlocker) {
    return options.isBlitzing ? '*A*' : 'A'
  }

  if (options.isTarget) {
    return 'D'
  }

  return null
}

function toDiceLabel(count: number, chooser: 'ATTACKER' | 'DEFENDER' | 'NONE') {
  if (chooser === 'ATTACKER') {
    return `${count}D`
  }

  if (chooser === 'DEFENDER') {
    return `-${count}D`
  }

  return '1D'
}

function getTeamName(teamSide: TeamSide) {
  return teamSide === 'A' ? 'Blue' : 'Red'
}

export function BlockDiceCalculator() {
  const persistedState = loadPersistedState()
  const [teamDrafts, setTeamDrafts] = useState<Record<TeamSide, TeamDraft>>(() => {
    if (persistedState?.teamDrafts) {
      return persistedState.teamDrafts
    }

    if (persistedState?.draft) {
      const fallbackTeam = persistedState.draft.teamSide ?? 'A'
      return {
        A: fallbackTeam === 'A' ? { ...defaultTeamDraft, ...persistedState.draft } : { ...defaultTeamDraft },
        B: fallbackTeam === 'B' ? { ...defaultTeamDraft, ...persistedState.draft } : { ...defaultTeamDraft },
      }
    }

    return defaultTeamDrafts
  })
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>(persistedState?.playerProfiles ?? [])
  const [boardState, setBoardState] = useState<BoardState>(persistedState?.boardState ?? emptyBoardState)
  const [nextNumbers, setNextNumbers] = useState<Record<TeamSide, number>>(
    persistedState?.nextNumbers ?? { A: 1, B: 1 },
  )
  const [activeTeam, setActiveTeam] = useState<TeamSide>(() => {
    if (persistedState?.activeTeam) {
      return persistedState.activeTeam
    }

    const persistedBlocker = persistedState?.boardState.blockerId
      ? persistedState.boardState.placedPlayers.find((player) => player.id === persistedState.boardState.blockerId) ?? null
      : null

    return persistedBlocker?.teamSide ?? 'A'
  })
  const [appMode, setAppMode] = useState<AppMode>(persistedState?.appMode ?? 'EDIT')
  const [previewMode, setPreviewMode] = useState<PreviewMode>(persistedState?.previewMode ?? 'STANDARD')
  const focusSelectedDefender = true
  const [selectedEditPlayerIds, setSelectedEditPlayerIds] = useState<Record<TeamSide, string | null>>(
    persistedState?.selectedEditPlayerIds ?? { A: null, B: null },
  )
  const [invalidatedBlitzCandidates, setInvalidatedBlitzCandidates] = useState<Record<string, string[]>>(
    persistedState?.invalidatedBlitzCandidates ?? {},
  )
  const [selectedBlitzCandidateKey, setSelectedBlitzCandidateKey] = useState<string | null>(
    persistedState?.selectedBlitzCandidateKey ?? null,
  )
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState(false)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const payload: PersistedCalculatorState = {
      teamDrafts,
      playerProfiles,
      boardState,
      nextNumbers,
      activeTeam,
      appMode,
      previewMode,
      focusSelectedDefender,
      selectedEditPlayerIds,
      invalidatedBlitzCandidates,
      selectedBlitzCandidateKey,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    appMode,
    activeTeam,
    boardState,
    teamDrafts,
    focusSelectedDefender,
    invalidatedBlitzCandidates,
    nextNumbers,
    playerProfiles,
    previewMode,
    selectedEditPlayerIds,
    selectedBlitzCandidateKey,
  ])

  const removePlayer = (playerId: string) => {
    const existingPlayer = boardState.placedPlayers.find((player) => player.id === playerId)

    if (!existingPlayer) {
      return
    }

    setBoardState((currentState) => ({
      ...currentState,
      placedPlayers: currentState.placedPlayers.filter((player) => player.id !== existingPlayer.id),
      blockerId: currentState.blockerId === existingPlayer.id ? null : currentState.blockerId,
      targetId: currentState.targetId === existingPlayer.id ? null : currentState.targetId,
    }))
    setPlayerProfiles((currentProfiles) =>
      currentProfiles.filter((profile) => profile.id !== existingPlayer.profileId),
    )
    setSelectedEditPlayerIds((current) => ({
      ...current,
      [existingPlayer.teamSide]: current[existingPlayer.teamSide] === existingPlayer.id ? null : current[existingPlayer.teamSide],
    }))
  }

  const placePlayer = (position: Position) => {
    const existingPlayer = boardState.placedPlayers.find((player) => isSamePosition(player.position, position))

    if (existingPlayer) {
      if (appMode === 'EDIT') {
        setSelectedEditPlayerIds((current) => ({
          ...current,
          [existingPlayer.teamSide]: existingPlayer.id,
        }))
        setActiveTeam(existingPlayer.teamSide)
      }
      return
    }

    const draft = teamDrafts[activeTeam]
    const nextNumber = nextNumbers[activeTeam]
    const tokenId = buildTokenId(activeTeam, nextNumber)
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
      teamSide: activeTeam,
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
      [activeTeam]: currentNumbers[activeTeam] + 1,
    }))
    setSelectedEditPlayerIds((current) => ({
      ...current,
      [activeTeam]: nextPlacedPlayer.id,
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

  const togglePlayerSkill = (player: PlacedPlayer | null, skill: Skill) => {
    if (!player?.profileId) {
      return
    }

    setPlayerProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.id === player.profileId
          ? { ...profile, skills: toggleSkill(profile.skills, skill) }
          : profile,
      ),
    )
  }

  const updatePlacedPlayerStatus = (
    player: PlacedPlayer | null,
    updates: Partial<Pick<PlacedPlayer, 'isStanding' | 'hasTackleZone'>>,
  ) => {
    if (!player) {
      return
    }

    setBoardState((currentState) => ({
      ...currentState,
      placedPlayers: currentState.placedPlayers.map((entry) =>
        entry.id === player.id
          ? {
              ...entry,
              ...updates,
            }
          : entry,
      ),
    }))
  }

  const updatePlacedPlayerStrength = (player: PlacedPlayer | null, strength: number) => {
    if (!player?.profileId) {
      return
    }

    setPlayerProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.id === player.profileId ? { ...profile, strength } : profile,
      ),
    )
  }

  const updatePlacedPlayerName = (player: PlacedPlayer | null, name: string) => {
    if (!player?.profileId) {
      return
    }

    setPlayerProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.id === player.profileId ? { ...profile, name } : profile,
      ),
    )
  }

  const updateTeamDraft = (teamSide: TeamSide, updates: Partial<TeamDraft>) => {
    setTeamDrafts((current) => ({
      ...current,
      [teamSide]: {
        ...current[teamSide],
        ...updates,
      },
    }))
  }

  const applyEditorStrength = (teamSide: TeamSide, player: PlacedPlayer | null, strength: number) => {
    if (player) {
      updatePlacedPlayerStrength(player, strength)
      return
    }

    updateTeamDraft(teamSide, { strength })
  }

  const applyEditorSkill = (teamSide: TeamSide, player: PlacedPlayer | null, skills: Skill[], skill: Skill) => {
    if (player) {
      togglePlayerSkill(player, skill)
      return
    }

    updateTeamDraft(teamSide, { skills: toggleSkill(skills, skill) })
  }

  const applyEditorStanding = (teamSide: TeamSide, player: PlacedPlayer | null, isStanding: boolean, hasTackleZone: boolean) => {
    if (player) {
      updatePlacedPlayerStatus(player, {
        isStanding: !isStanding,
        hasTackleZone: !isStanding ? hasTackleZone : false,
      })
      return
    }

    updateTeamDraft(teamSide, {
      isStanding: !isStanding,
      hasTackleZone: !isStanding ? hasTackleZone : false,
    })
  }

  const applyEditorTackleZone = (teamSide: TeamSide, player: PlacedPlayer | null, hasTackleZone: boolean) => {
    if (player) {
      updatePlacedPlayerStatus(player, { hasTackleZone: !hasTackleZone })
      return
    }

    updateTeamDraft(teamSide, { hasTackleZone: !hasTackleZone })
  }

  const setActiveTeamSelection = (nextTeam: TeamSide) => {
    setActiveTeam(nextTeam)
    setSelectedBlitzCandidateKey(null)
    setIsWhyPanelOpen(false)

    setBoardState((currentState) => {
      const currentAttacker =
        currentState.placedPlayers.find((entry) => entry.id === currentState.blockerId) ?? null
      const currentDefender =
        currentState.placedPlayers.find((entry) => entry.id === currentState.targetId) ?? null

      if (currentAttacker?.teamSide === nextTeam) {
        return {
          ...currentState,
          targetId: currentDefender?.teamSide === nextTeam ? null : currentState.targetId,
        }
      }

      if (
        currentAttacker &&
        currentDefender &&
        currentDefender.teamSide === nextTeam &&
        currentAttacker.teamSide !== nextTeam
      ) {
        return {
          ...currentState,
          blockerId: currentDefender.id,
          targetId: currentAttacker.id,
        }
      }

      return {
        ...currentState,
        blockerId: null,
        targetId: null,
      }
    })
  }

  const selectPlayer = (player: PlacedPlayer) => {
    setBoardState((currentState) => {
      const currentBlocker = currentState.placedPlayers.find((entry) => entry.id === currentState.blockerId)

      if (player.teamSide === activeTeam) {
        return {
          ...currentState,
          blockerId: player.id,
          targetId: null,
        }
      }

      if (!currentBlocker || currentBlocker.teamSide !== activeTeam) {
        return currentState
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

    const existingPlayer = boardState.placedPlayers.find((player) => isSamePosition(player.position, position))
    const positionKey = buildPositionKey(position)
    const candidate = candidateMap.get(positionKey)

    if (appMode === 'CALCULATE' && previewMode === 'BLITZ' && target && candidate) {
      if (candidate.status === 'OCCUPIED' && existingPlayer) {
        selectPlayer(existingPlayer)
      } else if (candidate.status === 'VALID') {
        setSelectedBlitzCandidateKey(candidate.key)
      } else if (candidate.status === 'INVALIDATED') {
        toggleCandidateInvalidation(candidate.key, { selectAfterRestore: true })
      }
      return
    }

    if (appMode === 'EDIT') {
      placePlayer(position)
      return
    }

    if (existingPlayer) {
      selectPlayer(existingPlayer)
    }
  }

  const resetBoard = () => {
    setTeamDrafts(defaultTeamDrafts)
    setPlayerProfiles([])
    setBoardState(emptyBoardState)
    setNextNumbers({ A: 1, B: 1 })
    setAppMode('EDIT')
    setPreviewMode('STANDARD')
    setSelectedEditPlayerIds({ A: null, B: null })
    setInvalidatedBlitzCandidates({})
    setSelectedBlitzCandidateKey(null)
    setIsWhyPanelOpen(false)
    setIsHeaderMenuOpen(false)

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const defendingTeam: TeamSide = activeTeam === 'A' ? 'B' : 'A'
  const selectedEditPlayerA =
    boardState.placedPlayers.find((player) => player.id === selectedEditPlayerIds.A) ?? null
  const selectedEditPlayerB =
    boardState.placedPlayers.find((player) => player.id === selectedEditPlayerIds.B) ?? null
  const selectedEditProfileA = getProfileForPlayer(selectedEditPlayerA, playerProfiles)
  const selectedEditProfileB = getProfileForPlayer(selectedEditPlayerB, playerProfiles)
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
  const blockerNumberLabel = blocker ? getProfileTokenNumber(blocker, playerProfiles) : 'none'
  const targetNumberLabel = target ? getProfileTokenNumber(target, playerProfiles) : 'none'
  const blockerProfile = getProfileForPlayer(blocker, playerProfiles)
  const targetProfile = getProfileForPlayer(target, playerProfiles)
  const blockerSkills = blockerProfile?.skills ?? []
  const targetSkills = targetProfile?.skills ?? []
  const editCardStates = (['A', 'B'] as TeamSide[]).map((teamSide) => {
    const selectedPlayer = teamSide === 'A' ? selectedEditPlayerA : selectedEditPlayerB
    const selectedProfile = teamSide === 'A' ? selectedEditProfileA : selectedEditProfileB
    const draft = teamDrafts[teamSide]

    return {
      teamSide,
      selectedPlayer,
      selectedProfile,
      name: selectedProfile?.name ?? (selectedPlayer ? `Player ${getProfileTokenNumber(selectedPlayer, playerProfiles)}` : 'New player'),
      strength: selectedProfile?.strength ?? draft.strength,
      skills: selectedProfile?.skills ?? draft.skills,
      isStanding: selectedPlayer?.isStanding ?? draft.isStanding,
      hasTackleZone: selectedPlayer?.hasTackleZone ?? draft.hasTackleZone,
    }
  })
  const attackerCardStrength = blockerProfile
    ? (() => {
        const hornsModifier = previewMode === 'BLITZ' && blockerSkills.includes('HORNS') ? 1 : 0
        const strengthAfterHorns = blockerProfile.strength + hornsModifier

        if (blockerSkills.includes('DAUNTLESS') && targetProfile && targetProfile.strength > strengthAfterHorns) {
          return targetProfile.strength
        }

        return strengthAfterHorns
      })()
    : null
  const currentSquareBlitzCalculation =
    blocker && target && previewMode === 'BLITZ' && isAdjacent(blocker.position, target.position)
      ? calculateBlockDice(
          {
            ...boardState,
            blockerId: blocker.id,
            targetId: target.id,
          },
          playerProfiles,
          { isBlitz: true },
        )
      : null
  const currentSquareBlitzLabel = currentSquareBlitzCalculation
    ? toDiceLabel(
        currentSquareBlitzCalculation.finalDice.count,
        currentSquareBlitzCalculation.finalDice.chooser,
      )
    : null
  const defenderCardStrength = targetProfile?.strength ?? null
  const calculation =
    previewMode === 'BLITZ' && target
      ? selectedCandidate?.calculation ?? candidateResult?.preferredCandidate?.calculation ?? activePreview?.calculation ?? null
      : activePreview?.calculation ?? (blocker && target ? calculateBlockDice(boardState, playerProfiles, { isBlitz: false }) : null)

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

  const startEditRemoveLongPress = (player: PlacedPlayer | undefined) => {
    if (appMode !== 'EDIT' || !player) {
      return
    }

    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      removePlayer(player.id)
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
      <section aria-label="Board panel">
        <div className={styles.sectionHeading}>
          <div className={styles.titleRow}>
            <div className={styles.toggleRow}>
              {(['EDIT', 'CALCULATE'] as AppMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={appMode === mode ? `${styles.teamToggle} ${styles.headerModeToggleActive}` : styles.teamToggle}
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
            <div className={styles.headerActions}>
              <div className={styles.teamToggleRow} aria-label="Active team toggle">
                {(['A', 'B'] as TeamSide[]).map((teamSide) => (
                  <button
                    key={teamSide}
                    type="button"
                    className={
                      activeTeam === teamSide
                        ? `${styles.teamToggle} ${teamSide === 'A' ? styles.teamToggleAActive : styles.teamToggleBActive}`
                        : styles.teamToggle
                    }
                    onClick={() => setActiveTeamSelection(teamSide)}
                    aria-pressed={activeTeam === teamSide}
                  >
                    {teamSide === 'A' ? 'BLUE' : 'RED'}
                  </button>
                ))}
              </div>
              <div className={styles.menuWrap}>
                <button
                  type="button"
                  className={styles.menuButton}
                  onClick={() => setIsHeaderMenuOpen((current) => !current)}
                  aria-expanded={isHeaderMenuOpen}
                  aria-controls="header-menu"
                  aria-label="Open board menu"
                >
                  <span className={styles.menuButtonLine} />
                  <span className={styles.menuButtonLine} />
                  <span className={styles.menuButtonLine} />
                </button>
                {isHeaderMenuOpen ? (
                  <div id="header-menu" className={styles.menuPanel}>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={resetBoard}
                    >
                      Clear pitch
                    </button>
                    <button type="button" className={styles.menuItem} disabled>
                      Help
                    </button>
                    <button type="button" className={styles.menuItem} disabled>
                      Load teams
                    </button>
                    <button type="button" className={styles.menuItem} disabled>
                      Save pitch
                    </button>
                    <button type="button" className={styles.menuItem} disabled>
                      More soon
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.boardWorkspace}>
          <div className={styles.grid} role="grid" aria-label="7 by 7 tactical grid">
            {Array.from({ length: GRID_SIZE }, (_, row) =>
              Array.from({ length: GRID_SIZE }, (_, col) => {
                const player = boardState.placedPlayers.find(
                  (entry) => entry.position.row === row && entry.position.col === col,
                )
                const isBlocker = player?.id === boardState.blockerId
                const isTarget = player?.id === boardState.targetId
                const preview = player ? previewMap.get(player.id) : undefined
                const isEligibleTarget = appMode === 'CALCULATE' && Boolean(preview)
                const candidateKey = buildPositionKey({ row, col })
                const candidate = candidateMap.get(candidateKey)
                const isSelectedCandidate = candidate?.key === selectedBlitzCandidateKey
                const isTopTierCandidate = candidate ? topTierCandidateKeys.has(candidate.key) : false
                const showBlitzMarker = isBlocker && appMode === 'CALCULATE' && previewMode === 'BLITZ'
                const attackerCurrentSquareDiceLabel =
                  isBlocker && showBlitzMarker && currentSquareBlitzLabel ? currentSquareBlitzLabel : null
                const showCalculateAnnotations = appMode === 'CALCULATE'
                const shouldHideOtherTargetPreview =
                  focusSelectedDefender && appMode === 'CALCULATE' && Boolean(target) && !isTarget
                const visiblePreview =
                  appMode === 'CALCULATE' && !shouldHideOtherTargetPreview ? preview : undefined
                const tokenRoleLabel = getTokenRoleLabel({
                  isBlocker: Boolean(isBlocker),
                  isTarget: Boolean(isTarget),
                  isBlitzing: showBlitzMarker,
                })
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
                      showCalculateAnnotations ? styles.tokenCompact : '',
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
                        : showCalculateAnnotations && candidate
                          ? `Candidate square ${row + 1},${col + 1}${candidate.diceLabel ? `, ${candidate.diceLabel}` : ''}`
                          : `Grid square ${row + 1},${col + 1}`
                    }
                    onPointerDown={() => {
                      startBlockerLongPress(player)
                      startEditRemoveLongPress(player)
                      startCandidateLongPress({ row, col })
                    }}
                    onPointerUp={clearLongPressTimer}
                    onPointerLeave={clearLongPressTimer}
                    onPointerCancel={clearLongPressTimer}
                  >
                    {player ? (
                      <span className={tokenClassName}>
                        <strong className={showCalculateAnnotations ? styles.tokenNameCompact : styles.tokenName}>
                          {getProfileTokenNumber(player, playerProfiles)}
                        </strong>
                        {visiblePreview ? (
                          <span className={showCalculateAnnotations ? styles.previewBadgeCompact : styles.previewBadge}>
                            {visiblePreview.diceLabel}
                          </span>
                        ) : null}
                        {!preview && attackerCurrentSquareDiceLabel ? (
                          <span className={showCalculateAnnotations ? styles.previewBadgeCompact : styles.previewBadge}>
                            {attackerCurrentSquareDiceLabel}
                          </span>
                        ) : null}
                        {showCalculateAnnotations && tokenRoleLabel ? (
                          <span className={styles.tokenRoleCorner}>{tokenRoleLabel}</span>
                        ) : null}
                      </span>
                    ) : (
                      appMode === 'EDIT' ? (
                        <span className={styles.cellHintStack}>
                          <span className={styles.cellHintPrimary}>{`${row + 1},${col + 1}`}</span>
                        </span>
                      ) : candidate?.diceLabel ? (
                        <span className={styles.cellHintStack}>
                          <span className={styles.cellHintPrimary}>{candidate.diceLabel}</span>
                        </span>
                      ) : null
                    )}
                  </button>
                )
              }),
            )}
          </div>

          <div className={styles.playerCardGrid} aria-label="Selected player cards">
            {appMode === 'EDIT'
              ? editCardStates.map((card) => (
                  <article
                    key={card.teamSide}
                    className={`${styles.playerCard} ${
                      card.teamSide === 'A' ? styles.playerCardTeamA : styles.playerCardTeamB
                    }`}
                  >
                    <div className={styles.playerCardHeader}>
                      {card.selectedPlayer ? (
                        <input
                          className={styles.playerCardNameInput}
                          value={card.name}
                          onChange={(event) => updatePlacedPlayerName(card.selectedPlayer, event.target.value)}
                          placeholder={`${getTeamName(card.teamSide)} player`}
                        />
                      ) : (
                        <p className={styles.playerCardName}>{card.name}</p>
                      )}
                      <select
                        id={`edit-strength-${card.teamSide}`}
                        className={styles.playerCardStrengthSelect}
                        value={card.strength}
                        onChange={(event) => applyEditorStrength(card.teamSide, card.selectedPlayer, Number(event.target.value))}
                      >
                        {STRENGTH_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            ST {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.playerCardToggleRow}>
                      {PLAYER_SKILL_OPTIONS.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          className={card.skills.includes(skill) ? styles.playerToggleActive : styles.playerToggle}
                          onClick={() => applyEditorSkill(card.teamSide, card.selectedPlayer, card.skills, skill)}
                          aria-pressed={card.skills.includes(skill)}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                    <div className={styles.playerCardToggleRow}>
                      <button
                        type="button"
                        className={!card.isStanding ? styles.playerToggleActive : styles.playerToggle}
                        onClick={() =>
                          applyEditorStanding(
                            card.teamSide,
                            card.selectedPlayer,
                            card.isStanding,
                            card.hasTackleZone,
                          )
                        }
                        aria-pressed={!card.isStanding}
                      >
                        Prone
                      </button>
                      <button
                        type="button"
                        className={card.hasTackleZone ? styles.playerToggleActive : styles.playerToggle}
                        onClick={() => applyEditorTackleZone(card.teamSide, card.selectedPlayer, card.hasTackleZone)}
                        disabled={!card.isStanding}
                        aria-pressed={card.hasTackleZone}
                      >
                        Tackle zone
                      </button>
                    </div>
                  </article>
                ))
              : (
                <>
                  <article
                    className={`${styles.playerCard} ${
                      activeTeam === 'A' ? styles.playerCardTeamA : styles.playerCardTeamB
                    }`}
                  >
                    <div className={styles.playerCardHeader}>
                      <div className={styles.playerCardHeading}>
                        <p className={styles.playerCardLabel}>Attacker</p>
                        <p className={styles.playerCardName}>{blockerNumberLabel !== 'none' ? blockerNumberLabel : '-'}</p>
                      </div>
                      <p className={styles.playerCardStrength}>
                        {attackerCardStrength !== null ? `ST ${attackerCardStrength}` : 'ST -'}
                      </p>
                    </div>
                    <div className={styles.playerCardToggleRow}>
                      {PLAYER_SKILL_OPTIONS.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          className={blockerSkills.includes(skill) ? styles.playerToggleActive : styles.playerToggle}
                          onClick={() => togglePlayerSkill(blocker, skill)}
                          disabled={!blocker}
                          aria-pressed={blockerSkills.includes(skill)}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </article>

                  <article
                    className={`${styles.playerCard} ${
                      defendingTeam === 'A' ? styles.playerCardTeamA : styles.playerCardTeamB
                    }`}
                  >
                    <div className={styles.playerCardHeader}>
                      <div className={styles.playerCardHeading}>
                        <p className={styles.playerCardLabel}>Defender</p>
                        <p className={styles.playerCardName}>{targetNumberLabel !== 'none' ? targetNumberLabel : '-'}</p>
                      </div>
                      <p className={styles.playerCardStrength}>
                        {defenderCardStrength !== null ? `ST ${defenderCardStrength}` : 'ST -'}
                      </p>
                    </div>
                    <div className={styles.playerCardToggleRow}>
                      {PLAYER_SKILL_OPTIONS.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          className={targetSkills.includes(skill) ? styles.playerToggleActive : styles.playerToggle}
                          onClick={() => togglePlayerSkill(target, skill)}
                          disabled={!target}
                          aria-pressed={targetSkills.includes(skill)}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </article>
                </>
              )}
          </div>
        </div>
      </section>

      {appMode === 'CALCULATE' && calculation ? (
        <section className={styles.resultsPanel} aria-labelledby="result-title">
          <div className={styles.resultHeaderRow}>
            <p id="result-title" className={styles.resultHeadline}>{calculation.finalDice.summary}</p>
              <button
                type="button"
                className={styles.teamToggle}
                onClick={() => setIsWhyPanelOpen((current) => !current)}
                aria-expanded={isWhyPanelOpen}
                aria-controls="why-panel-inline"
              >
                {isWhyPanelOpen ? 'HIDE WHY' : 'WHY?'}
              </button>
          </div>
          <p className={styles.resultCopy}>
            Attacker ST {calculation.attackerStrength.total} vs Defender ST {calculation.defenderStrength.total}
          </p>
          {previewMode === 'BLITZ' && target ? (
            <p className={styles.resultCopy}>
              {currentCandidatePositionLabel
                ? `Current preview uses attack square ${currentCandidatePositionLabel}.`
                : 'No reachable candidate squares remain for this blitz preview.'}
            </p>
          ) : null}
          <div className={styles.resultActions}>
            {SHOW_BLITZ_INVALIDATION_ACTION && previewMode === 'BLITZ' && currentCandidate ? (
              <button
                type="button"
                className={styles.actionButtonSecondary}
                onClick={() => toggleCandidateInvalidation(currentCandidate.key)}
              >
                Mark {currentCandidatePositionLabel} unreachable
              </button>
            ) : null}
          </div>

          {isWhyPanelOpen ? (
            <div id="why-panel-inline">
              <div className={styles.explanationStack}>
                {calculation.explanation.map((section) => (
                  <div key={section.title} className={styles.explanationCard}>
                    <p className={styles.resultHeadline}>{section.title}</p>
                    <ul className={styles.summaryList}>
                      {section.entries.map((entry) => (
                        <li
                          key={entry.text}
                          className={
                            entry.tone === 'SUCCESS'
                              ? styles.assistVALID
                              : entry.tone === 'WARNING'
                                ? styles.assistCANCELLED
                                : styles.assistINELIGIBLE
                          }
                        >
                          {entry.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

    </div>
  )
}
