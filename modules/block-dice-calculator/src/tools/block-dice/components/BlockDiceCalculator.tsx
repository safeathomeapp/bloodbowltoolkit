import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import styles from './BlockDiceCalculator.module.css'
import type { BoardState, PlayerProfile, PlacedPlayer, Position, Skill, TeamSide } from '../../../shared/types/game'
import { getNextSelectionState } from './getNextSelectionState'
import { calculateBlockDice } from '../rules/calculateBlockDice'
import { buildPositionKey, calculatePotentialBlockCandidates } from '../rules/calculatePotentialBlockCandidates'
import { calculateAllTargetPreviews } from '../rules/calculateTargetPreviews'
import { rosterTemplates } from '../../../../../team-creator/src/data/rosterTemplates'
import { buildRosterTemplateMap, resolveImportedTeam } from '../../../shared/integration/resolveImportedTeam'
import {
  buildTeamCreatorExchangePackage,
  parseTeamCreatorExchangePackage,
  readAvailableTeamsFromWindow,
  storeImportedTeamsExchange,
} from '../../../shared/integration/teamCreatorStore'
import {
  applyMatchSessionProgression,
  bootstrapMatchSessionAuthFromUrl,
  claimMatchSessionParticipant,
  confirmMatchSessionEvent,
  confirmMatchSessionPause,
  createMatchSessionEvent,
  createBlockDiceSessionContext,
  deleteMatchSessionEvent,
  endMatchSessionTurn,
  fetchBlockDiceSessionContext,
  fetchBlockDiceSessionContextByCode,
  fetchMatchSessionEvents,
  fetchMatchSessionProgression,
  fetchMatchSessionTimer,
  fetchSharedTeam,
  fetchSharedTeams,
  resetMatchSessionHalf,
  requestMatchSessionPause,
  signOffMatchSession,
  startMatchSessionTimer,
  type MatchSessionEventSummary,
  type MatchSessionFinalSignoff,
  type MatchSessionProgressionSummary,
  type MatchSessionTimerState,
  type MatchSessionViewerSummary,
  type SharedTeamSummary,
} from '../../../shared/integration/matchSessionApi'
import type { ImportedBlockDicePlayer, ImportedBlockDiceTeam } from '../../../shared/integration/teamImport'

const GRID_SIZE = 7
const STRENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const STORAGE_KEY = 'blood-bowl-toolkit:block-dice'
const PLAYER_SKILL_OPTIONS: Skill[] = ['GUARD', 'DEFENSIVE', 'DAUNTLESS', 'HORNS']
const ATTACKER_CARD_SKILL_OPTIONS: Skill[] = ['DAUNTLESS', 'HORNS']
const DEFENDER_CARD_SKILL_OPTIONS: Skill[] = ['GUARD', 'DEFENSIVE']
// Keep blitz candidate invalidation logic dormant for now.
// The current MVP hides the explicit action because the UX is too loose for release.
const SHOW_BLITZ_INVALIDATION_ACTION = false
const LIVE_MATCH_EVENT_OPTIONS: Array<MatchSessionEventSummary['eventType']> = [
  'TOUCHDOWN',
  'CASUALTY',
  'COMPLETION',
  'INTERCEPTION',
  'MVP_ASSIGNMENT',
]
const CASUALTY_RESOLUTION_OPTIONS: Array<{
  value:
    | 'NONE'
    | 'MISS_NEXT_GAME'
    | 'NIGGLING_INJURY'
    | 'SERIOUS_INJURY'
    | 'LASTING_INJURY_ARMOUR'
    | 'LASTING_INJURY_MOVEMENT'
    | 'LASTING_INJURY_PASSING'
    | 'LASTING_INJURY_AGILITY'
    | 'LASTING_INJURY_STRENGTH'
    | 'DEAD'
  label: string
}> = [
  { value: 'NONE', label: 'No lasting effect' },
  { value: 'MISS_NEXT_GAME', label: 'Miss next game' },
  { value: 'SERIOUS_INJURY', label: 'Serious injury (MNG + NI)' },
  { value: 'LASTING_INJURY_ARMOUR', label: 'Lasting injury (-1 AV, MNG)' },
  { value: 'LASTING_INJURY_MOVEMENT', label: 'Lasting injury (-1 MA, MNG)' },
  { value: 'LASTING_INJURY_PASSING', label: 'Lasting injury (-1 PA, MNG)' },
  { value: 'LASTING_INJURY_AGILITY', label: 'Lasting injury (-1 AG, MNG)' },
  { value: 'LASTING_INJURY_STRENGTH', label: 'Lasting injury (-1 ST, MNG)' },
  { value: 'DEAD', label: 'Dead' },
]
type AppMode = 'EDIT' | 'CALCULATE'
type PreviewMode = 'STANDARD' | 'BLITZ'
type HelpTopic = 'GUIDE' | 'INSTALL'
type TeamLoaderTarget = TeamSide | null

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
const defaultImportedTeamIds: Record<TeamSide, string | null> = {
  A: null,
  B: null,
}
const defaultSelectedImportedPlayerIds: Record<TeamSide, string | null> = {
  A: null,
  B: null,
}
const importedTeamTemplateMap = buildRosterTemplateMap(rosterTemplates)

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
  importedTeamIds?: Record<TeamSide, string | null>
  selectedImportedPlayerIds?: Record<TeamSide, string | null>
  invalidatedBlitzCandidates: Record<string, string[]>
  selectedBlitzCandidateKey: string | null
  currentSessionId?: string
  sessionCodeInput?: string
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

function buildImportedPlacementId(teamSide: TeamSide, importedPlayerId: string) {
  return `import-${teamSide}-${importedPlayerId}`
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

function formatImportedPlayerOptionLabel(player: ImportedBlockDicePlayer) {
  const numberLabel = player.shirtNumber ?? '-'
  return `${numberLabel}. ${player.playerName} - ${player.positionName}`
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

function getExplanationEntryMeta(tone: 'SUCCESS' | 'WARNING' | 'MUTED') {
  if (tone === 'SUCCESS') {
    return {
      className: styles.assistVALID,
      icon: '✓',
      iconLabel: 'Successful assist',
    }
  }

  if (tone === 'WARNING') {
    return {
      className: styles.assistCANCELLED,
      icon: '▲',
      iconLabel: 'Marked or failed assist',
    }
  }

  return {
    className: styles.assistINELIGIBLE,
    icon: '⊘',
    iconLabel: 'Not relevant assist line',
  }
}

function formatClock(totalSeconds: number) {
  const clampedSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(clampedSeconds / 60)
  const seconds = clampedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function toSessionSideLabel(side: 'HOME' | 'AWAY') {
  return side === 'HOME' ? 'BLUE' : 'RED'
}

function getOpposingSessionSide(side: 'HOME' | 'AWAY') {
  return side === 'HOME' ? 'AWAY' : 'HOME'
}

function formatStatAdjustmentsSummary(adjustments: {
  movement?: number
  strength?: number
  agility?: number
  passing?: number
  armour?: number
}) {
  const entries: Array<[string, number | undefined]> = [
    ['MA', adjustments.movement],
    ['ST', adjustments.strength],
    ['AG', adjustments.agility],
    ['PA', adjustments.passing],
    ['AV', adjustments.armour],
  ]

  return entries
    .filter(([, value]) => typeof value === 'number' && value !== 0)
    .map(([label, value]) => `${label} ${value! > 0 ? '+' : ''}${value}`)
    .join(', ')
}

function toEventTypeLabel(eventType: MatchSessionEventSummary['eventType']) {
  switch (eventType) {
    case 'TOUCHDOWN':
      return 'Touchdown'
    case 'CASUALTY':
      return 'Casualty'
    case 'COMPLETION':
      return 'Completion'
    case 'INTERCEPTION':
      return 'Interception'
    case 'MVP_ASSIGNMENT':
      return 'MVP'
  }
}

export function BlockDiceCalculator() {
  const bootstrappedSession = bootstrapMatchSessionAuthFromUrl()
  const persistedState = loadPersistedState()
  const savedTeams = readAvailableTeamsFromWindow()
  const [sharedImportedTeamOptions, setSharedImportedTeamOptions] = useState<ImportedBlockDiceTeam[]>([])
  const [isSharedImportedTeamsLoading, setIsSharedImportedTeamsLoading] = useState(false)
  const localImportedTeamOptions = savedTeams
    .flatMap((team) => {
      try {
        return [resolveImportedTeam(team, importedTeamTemplateMap)]
      } catch {
        return [] as ImportedBlockDiceTeam[]
      }
    })
  const importedTeamOptions = [...new Map(
    [...localImportedTeamOptions, ...sharedImportedTeamOptions].map((team) => [team.id, team]),
  ).values()]
    .sort((left, right) => left.name.localeCompare(right.name))
  const importedTeamOptionMap = new Map(importedTeamOptions.map((team) => [team.id, team]))
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
  const [importedTeamIds, setImportedTeamIds] = useState<Record<TeamSide, string | null>>(
    persistedState?.importedTeamIds ?? defaultImportedTeamIds,
  )
  const [selectedImportedPlayerIds, setSelectedImportedPlayerIds] = useState<Record<TeamSide, string | null>>(
    persistedState?.selectedImportedPlayerIds ?? defaultSelectedImportedPlayerIds,
  )
  const [invalidatedBlitzCandidates, setInvalidatedBlitzCandidates] = useState<Record<string, string[]>>(
    persistedState?.invalidatedBlitzCandidates ?? {},
  )
  const [selectedBlitzCandidateKey, setSelectedBlitzCandidateKey] = useState<string | null>(
    persistedState?.selectedBlitzCandidateKey ?? null,
  )
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState(false)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [helpTopic, setHelpTopic] = useState<HelpTopic>('GUIDE')
  const [teamLoaderTarget, setTeamLoaderTarget] = useState<TeamLoaderTarget>(null)
  const [teamImportFeedback, setTeamImportFeedback] = useState('')
  const [isSessionLoaderOpen, setIsSessionLoaderOpen] = useState(false)
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [sessionCodeInput, setSessionCodeInput] = useState(
    bootstrappedSession.sessionCode ?? persistedState?.sessionCodeInput ?? '',
  )
  const [currentSessionId, setCurrentSessionId] = useState(
    bootstrappedSession.sessionCode ? '' : (persistedState?.currentSessionId ?? ''),
  )
  const [sessionTimer, setSessionTimer] = useState<MatchSessionTimerState | null>(null)
  const [sessionEvents, setSessionEvents] = useState<MatchSessionEventSummary[]>([])
  const [sessionFinalSignoff, setSessionFinalSignoff] = useState<MatchSessionFinalSignoff | null>(null)
  const [sessionProgression, setSessionProgression] = useState<MatchSessionProgressionSummary | null>(null)
  const [sessionViewer, setSessionViewer] = useState<MatchSessionViewerSummary | null>(null)
  const [selectedSessionEventType, setSelectedSessionEventType] =
    useState<MatchSessionEventSummary['eventType']>('TOUCHDOWN')
  const [selectedSessionEventTeamSide, setSelectedSessionEventTeamSide] =
    useState<MatchSessionEventSummary['teamSide']>('HOME')
  const [sessionEventPlayerNumberInput, setSessionEventPlayerNumberInput] = useState('')
  const [sessionEventInjuredTeamSide, setSessionEventInjuredTeamSide] =
    useState<MatchSessionEventSummary['teamSide']>('AWAY')
  const [sessionEventInjuredPlayerNumberInput, setSessionEventInjuredPlayerNumberInput] = useState('')
  const [sessionEventCasualtyResolutionType, setSessionEventCasualtyResolutionType] = useState<
    | 'NONE'
    | 'MISS_NEXT_GAME'
    | 'NIGGLING_INJURY'
    | 'SERIOUS_INJURY'
    | 'LASTING_INJURY_ARMOUR'
    | 'LASTING_INJURY_MOVEMENT'
    | 'LASTING_INJURY_PASSING'
    | 'LASTING_INJURY_AGILITY'
    | 'LASTING_INJURY_STRENGTH'
    | 'DEAD'
  >('NONE')
  const [sessionEventNotes, setSessionEventNotes] = useState('')
  const [isSessionLoading, setIsSessionLoading] = useState(false)
  const [isSessionTimerLoading, setIsSessionTimerLoading] = useState(false)
  const [isSessionEventLoading, setIsSessionEventLoading] = useState(false)
  const [sharedTeams, setSharedTeams] = useState<SharedTeamSummary[]>([])
  const [isSharedTeamsLoading, setIsSharedTeamsLoading] = useState(false)
  const [createSessionHomeTeamId, setCreateSessionHomeTeamId] = useState('')
  const [createSessionAwayTeamId, setCreateSessionAwayTeamId] = useState('')
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const teamImportInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let isDisposed = false

    async function loadSharedImportedTeams() {
      setIsSharedImportedTeamsLoading(true)

      try {
        const summaries = await fetchSharedTeams()
        const records = await Promise.all(summaries.map(async (team) => fetchSharedTeam(team.id)))
        const nextTeams = records.flatMap((team) => {
          try {
            return [resolveImportedTeam(team, importedTeamTemplateMap)]
          } catch {
            return [] as ImportedBlockDiceTeam[]
          }
        })

        if (!isDisposed) {
          setSharedImportedTeamOptions(nextTeams)
        }
      } catch {
        if (!isDisposed) {
          setSharedImportedTeamOptions([])
        }
      } finally {
        if (!isDisposed) {
          setIsSharedImportedTeamsLoading(false)
        }
      }
    }

    void loadSharedImportedTeams()

    return () => {
      isDisposed = true
    }
  }, [])

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
      importedTeamIds,
      selectedImportedPlayerIds,
      invalidatedBlitzCandidates,
      selectedBlitzCandidateKey,
      currentSessionId,
      sessionCodeInput,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    appMode,
    activeTeam,
    boardState,
    teamDrafts,
    focusSelectedDefender,
    importedTeamIds,
    invalidatedBlitzCandidates,
    nextNumbers,
    playerProfiles,
    previewMode,
    currentSessionId,
    sessionCodeInput,
    selectedEditPlayerIds,
    selectedImportedPlayerIds,
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
    const importedTeam = importedTeamIds[activeTeam] ? importedTeamOptionMap.get(importedTeamIds[activeTeam] ?? '') ?? null : null
    const placedImportedPlayerIds = new Set(
      boardState.placedPlayers
        .filter((player) => player.teamSide === activeTeam)
        .map((player) => player.id),
    )
    const availableImportedPlayers = importedTeam
      ? importedTeam.players.filter(
          (player) => !placedImportedPlayerIds.has(buildImportedPlacementId(activeTeam, player.id)),
        )
      : []
    const selectedImportedPlayer =
      importedTeam && availableImportedPlayers.length > 0
        ? availableImportedPlayers.find((player) => player.id === selectedImportedPlayerIds[activeTeam]) ??
          availableImportedPlayers[0]
        : null

    if (importedTeam && selectedImportedPlayer) {
      const placedPlayerId = buildImportedPlacementId(activeTeam, selectedImportedPlayer.id)
      const profileId = `profile-${placedPlayerId}`

      const nextProfile: PlayerProfile = {
        id: profileId,
        number: selectedImportedPlayer.shirtNumber ?? undefined,
        name: selectedImportedPlayer.playerName,
        strength: selectedImportedPlayer.strength,
        skills: selectedImportedPlayer.blockDiceSkills,
      }

      const nextPlacedPlayer: PlacedPlayer = {
        id: placedPlayerId,
        profileId,
        teamSide: activeTeam,
        position,
        isStanding: true,
        hasTackleZone: true,
      }

      setPlayerProfiles((currentProfiles) => [...currentProfiles, nextProfile])
      setBoardState((currentState) => ({
        ...currentState,
        placedPlayers: [...currentState.placedPlayers, nextPlacedPlayer],
      }))
      setSelectedEditPlayerIds((current) => ({
        ...current,
        [activeTeam]: nextPlacedPlayer.id,
      }))
      setSelectedImportedPlayerIds((current) => ({
        ...current,
        [activeTeam]: null,
      }))
      return
    }

    if (importedTeam) {
      return
    }

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

  const updateTeamDraft = (teamSide: TeamSide, updates: Partial<TeamDraft>) => {
    setTeamDrafts((current) => ({
      ...current,
      [teamSide]: {
        ...current[teamSide],
        ...updates,
      },
    }))
  }

  const setImportedTeamSelection = (teamSide: TeamSide, importedTeamId: string) => {
    setImportedTeamIds((current) => ({
      ...current,
      [teamSide]: importedTeamId || null,
    }))
    setSelectedImportedPlayerIds((current) => ({
      ...current,
      [teamSide]: null,
    }))
    setSelectedEditPlayerIds((current) => ({
      ...current,
      [teamSide]: null,
    }))
  }

  const setImportedPlayerSelection = (teamSide: TeamSide, importedPlayerId: string) => {
    setSelectedImportedPlayerIds((current) => ({
      ...current,
      [teamSide]: importedPlayerId || null,
    }))
  }

  const openTeamLoader = (teamSide: TeamSide) => {
    setIsHeaderMenuOpen(false)
    setTeamLoaderTarget(teamSide)
  }

  const applyTeamLoaderSelection = (teamSide: TeamSide, importedTeamId: string | null) => {
    setImportedTeamSelection(teamSide, importedTeamId ?? '')
    setTeamLoaderTarget(null)
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
    const nextSelectionState = getNextSelectionState({
      currentState: boardState,
      player,
      activeTeam,
      previewMode,
      selectedBlitzCandidateKey,
    })

    if (nextSelectionState.boardState !== boardState) {
      setBoardState(nextSelectionState.boardState)
    }

    if (nextSelectionState.selectedBlitzCandidateKey !== selectedBlitzCandidateKey) {
      setSelectedBlitzCandidateKey(nextSelectionState.selectedBlitzCandidateKey)
    }
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
    setImportedTeamIds(defaultImportedTeamIds)
    setSelectedImportedPlayerIds(defaultSelectedImportedPlayerIds)
    setInvalidatedBlitzCandidates({})
    setSelectedBlitzCandidateKey(null)
    setIsWhyPanelOpen(false)
    setIsHeaderMenuOpen(false)
    setIsHelpOpen(false)
    setTeamLoaderTarget(null)

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const openHelpSheet = (topic: HelpTopic) => {
    setIsHeaderMenuOpen(false)
    setHelpTopic(topic)
    setIsHelpOpen(true)
  }

  const openTeamImportPicker = () => {
    setIsHeaderMenuOpen(false)
    teamImportInputRef.current?.click()
  }

  const openSessionLoader = () => {
    setIsHeaderMenuOpen(false)
    setIsSessionLoaderOpen(true)
  }

  const openCreateSession = () => {
    setIsHeaderMenuOpen(false)
    setIsCreateSessionOpen(true)
  }

  const handleTeamImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    try {
      const rawValue = await selectedFile.text()
      const parsedPackage = parseTeamCreatorExchangePackage(rawValue)

      if (!parsedPackage) {
        setTeamImportFeedback('That file is not a valid team-creator export package.')
        return
      }

      if (typeof window !== 'undefined') {
        storeImportedTeamsExchange(
          window.localStorage,
          buildTeamCreatorExchangePackage(parsedPackage.teams),
        )
      }

      setTeamImportFeedback(
        `Imported ${parsedPackage.teams.length} team${parsedPackage.teams.length === 1 ? '' : 's'} into block dice.`,
      )
    } catch {
      setTeamImportFeedback('The team export file could not be read.')
    } finally {
      event.target.value = ''
    }
  }

  const applySessionContext = (options: {
    sessionId: string
    homeTeam: Parameters<typeof buildTeamCreatorExchangePackage>[0][number]
    awayTeam: Parameters<typeof buildTeamCreatorExchangePackage>[0][number]
    sessionCode: string
    viewer?: MatchSessionViewerSummary | null
    silent?: boolean
  }) => {
    if (typeof window !== 'undefined') {
      storeImportedTeamsExchange(
        window.localStorage,
        buildTeamCreatorExchangePackage([options.homeTeam, options.awayTeam]),
      )
    }

    setImportedTeamIds({
      A: options.homeTeam.id,
      B: options.awayTeam.id,
    })
    setSelectedImportedPlayerIds(defaultSelectedImportedPlayerIds)
    setSelectedEditPlayerIds({ A: null, B: null })
    setCurrentSessionId(options.sessionId)
    setSessionCodeInput(options.sessionCode)
    setSessionViewer(options.viewer ?? null)
    setSessionEvents([])
    setSessionFinalSignoff(null)
    setSessionProgression(null)
    if (!options.silent) {
      setTeamImportFeedback(
        `Loaded session ${options.sessionCode}. Blue: ${options.homeTeam.name}. Red: ${options.awayTeam.name}.`,
      )
    }
  }

  const handleLoadSessionByCode = async () => {
    setIsSessionLoading(true)

    try {
      let sessionContext = await fetchBlockDiceSessionContextByCode(sessionCodeInput)

      if (sessionContext.viewer.userId && !sessionContext.viewer.participantSide) {
        await claimMatchSessionParticipant(sessionContext.matchSession.id)
        sessionContext = await fetchBlockDiceSessionContext(sessionContext.matchSession.id)
      }

      setIsSessionLoaderOpen(false)
      applySessionContext({
        sessionId: sessionContext.matchSession.id,
        homeTeam: sessionContext.teams.home,
        awayTeam: sessionContext.teams.away,
        sessionCode: sessionContext.matchSession.sessionCode,
        viewer: sessionContext.viewer,
      })
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Session load failed: ${error.message}` : 'Session load failed.',
      )
    } finally {
      setIsSessionLoading(false)
    }
  }

  useEffect(() => {
    if (!currentSessionId) {
      return
    }

    let isDisposed = false

    async function refreshSessionContext() {
      try {
        let sessionContext = await fetchBlockDiceSessionContext(currentSessionId)

        if (sessionContext.viewer.userId && sessionContext.viewer.assignedSide && !sessionContext.viewer.participantSide) {
          await claimMatchSessionParticipant(currentSessionId)
          sessionContext = await fetchBlockDiceSessionContext(currentSessionId)
        }

        if (isDisposed) {
          return
        }

        applySessionContext({
          sessionId: sessionContext.matchSession.id,
          homeTeam: sessionContext.teams.home,
          awayTeam: sessionContext.teams.away,
          sessionCode: sessionContext.matchSession.sessionCode,
          viewer: sessionContext.viewer,
          silent: true,
        })
      } catch {
        // Keep the last local session snapshot if the backend refresh fails.
      }
    }

    void refreshSessionContext()

    return () => {
      isDisposed = true
    }
  }, [currentSessionId])

  useEffect(() => {
    if (!bootstrappedSession.sessionCode) {
      return
    }

    void handleLoadSessionByCode()
  }, [bootstrappedSession.sessionCode])

  useEffect(() => {
    if (!isCreateSessionOpen) {
      return
    }

    let isDisposed = false

    async function loadSharedTeams() {
      setIsSharedTeamsLoading(true)

      try {
        const nextTeams = await fetchSharedTeams()

        if (isDisposed) {
          return
        }

        setSharedTeams(nextTeams)
        setCreateSessionHomeTeamId((current) => current || nextTeams[0]?.id || '')
        setCreateSessionAwayTeamId((current) => {
          if (current) {
            return current
          }

          const fallbackAway = nextTeams.find((team) => team.id !== (nextTeams[0]?.id ?? ''))
          return fallbackAway?.id ?? ''
        })
      } catch (error) {
        if (!isDisposed) {
          setTeamImportFeedback(
            error instanceof Error ? `Shared team load failed: ${error.message}` : 'Shared team load failed.',
          )
        }
      } finally {
        if (!isDisposed) {
          setIsSharedTeamsLoading(false)
        }
      }
    }

    void loadSharedTeams()

    return () => {
      isDisposed = true
    }
  }, [isCreateSessionOpen])

  const handleCreateSession = async () => {
    setIsCreatingSession(true)

    try {
      const sessionContext = await createBlockDiceSessionContext(
        createSessionHomeTeamId,
        createSessionAwayTeamId,
      )

      setIsCreateSessionOpen(false)
      applySessionContext({
        sessionId: sessionContext.matchSession.id,
        homeTeam: sessionContext.teams.home,
        awayTeam: sessionContext.teams.away,
        sessionCode: sessionContext.matchSession.sessionCode,
        viewer: sessionContext.viewer,
      })
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Session creation failed: ${error.message}` : 'Session creation failed.',
      )
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleClaimAssignedSide = async () => {
    if (!currentSessionId) {
      return
    }

    try {
      setIsSessionLoading(true)
      await claimMatchSessionParticipant(currentSessionId)
      const sessionContext = await fetchBlockDiceSessionContext(currentSessionId)
      applySessionContext({
        sessionId: sessionContext.matchSession.id,
        homeTeam: sessionContext.teams.home,
        awayTeam: sessionContext.teams.away,
        sessionCode: sessionContext.matchSession.sessionCode,
        viewer: sessionContext.viewer,
        silent: true,
      })
      setTeamImportFeedback('Match room side claimed.')
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Side claim failed: ${error.message}` : 'Side claim failed.',
      )
    } finally {
      setIsSessionLoading(false)
    }
  }

  useEffect(() => {
    if (!currentSessionId) {
      setSessionTimer(null)
      setSessionEvents([])
      setSessionFinalSignoff(null)
      setSessionProgression(null)
      return
    }

    let isDisposed = false

    async function loadTimer() {
      try {
        const timer = await fetchMatchSessionTimer(currentSessionId)

        if (!isDisposed) {
          setSessionTimer(timer)
        }
      } catch (error) {
        if (!isDisposed) {
          setTeamImportFeedback(
            error instanceof Error ? `Session timer load failed: ${error.message}` : 'Session timer load failed.',
          )
        }
      } finally {
        if (!isDisposed) {
          setIsSessionTimerLoading(false)
        }
      }
    }

    setIsSessionTimerLoading(true)
    void loadTimer()
    const intervalId = window.setInterval(() => {
      void loadTimer()
    }, 1000)

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
    }
  }, [currentSessionId])

  useEffect(() => {
    if (!currentSessionId) {
      return
    }

    let isDisposed = false

    async function loadEvents() {
      try {
        const payload = await fetchMatchSessionEvents(currentSessionId)

        if (!isDisposed) {
          setSessionEvents(payload.events)
          setSessionFinalSignoff(payload.signoff)
        }
      } catch (error) {
        if (!isDisposed) {
          setTeamImportFeedback(
            error instanceof Error ? `Session event load failed: ${error.message}` : 'Session event load failed.',
          )
        }
      } finally {
        if (!isDisposed) {
          setIsSessionEventLoading(false)
        }
      }
    }

    setIsSessionEventLoading(true)
    void loadEvents()
    const intervalId = window.setInterval(() => {
      void loadEvents()
    }, 3000)

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
    }
  }, [currentSessionId])

  useEffect(() => {
    if (!currentSessionId) {
      return
    }

    let isDisposed = false

    async function loadProgression() {
      try {
        const progression = await fetchMatchSessionProgression(currentSessionId)

        if (!isDisposed) {
          setSessionProgression(progression)
        }
      } catch (error) {
        if (!isDisposed) {
          setTeamImportFeedback(
            error instanceof Error
              ? `Session progression load failed: ${error.message}`
              : 'Session progression load failed.',
          )
        }
      }
    }

    void loadProgression()

    return () => {
      isDisposed = true
    }
  }, [currentSessionId, sessionFinalSignoff?.status, sessionEvents.length])

  useEffect(() => {
    if (!currentSessionId) {
      return
    }

    let isDisposed = false

    const refreshLiveMatchState = async () => {
      try {
        const [timer, eventsPayload, progression, sessionContext] = await Promise.all([
          fetchMatchSessionTimer(currentSessionId),
          fetchMatchSessionEvents(currentSessionId),
          fetchMatchSessionProgression(currentSessionId),
          fetchBlockDiceSessionContext(currentSessionId),
        ])

        if (isDisposed) {
          return
        }

        setSessionTimer(timer)
        setSessionEvents(eventsPayload.events)
        setSessionFinalSignoff(eventsPayload.signoff)
        setSessionProgression(progression)
        setSessionViewer(sessionContext.viewer)
      } catch {
        // Keep the last known local state if the poll fails.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshLiveMatchState()
    }, 2500)

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
    }
  }, [currentSessionId])

  const handleStartSessionTurn = async (side?: 'HOME' | 'AWAY') => {
    if (!currentSessionId) {
      return
    }

    try {
      const timer = await startMatchSessionTimer(currentSessionId, side)
      setSessionTimer(timer)
      const payload = await fetchMatchSessionEvents(currentSessionId)
      setSessionEvents(payload.events)
      setSessionFinalSignoff(payload.signoff)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Timer start failed: ${error.message}` : 'Timer start failed.',
      )
    }
  }

  const handleRequestSessionPause = async () => {
    if (!currentSessionId || !viewerParticipantSide) {
      return
    }

    try {
      const timer = await requestMatchSessionPause(currentSessionId, viewerParticipantSide)
      setSessionTimer(timer)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Pause request failed: ${error.message}` : 'Pause request failed.',
      )
    }
  }

  const handleConfirmSessionPause = async () => {
    if (!currentSessionId || !viewerParticipantSide) {
      return
    }

    try {
      const timer = await confirmMatchSessionPause(currentSessionId, viewerParticipantSide)
      setSessionTimer(timer)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Pause confirmation failed: ${error.message}` : 'Pause confirmation failed.',
      )
    }
  }

  const handleEndSessionTurn = async () => {
    if (!currentSessionId) {
      return
    }

    try {
      const timer = await endMatchSessionTurn(currentSessionId)
      setSessionTimer(timer)
      const payload = await fetchMatchSessionEvents(currentSessionId)
      setSessionEvents(payload.events)
      setSessionFinalSignoff(payload.signoff)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Turn end failed: ${error.message}` : 'Turn end failed.',
      )
    }
  }

  const handleResetSessionHalf = async () => {
    if (!currentSessionId) {
      return
    }

    try {
      const timer = await resetMatchSessionHalf(currentSessionId)
      setSessionTimer(timer)
      const payload = await fetchMatchSessionEvents(currentSessionId)
      setSessionEvents(payload.events)
      setSessionFinalSignoff(payload.signoff)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Half reset failed: ${error.message}` : 'Half reset failed.',
      )
    }
  }

  const handleCreateSessionEvent = async () => {
    if (!currentSessionId) {
      return
    }

    if (!sessionTimer || (sessionTimer.phase !== 'RUNNING' && sessionTimer.phase !== 'REVIEW')) {
      setTeamImportFeedback('Events can only be added while the turn is running or during turn review.')
      return
    }

    if (!sessionEventPlayerNumberInput.trim()) {
      setTeamImportFeedback('Choose a player number before adding an event.')
      return
    }

    if (
      !sessionEventPlayerOptions.some(
        (player) => String(player.shirtNumber ?? '') === sessionEventPlayerNumberInput,
      )
    ) {
      setTeamImportFeedback('Choose a valid player from the selected team before adding an event.')
      return
    }

    if (selectedSessionEventType === 'CASUALTY' && !sessionEventInjuredPlayerNumberInput.trim()) {
      setTeamImportFeedback('Choose the injured player number for a casualty event.')
      return
    }

    if (
      selectedSessionEventType === 'CASUALTY' &&
      !sessionEventInjuredPlayerOptions.some(
        (player) => String(player.shirtNumber ?? '') === sessionEventInjuredPlayerNumberInput,
      )
    ) {
      setTeamImportFeedback('Choose a valid injured player from the selected team before adding an event.')
      return
    }

    try {
      setIsSessionEventLoading(true)
      await createMatchSessionEvent(currentSessionId, {
        eventType: selectedSessionEventType,
        teamSide: selectedSessionEventTeamSide,
        playerNumber: sessionEventPlayerNumberInput.trim()
          ? Number(sessionEventPlayerNumberInput)
          : null,
        injuredTeamSide:
          selectedSessionEventType === 'CASUALTY' ? sessionEventInjuredTeamSide : null,
        injuredPlayerNumber:
          selectedSessionEventType === 'CASUALTY' && sessionEventInjuredPlayerNumberInput.trim()
            ? Number(sessionEventInjuredPlayerNumberInput)
            : null,
        casualtyResolutionType:
          selectedSessionEventType === 'CASUALTY' ? sessionEventCasualtyResolutionType : null,
        notes: sessionEventNotes.trim() || null,
      })
      const payload = await fetchMatchSessionEvents(currentSessionId)
      const progression = await fetchMatchSessionProgression(currentSessionId)
      setSessionEvents(payload.events)
      setSessionFinalSignoff(payload.signoff)
      setSessionProgression(progression)
      setSessionEventPlayerNumberInput('')
      setSessionEventInjuredTeamSide(getOpposingSessionSide(selectedSessionEventTeamSide))
      setSessionEventInjuredPlayerNumberInput('')
      setSessionEventCasualtyResolutionType('NONE')
      setSessionEventNotes('')
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Match event add failed: ${error.message}` : 'Match event add failed.',
      )
    } finally {
      setIsSessionEventLoading(false)
    }
  }

  const handleDeleteSessionEvent = async (eventId: string) => {
    if (!currentSessionId) {
      return
    }

    try {
      setIsSessionEventLoading(true)
      await deleteMatchSessionEvent(currentSessionId, eventId)
      const payload = await fetchMatchSessionEvents(currentSessionId)
      const progression = await fetchMatchSessionProgression(currentSessionId)
      setSessionEvents(payload.events)
      setSessionFinalSignoff(payload.signoff)
      setSessionProgression(progression)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Match event delete failed: ${error.message}` : 'Match event delete failed.',
      )
    } finally {
      setIsSessionEventLoading(false)
    }
  }

  const handleConfirmSessionEvent = async (eventId: string, side: 'HOME' | 'AWAY') => {
    if (!currentSessionId) {
      return
    }

    try {
      await confirmMatchSessionEvent(currentSessionId, eventId, side)
      const payload = await fetchMatchSessionEvents(currentSessionId)
      setSessionEvents(payload.events)
      setSessionFinalSignoff(payload.signoff)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Event confirmation failed: ${error.message}` : 'Event confirmation failed.',
      )
    }
  }

  const handleFinalSessionSignoff = async (side: 'HOME' | 'AWAY') => {
    if (!currentSessionId) {
      return
    }

    try {
      setIsSessionEventLoading(true)
      const signoff = await signOffMatchSession(currentSessionId, side)
      setSessionFinalSignoff(signoff)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Final signoff failed: ${error.message}` : 'Final signoff failed.',
      )
    } finally {
      setIsSessionEventLoading(false)
    }
  }

  const handleApplySessionProgression = async () => {
    if (!currentSessionId) {
      return
    }

    try {
      setIsSessionEventLoading(true)
      const progression = await applyMatchSessionProgression(currentSessionId)
      setSessionProgression(progression)
    } catch (error) {
      setTeamImportFeedback(
        error instanceof Error ? `Progression apply failed: ${error.message}` : 'Progression apply failed.',
      )
    } finally {
      setIsSessionEventLoading(false)
    }
  }

  useEffect(() => {
    if (sessionTimer) {
      setSelectedSessionEventTeamSide(sessionTimer.activeSide)
    }
  }, [sessionTimer?.activeSide])

  useEffect(() => {
    setSessionEventPlayerNumberInput('')
    setSessionEventInjuredTeamSide(getOpposingSessionSide(selectedSessionEventTeamSide))
  }, [selectedSessionEventTeamSide])

  useEffect(() => {
    setSessionEventInjuredPlayerNumberInput('')
  }, [sessionEventInjuredTeamSide])

  const defendingTeam: TeamSide = activeTeam === 'A' ? 'B' : 'A'
  const selectedEditPlayerA =
    boardState.placedPlayers.find((player) => player.id === selectedEditPlayerIds.A) ?? null
  const selectedEditPlayerB =
    boardState.placedPlayers.find((player) => player.id === selectedEditPlayerIds.B) ?? null
  const selectedEditProfileA = getProfileForPlayer(selectedEditPlayerA, playerProfiles)
  const selectedEditProfileB = getProfileForPlayer(selectedEditPlayerB, playerProfiles)
  const importedTeamsBySide: Record<TeamSide, ImportedBlockDiceTeam | null> = {
    A: importedTeamIds.A ? importedTeamOptionMap.get(importedTeamIds.A) ?? null : null,
    B: importedTeamIds.B ? importedTeamOptionMap.get(importedTeamIds.B) ?? null : null,
  }
  const availableImportedPlayersBySide: Record<TeamSide, ImportedBlockDicePlayer[]> = {
    A: importedTeamsBySide.A
      ? importedTeamsBySide.A.players.filter(
          (player) =>
            !boardState.placedPlayers.some(
              (placedPlayer) => placedPlayer.id === buildImportedPlacementId('A', player.id),
            ),
        )
      : [],
    B: importedTeamsBySide.B
      ? importedTeamsBySide.B.players.filter(
          (player) =>
            !boardState.placedPlayers.some(
              (placedPlayer) => placedPlayer.id === buildImportedPlacementId('B', player.id),
            ),
        )
      : [],
  }
  const sessionEventPlayerOptions =
    selectedSessionEventTeamSide === 'HOME'
      ? [...(importedTeamsBySide.A?.players ?? [])].sort(
          (left, right) => (left.shirtNumber ?? 999) - (right.shirtNumber ?? 999),
        )
      : [...(importedTeamsBySide.B?.players ?? [])].sort(
          (left, right) => (left.shirtNumber ?? 999) - (right.shirtNumber ?? 999),
        )
  const sessionEventInjuredPlayerOptions =
    sessionEventInjuredTeamSide === 'HOME'
      ? [...(importedTeamsBySide.A?.players ?? [])].sort(
          (left, right) => (left.shirtNumber ?? 999) - (right.shirtNumber ?? 999),
        )
      : [...(importedTeamsBySide.B?.players ?? [])].sort(
          (left, right) => (left.shirtNumber ?? 999) - (right.shirtNumber ?? 999),
        )
  const pendingImportedPlayersBySide: Record<TeamSide, ImportedBlockDicePlayer | null> = {
    A:
      availableImportedPlayersBySide.A.find((player) => player.id === selectedImportedPlayerIds.A) ??
      availableImportedPlayersBySide.A[0] ??
      null,
    B:
      availableImportedPlayersBySide.B.find((player) => player.id === selectedImportedPlayerIds.B) ??
      availableImportedPlayersBySide.B[0] ??
      null,
  }
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
    const importedTeam = importedTeamsBySide[teamSide]
    const pendingImportedPlayer = pendingImportedPlayersBySide[teamSide]
    const availableImportedPlayers = availableImportedPlayersBySide[teamSide]
    const isImportedSource = Boolean(importedTeam)
    const isPendingImportedPreview = isImportedSource && !selectedPlayer

    return {
      teamSide,
      selectedPlayer,
      selectedProfile,
      importedTeam,
      pendingImportedPlayer,
      availableImportedPlayers,
      isImportedSource,
      isPendingImportedPreview,
      name:
        selectedProfile?.name ??
        pendingImportedPlayer?.playerName ??
        (selectedPlayer ? `Player ${getProfileTokenNumber(selectedPlayer, playerProfiles)}` : 'New player'),
      strength: selectedProfile?.strength ?? pendingImportedPlayer?.strength ?? draft.strength,
      skills: selectedProfile?.skills ?? pendingImportedPlayer?.blockDiceSkills ?? draft.skills,
      isStanding: selectedPlayer?.isStanding ?? draft.isStanding,
      hasTackleZone: selectedPlayer?.hasTackleZone ?? draft.hasTackleZone,
    }
  })
  const calculateTeamNameCards = [
    {
      key: activeTeam,
      teamSide: activeTeam,
      panelLabel: 'Attacker Team',
      importedTeam: importedTeamsBySide[activeTeam],
    },
    {
      key: defendingTeam,
      teamSide: defendingTeam,
      panelLabel: 'Defender Team',
      importedTeam: importedTeamsBySide[defendingTeam],
    },
  ]
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
      ? selectedCandidate?.calculation ?? currentSquareBlitzCalculation ?? null
      : activePreview?.calculation ?? (blocker && target ? calculateBlockDice(boardState, playerProfiles, { isBlitz: false }) : null)
  const canOpenWhy =
    previewMode === 'BLITZ'
      ? Boolean(selectedCandidate?.calculation ?? currentSquareBlitzCalculation)
      : Boolean(calculation)

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
      setIsWhyPanelOpen(false)
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

  const currentCandidate = selectedCandidate ?? candidateResult?.preferredCandidate ?? null
  const currentCandidatePositionLabel = currentCandidate
    ? `${currentCandidate.position.row + 1},${currentCandidate.position.col + 1}`
    : null
  const homeSessionTeamName = importedTeamsBySide.A?.name ?? 'Blue team'
  const awaySessionTeamName = importedTeamsBySide.B?.name ?? 'Red team'
  const timerActiveTeamLabel =
    sessionTimer?.activeSide === 'HOME' ? homeSessionTeamName : awaySessionTeamName
  const requiresManualTurnStartChoice =
    sessionTimer?.phase === 'READY' && sessionTimer.currentTurnNumber === 1
  const nextTurnStartSide =
    requiresManualTurnStartChoice
      ? null
      : sessionTimer?.phase === 'REVIEW'
      ? sessionTimer.activeSide === 'HOME'
        ? 'AWAY'
        : 'HOME'
      : sessionTimer?.activeSide ?? null
  const nextTurnStartTeamLabel =
    nextTurnStartSide === 'HOME'
      ? homeSessionTeamName
      : nextTurnStartSide === 'AWAY'
        ? awaySessionTeamName
        : 'Next team'
  const timerTurnClockLabel = sessionTimer ? formatClock(sessionTimer.perTurnRemainingSeconds) : '--:--'
  const timerHomeBankLabel = sessionTimer ? formatClock(sessionTimer.homeBankRemainingSeconds) : '--:--'
  const timerAwayBankLabel = sessionTimer ? formatClock(sessionTimer.awayBankRemainingSeconds) : '--:--'
  const currentTurnEvents = sessionTimer
    ? sessionEvents.filter(
        (event) =>
          event.half === sessionTimer.currentHalf &&
          event.turnNumber === sessionTimer.currentTurnNumber &&
          event.actingSide === sessionTimer.activeSide,
      )
    : []
  const currentTurnLocked =
    currentTurnEvents.length > 0 &&
    currentTurnEvents.every((event) => event.homeConfirmed && event.awayConfirmed)
  const homeFinalSignedOff = sessionFinalSignoff?.homeSignedOff ?? false
  const awayFinalSignedOff = sessionFinalSignoff?.awaySignedOff ?? false
  const isCurrentSessionClosed = sessionFinalSignoff?.status === 'CLOSED'
  const viewerAssignedSide = sessionViewer?.assignedSide ?? null
  const viewerParticipantSide = sessionViewer?.participantSide ?? null
  const viewerCanStartOrResume = viewerParticipantSide === nextTurnStartSide
  const viewerIsActiveSide = viewerParticipantSide === (sessionTimer?.activeSide ?? null)
  const pauseAwaitsOpponent =
    sessionTimer?.phase === 'PAUSE_REQUESTED' && viewerParticipantSide && !viewerIsActiveSide
  const viewerControlledTeamLabel =
    viewerParticipantSide === 'HOME'
      ? homeSessionTeamName
      : viewerParticipantSide === 'AWAY'
        ? awaySessionTeamName
        : null
  const viewerControlledColorLabel =
    viewerParticipantSide === 'HOME'
      ? 'BLUE'
      : viewerParticipantSide === 'AWAY'
        ? 'RED'
        : null
  const viewerCanChooseOpeningSide =
    Boolean(viewerParticipantSide) && requiresManualTurnStartChoice
  const canRenderPrimaryTurnAction =
    (viewerCanChooseOpeningSide || viewerCanStartOrResume) &&
    (sessionTimer?.phase === 'READY' || sessionTimer?.phase === 'PAUSED' || sessionTimer?.phase === 'REVIEW')
  const shouldShowPauseAction = viewerIsActiveSide && sessionTimer?.phase === 'RUNNING'
  const shouldShowEndTurnAction = viewerIsActiveSide && sessionTimer?.phase === 'RUNNING'
  const shouldShowConfirmPauseAction = Boolean(pauseAwaitsOpponent)
  const unresolvedCurrentTurnEventCount = currentTurnEvents.filter(
    (event) => !event.homeConfirmed || !event.awayConfirmed,
  ).length
  const completedSecondSideTurnEight =
    sessionTimer?.currentTurnNumber === 8 && sessionTimer.activeSide === 'AWAY'
  const halfTransitionPending =
    sessionTimer?.currentHalf === 1 && sessionTimer.phase === 'REVIEW' && completedSecondSideTurnEight
  const matchEndReviewPending =
    sessionTimer?.currentHalf === 2 && sessionTimer.phase === 'REVIEW' && completedSecondSideTurnEight
  const canAdvanceToNextHalf =
    Boolean(viewerParticipantSide) &&
    sessionTimer?.currentHalf === 1 &&
    sessionTimer?.currentTurnNumber === 8 &&
    sessionTimer?.activeSide === 'AWAY' &&
    (sessionTimer?.phase === 'READY' ||
      sessionTimer?.phase === 'PAUSED' ||
      (sessionTimer?.phase === 'REVIEW' && unresolvedCurrentTurnEventCount === 0))
  const primaryTurnActionLabel =
    sessionTimer?.phase === 'PAUSED'
      ? `Resume ${timerActiveTeamLabel}`
      : requiresManualTurnStartChoice
        ? `Start ${viewerControlledTeamLabel ?? 'your team'}`
        : `Start ${nextTurnStartTeamLabel}`
  const sessionEventTotals = LIVE_MATCH_EVENT_OPTIONS.map((eventType) => ({
    eventType,
    total: sessionFinalSignoff?.eventTotals[eventType] ?? 0,
  })).filter((entry) => entry.total > 0)
  const progressionApplied = sessionProgression?.status === 'APPLIED'
  const currentTurnEventIds = new Set(currentTurnEvents.map((event) => event.id))
  const earlierLoggedEvents = sessionEvents.filter((event) => !currentTurnEventIds.has(event.id))
  const casualtyResolutionByEventId = new Map(
    sessionProgression?.casualtyResolutions.map((resolution) => [
      resolution.matchSessionEventId,
      resolution.resolutionType,
    ]) ?? [],
  )

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
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={openTeamImportPicker}
                    >
                      Import teams
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={() => openTeamLoader('A')}
                    >
                      Load blue team
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={() => openTeamLoader('B')}
                    >
                      Load red team
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={openCreateSession}
                    >
                      Create session
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={openSessionLoader}
                    >
                      Load session code
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={() => openHelpSheet('INSTALL')}
                    >
                      Install
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={() => openHelpSheet('GUIDE')}
                    >
                      Help
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <input
            ref={teamImportInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenFileInput}
            onChange={(event) => void handleTeamImportFileChange(event)}
          />
          {teamImportFeedback ? (
            <p className={styles.statusNote}>{teamImportFeedback}</p>
          ) : null}
          {currentSessionId && sessionTimer ? (
            <section
              className={`${styles.timerPanel} ${
                viewerParticipantSide === 'HOME'
                  ? styles.controlledByBlue
                  : viewerParticipantSide === 'AWAY'
                    ? styles.controlledByRed
                    : ''
              }`}
              aria-label="Live match timer"
            >
              <div className={styles.timerHeader}>
                <div>
                  <p className={styles.eyebrow}>Live Match Timer</p>
                  <p className={styles.resultHeadline}>
                    Half {sessionTimer.currentHalf} · Turn {sessionTimer.currentTurnNumber} · {timerActiveTeamLabel}
                  </p>
                  {viewerControlledTeamLabel && viewerControlledColorLabel ? (
                    <div
                      className={
                        viewerParticipantSide === 'HOME'
                          ? `${styles.controlBadge} ${styles.controlBadgeBlue}`
                          : `${styles.controlBadge} ${styles.controlBadgeRed}`
                      }
                    >
                      You are controlling {viewerControlledTeamLabel} ({viewerControlledColorLabel})
                    </div>
                  ) : null}
                  <p className={styles.statusNote}>
                    {viewerAssignedSide
                      ? `Assigned side: ${
                          viewerAssignedSide === 'HOME' ? homeSessionTeamName : awaySessionTeamName
                        } (${toSessionSideLabel(viewerAssignedSide)})`
                      : 'Signed-in user is not assigned to this fixture.'}
                    {viewerParticipantSide
                      ? ` · Claimed side: ${
                          viewerParticipantSide === 'HOME' ? homeSessionTeamName : awaySessionTeamName
                        } (${toSessionSideLabel(viewerParticipantSide)})`
                      : ' · Side not yet claimed in this room.'}
                  </p>
                  <p className={styles.statusNote}>
                    Blue: {homeSessionTeamName} · Red: {awaySessionTeamName} · Turn state:{' '}
                    {sessionTimer.phase.replace(/_/gu, ' ').toLowerCase()}
                  </p>
                  {requiresManualTurnStartChoice ? (
                    <p className={styles.statusNote}>
                      Choose which side starts turn 1 before the clock begins for this half.
                    </p>
                  ) : null}
                  {sessionTimer.phase === 'REVIEW' ? (
                    <p className={styles.statusNote}>
                      {halfTransitionPending
                        ? 'Turn review is complete for the end of the half. Once all events are confirmed, press Next half before starting the clock again.'
                        : matchEndReviewPending
                          ? 'Turn review is complete for the end of the second half. Once all events are confirmed, continue to final signoff instead of starting another turn.'
                          : `Turn review is still on ${timerActiveTeamLabel}. Once all events are confirmed, ${nextTurnStartTeamLabel} can start the next turn.`}
                    </p>
                  ) : null}
                  {viewerAssignedSide && !viewerParticipantSide ? (
                    <button
                      type="button"
                      className={styles.actionButtonSecondary}
                      onClick={() => void handleClaimAssignedSide()}
                      disabled={isSessionLoading}
                    >
                      Claim my side
                    </button>
                  ) : null}
                </div>
                <p className={styles.timerClock}>{timerTurnClockLabel}</p>
              </div>
              <div className={styles.timerBankRow}>
                <p className={styles.timerBankCard}>
                  <span>{homeSessionTeamName} bank</span>
                  <strong>{timerHomeBankLabel}</strong>
                </p>
                <p className={styles.timerBankCard}>
                  <span>{awaySessionTeamName} bank</span>
                  <strong>{timerAwayBankLabel}</strong>
                </p>
              </div>
              <div className={styles.timerActionRow}>
                {canRenderPrimaryTurnAction ? (
                  <button
                    type="button"
                    className={styles.actionButtonPrimary}
                    onClick={() => void handleStartSessionTurn(requiresManualTurnStartChoice ? viewerParticipantSide ?? undefined : undefined)}
                    disabled={isSessionTimerLoading || isCurrentSessionClosed}
                  >
                    {primaryTurnActionLabel}
                  </button>
                ) : null}
                {shouldShowPauseAction ? (
                  <button
                    type="button"
                    className={styles.actionButtonPrimary}
                    onClick={() => void handleRequestSessionPause()}
                    disabled={isSessionTimerLoading || isCurrentSessionClosed}
                  >
                    Pause {timerActiveTeamLabel}
                  </button>
                ) : null}
                {shouldShowConfirmPauseAction ? (
                  <button
                    type="button"
                    className={styles.actionButtonSecondary}
                    onClick={() => void handleConfirmSessionPause()}
                    disabled={isSessionTimerLoading || isCurrentSessionClosed}
                  >
                    Confirm pause
                  </button>
                ) : null}
                {shouldShowEndTurnAction ? (
                  <button
                    type="button"
                    className={styles.actionButtonSecondary}
                    onClick={() => void handleEndSessionTurn()}
                    disabled={isSessionTimerLoading || isCurrentSessionClosed}
                  >
                    End turn
                  </button>
                ) : null}
                {canAdvanceToNextHalf ? (
                  <button
                    type="button"
                    className={styles.actionButtonSecondary}
                    onClick={() => void handleResetSessionHalf()}
                    disabled={isSessionTimerLoading || isCurrentSessionClosed}
                  >
                    Next half
                  </button>
                ) : null}
              </div>
              {isCurrentSessionClosed ? (
                <p className={styles.statusNote}>This match room is closed after final signoff.</p>
              ) : null}
            </section>
          ) : null}
          {currentSessionId && sessionTimer ? (
            <section
              className={`${styles.eventPanel} ${
                viewerParticipantSide === 'HOME'
                  ? styles.controlledByBlue
                  : viewerParticipantSide === 'AWAY'
                    ? styles.controlledByRed
                    : ''
              }`}
              aria-label="Live match event log"
            >
              <div className={styles.timerHeader}>
                <div>
                  <p className={styles.eyebrow}>Turn Log</p>
                  <p className={styles.resultHeadline}>
                    Half {sessionTimer.currentHalf} · Turn {sessionTimer.currentTurnNumber} · {timerActiveTeamLabel}
                  </p>
                </div>
              </div>
              <div className={styles.eventFormGrid}>
                <label className={styles.sessionLoaderField}>
                  <span className={styles.playerCardControlLabel}>Event</span>
                  <select
                    className={styles.sessionLoaderInput}
                    value={selectedSessionEventType}
                    onChange={(event) => {
                      const nextType = event.target.value as MatchSessionEventSummary['eventType']
                      setSelectedSessionEventType(nextType)
                      if (nextType !== 'CASUALTY') {
                        setSessionEventInjuredPlayerNumberInput('')
                        setSessionEventCasualtyResolutionType('NONE')
                      }
                    }}
                  >
                    {LIVE_MATCH_EVENT_OPTIONS.map((eventType) => (
                      <option key={eventType} value={eventType}>
                        {toEventTypeLabel(eventType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.sessionLoaderField}>
                  <span className={styles.playerCardControlLabel}>Team</span>
                  <select
                    className={styles.sessionLoaderInput}
                    value={selectedSessionEventTeamSide}
                    onChange={(event) =>
                      setSelectedSessionEventTeamSide(event.target.value as 'HOME' | 'AWAY')
                    }
                  >
                    <option value="HOME">{homeSessionTeamName}</option>
                    <option value="AWAY">{awaySessionTeamName}</option>
                  </select>
                </label>
                <label className={styles.sessionLoaderField}>
                  <span className={styles.playerCardControlLabel}>
                    {selectedSessionEventType === 'CASUALTY' ? 'Causing player #' : 'Player #'}
                  </span>
                  <select
                    className={styles.sessionLoaderInput}
                    value={sessionEventPlayerNumberInput}
                    onChange={(event) => setSessionEventPlayerNumberInput(event.target.value)}
                  >
                    <option value="">Choose player</option>
                    {sessionEventPlayerOptions.map((player) => (
                      <option key={player.id} value={player.shirtNumber ?? ''}>
                        {formatImportedPlayerOptionLabel(player)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedSessionEventType === 'CASUALTY' ? (
                  <>
                    <label className={styles.sessionLoaderField}>
                      <span className={styles.playerCardControlLabel}>Injured team</span>
                      <select
                        className={styles.sessionLoaderInput}
                        value={sessionEventInjuredTeamSide}
                        onChange={(event) =>
                          setSessionEventInjuredTeamSide(event.target.value as 'HOME' | 'AWAY')
                        }
                      >
                        <option value="HOME">{homeSessionTeamName}</option>
                        <option value="AWAY">{awaySessionTeamName}</option>
                      </select>
                    </label>
                    <label className={styles.sessionLoaderField}>
                      <span className={styles.playerCardControlLabel}>Injured player</span>
                      <select
                        className={styles.sessionLoaderInput}
                        value={sessionEventInjuredPlayerNumberInput}
                        onChange={(event) => setSessionEventInjuredPlayerNumberInput(event.target.value)}
                      >
                        <option value="">Choose injured player</option>
                        {sessionEventInjuredPlayerOptions.map((player) => (
                          <option key={player.id} value={player.shirtNumber ?? ''}>
                            {formatImportedPlayerOptionLabel(player)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.sessionLoaderField}>
                      <span className={styles.playerCardControlLabel}>Injury result</span>
                      <select
                        className={styles.sessionLoaderInput}
                        value={sessionEventCasualtyResolutionType}
                        onChange={(event) =>
                          setSessionEventCasualtyResolutionType(
                            event.target.value as
                              | 'NONE'
                              | 'MISS_NEXT_GAME'
                              | 'NIGGLING_INJURY'
                              | 'SERIOUS_INJURY'
                              | 'LASTING_INJURY_ARMOUR'
                              | 'LASTING_INJURY_MOVEMENT'
                              | 'LASTING_INJURY_PASSING'
                              | 'LASTING_INJURY_AGILITY'
                              | 'LASTING_INJURY_STRENGTH'
                              | 'DEAD',
                          )
                        }
                      >
                        {CASUALTY_RESOLUTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
                <label className={styles.sessionLoaderField}>
                  <span className={styles.playerCardControlLabel}>Note</span>
                  <input
                    className={styles.sessionLoaderInput}
                    value={sessionEventNotes}
                    onChange={(event) => setSessionEventNotes(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </div>
              <div className={styles.timerActionRow}>
                <button
                  type="button"
                  className={styles.actionButtonPrimary}
                  onClick={() => void handleCreateSessionEvent()}
                  disabled={
                    isSessionEventLoading ||
                    isCurrentSessionClosed ||
                    !viewerParticipantSide ||
                    (sessionTimer.phase !== 'RUNNING' && sessionTimer.phase !== 'REVIEW')
                  }
                >
                  Add event
                </button>
              </div>
              <div className={styles.confirmationStatusRow}>
                <span className={currentTurnLocked ? styles.confirmedPill : styles.pendingPill}>
                  {unresolvedCurrentTurnEventCount === 0
                    ? 'All current-turn events confirmed'
                    : `${unresolvedCurrentTurnEventCount} event confirmation${unresolvedCurrentTurnEventCount === 1 ? '' : 's'} pending`}
                </span>
              </div>
              {currentTurnEvents.length === 0 ? (
                <p className={styles.statusNote}>No events logged for this turn yet.</p>
              ) : (
                <div className={styles.eventList}>
                  {currentTurnEvents.map((event) => (
                    <article key={event.id} className={styles.eventCard}>
                      <div className={styles.eventMeta}>
                        <strong>{toEventTypeLabel(event.eventType)}</strong>
                        {event.eventType === 'CASUALTY' ? (
                          <span>
                            {toSessionSideLabel(event.teamSide)} #{event.playerNumber ?? '-'} →{' '}
                            {toSessionSideLabel(event.injuredTeamSide ?? getOpposingSessionSide(event.teamSide))} #
                            {event.injuredPlayerNumber ?? '-'}
                          </span>
                        ) : (
                          <>
                            <span>{toSessionSideLabel(event.teamSide)}</span>
                            <span>{event.playerNumber ? `#${event.playerNumber}` : 'No player #'}</span>
                          </>
                        )}
                      </div>
                      {event.notes ? <p className={styles.eventNote}>{event.notes}</p> : null}
                      {event.eventType === 'CASUALTY' ? (
                        <p className={styles.eventNote}>
                          Injury result: {CASUALTY_RESOLUTION_OPTIONS.find((option) => option.value === (casualtyResolutionByEventId.get(event.id) ?? ''))?.label ?? 'Not recorded'}
                        </p>
                      ) : null}
                      <div className={styles.confirmationStatusRow}>
                        <span className={event.homeConfirmed ? styles.confirmedPill : styles.pendingPill}>
                          Blue {event.homeConfirmed ? 'confirmed' : 'pending'}
                        </span>
                        <span className={event.awayConfirmed ? styles.confirmedPill : styles.pendingPill}>
                          Red {event.awayConfirmed ? 'confirmed' : 'pending'}
                        </span>
                      </div>
                      <div className={styles.timerActionRow}>
                        {viewerParticipantSide === 'HOME' ? (
                          <button
                            type="button"
                            className={styles.actionButtonSecondary}
                            onClick={() => void handleConfirmSessionEvent(event.id, 'HOME')}
                            disabled={isSessionEventLoading || isCurrentSessionClosed || event.homeConfirmed}
                          >
                            {event.homeConfirmed ? 'Blue confirmed' : 'Confirm blue'}
                          </button>
                        ) : null}
                        {viewerParticipantSide === 'AWAY' ? (
                          <button
                            type="button"
                            className={styles.actionButtonSecondary}
                            onClick={() => void handleConfirmSessionEvent(event.id, 'AWAY')}
                            disabled={isSessionEventLoading || isCurrentSessionClosed || event.awayConfirmed}
                          >
                            {event.awayConfirmed ? 'Red confirmed' : 'Confirm red'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.actionButtonSecondary}
                          onClick={() => void handleDeleteSessionEvent(event.id)}
                          disabled={isSessionEventLoading || isCurrentSessionClosed || (event.homeConfirmed && event.awayConfirmed)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {earlierLoggedEvents.length > 0 ? (
                <div className={styles.eventList}>
                  <article className={styles.eventCard}>
                    <div className={styles.eventMeta}>
                      <strong>Earlier logged events</strong>
                      <span>{earlierLoggedEvents.length}</span>
                    </div>
                  </article>
                  {earlierLoggedEvents.map((event) => (
                    <article key={event.id} className={styles.eventCard}>
                      <div className={styles.eventMeta}>
                        <strong>
                          H{event.half} · T{event.turnNumber} · {toEventTypeLabel(event.eventType)}
                        </strong>
                        {event.eventType === 'CASUALTY' ? (
                          <span>
                            {toSessionSideLabel(event.teamSide)} #{event.playerNumber ?? '-'} →{' '}
                            {toSessionSideLabel(event.injuredTeamSide ?? getOpposingSessionSide(event.teamSide))} #
                            {event.injuredPlayerNumber ?? '-'}
                          </span>
                        ) : (
                          <>
                            <span>{toSessionSideLabel(event.teamSide)}</span>
                            <span>{event.playerNumber ? `#${event.playerNumber}` : 'No player #'}</span>
                          </>
                        )}
                      </div>
                      {event.notes ? <p className={styles.eventNote}>{event.notes}</p> : null}
                      {event.eventType === 'CASUALTY' ? (
                        <p className={styles.eventNote}>
                          Injury result: {CASUALTY_RESOLUTION_OPTIONS.find((option) => option.value === (casualtyResolutionByEventId.get(event.id) ?? ''))?.label ?? 'Not recorded'}
                        </p>
                      ) : null}
                      <div className={styles.confirmationStatusRow}>
                        <span className={event.homeConfirmed ? styles.confirmedPill : styles.pendingPill}>
                          Blue {event.homeConfirmed ? 'confirmed' : 'pending'}
                        </span>
                        <span className={event.awayConfirmed ? styles.confirmedPill : styles.pendingPill}>
                          Red {event.awayConfirmed ? 'confirmed' : 'pending'}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          {currentSessionId && sessionTimer && sessionFinalSignoff ? (
            <section className={styles.eventPanel} aria-label="Final match signoff">
              <div className={styles.timerHeader}>
                <div>
                  <p className={styles.eyebrow}>Final Signoff</p>
                  <p className={styles.resultHeadline}>
                    {isCurrentSessionClosed ? 'Match room closed' : 'Waiting for both sides to sign off'}
                  </p>
                </div>
              </div>
              <div className={styles.confirmationStatusRow}>
                <span className={homeFinalSignedOff ? styles.confirmedPill : styles.pendingPill}>
                  Blue {homeFinalSignedOff ? 'signed off' : 'pending'}
                </span>
                <span className={awayFinalSignedOff ? styles.confirmedPill : styles.pendingPill}>
                  Red {awayFinalSignedOff ? 'signed off' : 'pending'}
                </span>
              </div>
              <div className={styles.eventList}>
                <article className={styles.eventCard}>
                  <div className={styles.eventMeta}>
                    <strong>Total logged events</strong>
                    <span>{sessionFinalSignoff.totalEvents}</span>
                  </div>
                  {sessionEventTotals.length === 0 ? (
                    <p className={styles.eventNote}>No match events have been logged yet.</p>
                  ) : (
                    <div className={styles.eventMeta}>
                      {sessionEventTotals.map((entry) => (
                        <span key={entry.eventType}>
                          {toEventTypeLabel(entry.eventType)} {entry.total}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </div>
              <div className={styles.timerActionRow}>
                {viewerParticipantSide === 'HOME' ? (
                  <button
                    type="button"
                    className={styles.actionButtonPrimary}
                    onClick={() => void handleFinalSessionSignoff('HOME')}
                    disabled={isSessionEventLoading || homeFinalSignedOff || isCurrentSessionClosed}
                  >
                    {homeFinalSignedOff ? `${homeSessionTeamName} signed off` : `Sign off ${homeSessionTeamName}`}
                  </button>
                ) : null}
                {viewerParticipantSide === 'AWAY' ? (
                  <button
                    type="button"
                    className={styles.actionButtonSecondary}
                    onClick={() => void handleFinalSessionSignoff('AWAY')}
                    disabled={isSessionEventLoading || awayFinalSignedOff || isCurrentSessionClosed}
                  >
                    {awayFinalSignedOff ? `${awaySessionTeamName} signed off` : `Sign off ${awaySessionTeamName}`}
                  </button>
                ) : null}
              </div>
              {sessionFinalSignoff.closedAt ? (
                <p className={styles.statusNote}>Closed at {new Date(sessionFinalSignoff.closedAt).toLocaleString()}.</p>
              ) : (
                <p className={styles.statusNote}>
                  Final signoff should happen only after the event log is complete for the match.
                </p>
              )}
            </section>
          ) : null}
          {currentSessionId && sessionProgression ? (
            <section className={styles.eventPanel} aria-label="Match progression">
              <div className={styles.timerHeader}>
                <div>
                  <p className={styles.eyebrow}>Progression</p>
                  <p className={styles.resultHeadline}>
                    {sessionProgression.scope === 'LIVE_TEAM'
                      ? 'Live team progression'
                      : 'Tournament snapshot history'}
                  </p>
                </div>
              </div>
              {sessionProgression.reason ? <p className={styles.statusNote}>{sessionProgression.reason}</p> : null}
              <div className={styles.eventList}>
                <article className={styles.eventCard}>
                  <div className={styles.eventMeta}>
                    <strong>Blue team</strong>
                    <span>{sessionProgression.homeTeam.teamName}</span>
                    <span>{sessionProgression.homeTeam.totalAwardedSpp} SPP</span>
                  </div>
                  {sessionProgression.homeTeam.players.length === 0 ? (
                    <p className={styles.eventNote}>No applied player awards yet.</p>
                  ) : (
                    <div className={styles.eventList}>
                      {sessionProgression.homeTeam.players.map((player) => (
                        <div key={player.playerId} className={styles.eventMeta}>
                          <strong>{player.shirtNumber ?? '-'} - {player.playerName}</strong>
                          <span>{player.sppBefore} + {player.sppAwarded} = {player.sppAfter} SPP</span>
                          {player.missNextGameBefore !== player.missNextGameAfter ? (
                            <span>{player.missNextGameAfter ? 'Miss next game set' : 'Miss next game cleared'}</span>
                          ) : null}
                          {player.nigglingInjuriesBefore !== player.nigglingInjuriesAfter ? (
                            <span>
                              NI {player.nigglingInjuriesBefore} → {player.nigglingInjuriesAfter}
                            </span>
                          ) : null}
                          {player.isDeadBefore !== player.isDeadAfter ? (
                            <span>{player.isDeadAfter ? 'Marked dead' : 'No longer marked dead'}</span>
                          ) : null}
                          {formatStatAdjustmentsSummary(player.statAdjustmentsBefore) !==
                          formatStatAdjustmentsSummary(player.statAdjustmentsAfter) ? (
                            <span>
                              Stats {formatStatAdjustmentsSummary(player.statAdjustmentsBefore) || 'none'} →{' '}
                              {formatStatAdjustmentsSummary(player.statAdjustmentsAfter) || 'none'}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
                <article className={styles.eventCard}>
                  <div className={styles.eventMeta}>
                    <strong>Red team</strong>
                    <span>{sessionProgression.awayTeam.teamName}</span>
                    <span>{sessionProgression.awayTeam.totalAwardedSpp} SPP</span>
                  </div>
                  {sessionProgression.awayTeam.players.length === 0 ? (
                    <p className={styles.eventNote}>No applied player awards yet.</p>
                  ) : (
                    <div className={styles.eventList}>
                      {sessionProgression.awayTeam.players.map((player) => (
                        <div key={player.playerId} className={styles.eventMeta}>
                          <strong>{player.shirtNumber ?? '-'} - {player.playerName}</strong>
                          <span>{player.sppBefore} + {player.sppAwarded} = {player.sppAfter} SPP</span>
                          {player.missNextGameBefore !== player.missNextGameAfter ? (
                            <span>{player.missNextGameAfter ? 'Miss next game set' : 'Miss next game cleared'}</span>
                          ) : null}
                          {player.nigglingInjuriesBefore !== player.nigglingInjuriesAfter ? (
                            <span>
                              NI {player.nigglingInjuriesBefore} → {player.nigglingInjuriesAfter}
                            </span>
                          ) : null}
                          {player.isDeadBefore !== player.isDeadAfter ? (
                            <span>{player.isDeadAfter ? 'Marked dead' : 'No longer marked dead'}</span>
                          ) : null}
                          {formatStatAdjustmentsSummary(player.statAdjustmentsBefore) !==
                          formatStatAdjustmentsSummary(player.statAdjustmentsAfter) ? (
                            <span>
                              Stats {formatStatAdjustmentsSummary(player.statAdjustmentsBefore) || 'none'} →{' '}
                              {formatStatAdjustmentsSummary(player.statAdjustmentsAfter) || 'none'}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>
              {sessionProgression.unresolvedEvents.length > 0 ? (
                <div className={styles.eventList}>
                  {sessionProgression.unresolvedEvents.map((event) => (
                    <article key={event.eventId} className={styles.eventCard}>
                      <div className={styles.eventMeta}>
                        <strong>{toEventTypeLabel(event.eventType)}</strong>
                        <span>
                          {toSessionSideLabel(event.teamSide)} #{event.playerNumber ?? '-'}
                        </span>
                        {event.eventType === 'CASUALTY' ? (
                          <span>
                            Injured:{' '}
                            {toSessionSideLabel(
                              event.injuredTeamSide ?? getOpposingSessionSide(event.teamSide),
                            )}{' '}
                            #{event.injuredPlayerNumber ?? '-'}
                          </span>
                        ) : null}
                      </div>
                      <p className={styles.eventNote}>{event.reason}</p>
                    </article>
                  ))}
                </div>
              ) : null}
              {sessionProgression.applicable ? (
                <div className={styles.timerActionRow}>
                  <button
                    type="button"
                    className={styles.actionButtonPrimary}
                    onClick={() => void handleApplySessionProgression()}
                    disabled={isSessionEventLoading || !sessionProgression.canApply || progressionApplied}
                  >
                    {progressionApplied ? 'Progression applied' : 'Apply progression'}
                  </button>
                </div>
              ) : null}
              {sessionProgression.appliedAt ? (
                <p className={styles.statusNote}>
                  Progression applied at {new Date(sessionProgression.appliedAt).toLocaleString()}.
                </p>
              ) : null}
            </section>
          ) : null}
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
                      showCalculateAnnotations && isBlocker ? styles.tokenBlocker : '',
                      showCalculateAnnotations && isTarget ? styles.tokenTarget : '',
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
              ? (
                <>
                  {(editCardStates.some((card) => card.importedTeam) ? (
                    <div className={styles.teamNameStripGrid} aria-label="Loaded team names">
                      {editCardStates.map((card) => (
                        <article
                          key={`team-name-${card.teamSide}`}
                          className={`${styles.teamNameStrip} ${
                            card.teamSide === 'A' ? styles.teamNameStripTeamA : styles.teamNameStripTeamB
                          }`}
                        >
                          <p className={styles.teamNameStripLabel}>{card.teamSide === 'A' ? 'Blue Team' : 'Red Team'}</p>
                          <p className={styles.teamNameStripName}>{card.importedTeam?.name ?? 'Manual placement'}</p>
                        </article>
                      ))}
                    </div>
                  ) : null)}
                  {editCardStates.map((card) => (
                    <article
                      key={card.teamSide}
                      className={`${styles.playerCard} ${
                        card.teamSide === 'A' ? styles.playerCardTeamA : styles.playerCardTeamB
                      }`}
                    >
                      <p className={styles.playerCardControlLabel}>Source</p>
                      {!card.importedTeam && importedTeamOptions.length === 0 ? (
                        <p className={styles.playerCardNote}>
                          Use the menu and choose `Import teams` after exporting a team package from the team creator.
                        </p>
                      ) : !card.importedTeam ? (
                        <p className={styles.playerCardMeta}>Manual placement active for this side.</p>
                      ) : null}
                      {card.importedTeam ? (
                        <div className={styles.playerCardSourceBlock}>
                          <label
                            htmlFor={`edit-imported-player-${card.teamSide}`}
                            className={styles.playerCardControlLabel}
                          >
                            Next player
                          </label>
                          <select
                            id={`edit-imported-player-${card.teamSide}`}
                            className={styles.playerCardImportSelect}
                            value={card.pendingImportedPlayer?.id ?? ''}
                            onChange={(event) => setImportedPlayerSelection(card.teamSide, event.target.value)}
                            disabled={card.availableImportedPlayers.length === 0}
                          >
                            {card.availableImportedPlayers.length === 0 ? (
                              <option value="">All players placed</option>
                            ) : null}
                            {card.availableImportedPlayers.map((player) => (
                              <option key={player.id} value={player.id}>
                                {formatImportedPlayerOptionLabel(player)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      <div className={styles.playerCardHeader}>
                        <p className={styles.playerCardName}>{card.name}</p>
                        <select
                          id={`edit-strength-${card.teamSide}`}
                          className={styles.playerCardStrengthSelect}
                          value={card.strength}
                          onChange={(event) => applyEditorStrength(card.teamSide, card.selectedPlayer, Number(event.target.value))}
                          disabled={card.isPendingImportedPreview}
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
                            disabled={card.isPendingImportedPreview}
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
                          disabled={card.isPendingImportedPreview}
                          aria-pressed={!card.isStanding}
                        >
                          Prone
                        </button>
                        <button
                          type="button"
                          className={card.hasTackleZone ? styles.playerToggleActive : styles.playerToggle}
                          onClick={() => applyEditorTackleZone(card.teamSide, card.selectedPlayer, card.hasTackleZone)}
                          disabled={!card.isStanding || card.isPendingImportedPreview}
                          aria-pressed={card.hasTackleZone}
                        >
                          Tackle zone
                        </button>
                      </div>
                      {card.importedTeam ? (
                        <>
                          <p className={styles.playerCardMeta}>
                            {card.importedTeam.name} · {card.importedTeam.rosterName}
                          </p>
                          <p className={styles.playerCardNote}>
                            {card.selectedPlayer
                              ? 'Placed imported players can still be adjusted locally for testing.'
                              : card.pendingImportedPlayer
                                ? `Tap an empty square to place ${card.pendingImportedPlayer.playerName}.`
                                : 'All imported players for this side are already on the pitch.'}
                          </p>
                        </>
                      ) : (
                        <p className={styles.playerCardNote}>
                          Tap an empty square to add a manual player for this side.
                        </p>
                      )}
                    </article>
                  ))}
                </>
              )
              : (
                <>
                  {(calculateTeamNameCards.some((card) => card.importedTeam) ? (
                    <div className={styles.teamNameStripGrid} aria-label="Loaded team names">
                      {calculateTeamNameCards.map((card) => (
                        <article
                          key={`team-name-calc-${card.teamSide}`}
                          className={`${styles.teamNameStrip} ${
                            card.teamSide === 'A' ? styles.teamNameStripTeamA : styles.teamNameStripTeamB
                          }`}
                        >
                          <p className={styles.teamNameStripLabel}>{card.panelLabel}</p>
                          <p className={styles.teamNameStripName}>{card.importedTeam?.name ?? 'Manual placement'}</p>
                        </article>
                      ))}
                    </div>
                  ) : null)}
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
                      {ATTACKER_CARD_SKILL_OPTIONS.map((skill) => (
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
                      {DEFENDER_CARD_SKILL_OPTIONS.map((skill) => (
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
                onClick={() => {
                  if (!canOpenWhy) {
                    return
                  }

                  setIsWhyPanelOpen((current) => !current)
                }}
                disabled={!canOpenWhy}
                aria-expanded={isWhyPanelOpen}
                aria-controls="why-panel-inline"
              >
                {isWhyPanelOpen ? 'HIDE WHY' : 'WHY?'}
              </button>
          </div>
          <p className={styles.resultCopy}>
            Attacker ST {calculation.attackerStrength.total} vs Defender ST {calculation.defenderStrength.total}
          </p>
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
                        (() => {
                          const entryMeta = getExplanationEntryMeta(entry.tone)

                          return (
                            <li key={entry.text} className={`${entryMeta.className} ${styles.assistEntry}`}>
                              <span className={styles.assistEntryIcon} aria-hidden="true">
                                {entryMeta.icon}
                              </span>
                              <span className={styles.assistEntryText}>
                                <span className={styles.srOnly}>{entryMeta.iconLabel}: </span>
                                {entry.text}
                              </span>
                            </li>
                          )
                        })()
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {isHelpOpen ? (
        <div
          className={styles.bottomSheetBackdrop}
          role="presentation"
          onClick={() => setIsHelpOpen(false)}
        >
          <section
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.bottomSheetHeader}>
              <div>
                <p className={styles.eyebrow}>{helpTopic === 'INSTALL' ? 'Install' : 'Help'}</p>
                <p id="help-sheet-title" className={styles.resultHeadline}>
                  {helpTopic === 'INSTALL' ? 'Install On Your Phone' : 'Block Dice Guide'}
                </p>
              </div>
              <button
                type="button"
                className={styles.teamToggle}
                onClick={() => setIsHelpOpen(false)}
              >
                CLOSE
              </button>
            </div>

            <div className={styles.explanationStack}>
              <div className={styles.explanationCard}>
                <p className={styles.resultHeadline}>Install</p>
                <ul className={styles.summaryList}>
                  <li>On iPhone or iPad in Safari, open the Share menu and choose `Add to Home Screen`.</li>
                  <li>On Android in Chrome, use the browser menu and choose `Install app` or `Add to Home screen`.</li>
                  <li>If the browser offers an install banner, accept it. If not, use the browser menu manually.</li>
                  <li>Once installed, the toolkit opens like a normal app and keeps working offline after the first load.</li>
                </ul>
              </div>

              <div className={styles.explanationCard}>
                <p className={styles.resultHeadline}>Edit Mode</p>
                <ul className={styles.summaryList}>
                  <li>Tap an empty square to place a player for the active side.</li>
                  <li>Tap a placed player to edit them in the matching blue or red card below the grid.</li>
                  <li>Long press a placed player to remove them from the pitch.</li>
                </ul>
              </div>

              <div className={styles.explanationCard}>
                <p className={styles.resultHeadline}>Calculate Mode</p>
                <ul className={styles.summaryList}>
                  <li>Select an attacker from the active side, then select a defender.</li>
                  <li>Adjacent defenders show direct dice previews automatically.</li>
                  <li>The lower player cards let you adjust attacker and defender skills during testing.</li>
                </ul>
              </div>

              <div className={styles.explanationCard}>
                <p className={styles.resultHeadline}>Blitz Preview</p>
                <ul className={styles.summaryList}>
                  <li>Long press the active attacker in calculate mode to enter blitz preview.</li>
                  <li>The active blitzing attacker is marked as `*A*` on the grid.</li>
                  <li>Potential dice are shown without checking movement legality.</li>
                  <li>If the attacker is already adjacent, the current square blitz dice show on that attacker token.</li>
                  <li>Long press the same active attacker again to leave blitz preview.</li>
                  <li>Use the `WHY?` button for the current blitz calculation instead of long pressing candidate squares.</li>
                </ul>
              </div>

              <div className={styles.explanationCard}>
                <p className={styles.resultHeadline}>Why?</p>
                <ul className={styles.summaryList}>
                  <li>Use `WHY?` to inspect offensive assists and defensive assists for the current matchup.</li>
                  <li>`✓` means the assist is applied, `▲` means it is marked or fails, and `⊘` means it is not relevant.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {teamLoaderTarget ? (
        <div
          className={styles.bottomSheetBackdrop}
          role="presentation"
          onClick={() => setTeamLoaderTarget(null)}
        >
          <section
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-loader-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.bottomSheetHeader}>
              <div>
                <p className={styles.eyebrow}>Load Team</p>
                <p id="team-loader-title" className={styles.resultHeadline}>
                  {teamLoaderTarget === 'A' ? 'Blue Team Source' : 'Red Team Source'}
                </p>
              </div>
              <button
                type="button"
                className={styles.teamToggle}
                onClick={() => setTeamLoaderTarget(null)}
              >
                CLOSE
              </button>
            </div>

            <div className={styles.teamLoaderList}>
              <button
                type="button"
                className={styles.teamLoaderButton}
                onClick={() => applyTeamLoaderSelection(teamLoaderTarget, null)}
              >
                Manual placement
              </button>
              {importedTeamOptions.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  className={styles.teamLoaderButton}
                  onClick={() => applyTeamLoaderSelection(teamLoaderTarget, team.id)}
                >
                  {team.name} · {team.rosterName}
                </button>
              ))}
              {importedTeamOptions.length === 0 ? (
                <p className={styles.statusNote}>
                  {isSharedImportedTeamsLoading
                    ? 'Loading shared team library...'
                    : 'No imported team library found yet. Use `Import teams` from the menu first.'}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {isSessionLoaderOpen ? (
        <div
          className={styles.bottomSheetBackdrop}
          role="presentation"
          onClick={() => setIsSessionLoaderOpen(false)}
        >
          <section
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-loader-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.bottomSheetHeader}>
              <div>
                <p className={styles.eyebrow}>Shared Session</p>
                <p id="session-loader-title" className={styles.resultHeadline}>
                  Load Match Session
                </p>
              </div>
              <button
                type="button"
                className={styles.teamToggle}
                onClick={() => setIsSessionLoaderOpen(false)}
              >
                CLOSE
              </button>
            </div>

            <div className={styles.teamLoaderList}>
              <label className={styles.sessionLoaderField}>
                <span className={styles.playerCardControlLabel}>Session code</span>
                <input
                  className={styles.sessionLoaderInput}
                  value={sessionCodeInput}
                  onChange={(event) => setSessionCodeInput(event.target.value.toUpperCase())}
                  placeholder="Enter session code"
                />
              </label>
              <button
                type="button"
                className={styles.teamLoaderButton}
                onClick={() => void handleLoadSessionByCode()}
                disabled={isSessionLoading || !sessionCodeInput.trim()}
              >
                {isSessionLoading ? 'Loading session...' : 'Load session'}
              </button>
              <p className={styles.statusNote}>
                This loads the home team to blue and the away team to red through the shared API.
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {isCreateSessionOpen ? (
        <div
          className={styles.bottomSheetBackdrop}
          role="presentation"
          onClick={() => setIsCreateSessionOpen(false)}
        >
          <section
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.bottomSheetHeader}>
              <div>
                <p className={styles.eyebrow}>Shared Session</p>
                <p id="session-create-title" className={styles.resultHeadline}>
                  Create Match Session
                </p>
              </div>
              <button
                type="button"
                className={styles.teamToggle}
                onClick={() => setIsCreateSessionOpen(false)}
              >
                CLOSE
              </button>
            </div>

            <div className={styles.teamLoaderList}>
              <label className={styles.sessionLoaderField}>
                <span className={styles.playerCardControlLabel}>Blue team</span>
                <select
                  className={styles.sessionLoaderInput}
                  value={createSessionHomeTeamId}
                  onChange={(event) => setCreateSessionHomeTeamId(event.target.value)}
                  disabled={isSharedTeamsLoading || sharedTeams.length === 0}
                >
                  {sharedTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.sessionLoaderField}>
                <span className={styles.playerCardControlLabel}>Red team</span>
                <select
                  className={styles.sessionLoaderInput}
                  value={createSessionAwayTeamId}
                  onChange={(event) => setCreateSessionAwayTeamId(event.target.value)}
                  disabled={isSharedTeamsLoading || sharedTeams.length === 0}
                >
                  {sharedTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.teamLoaderButton}
                onClick={() => void handleCreateSession()}
                disabled={
                  isCreatingSession ||
                  isSharedTeamsLoading ||
                  !createSessionHomeTeamId ||
                  !createSessionAwayTeamId
                }
              >
                {isCreatingSession ? 'Creating session...' : 'Create and load session'}
              </button>
              <p className={styles.statusNote}>
                {isSharedTeamsLoading
                  ? 'Loading shared API teams...'
                  : sharedTeams.length === 0
                    ? 'No shared API teams found yet.'
                    : 'This creates a session code and loads blue/red directly into block dice.'}
              </p>
            </div>
          </section>
        </div>
      ) : null}

    </div>
  )
}
