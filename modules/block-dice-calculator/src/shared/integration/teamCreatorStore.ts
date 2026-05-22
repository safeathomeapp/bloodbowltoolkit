import {
  TEAM_CREATOR_EXCHANGE_FORMAT,
  TEAM_CREATOR_EXCHANGE_STORAGE_KEY,
  TEAM_CREATOR_EXCHANGE_VERSION,
  TEAM_CREATOR_STORAGE_KEY,
  type TeamCreatorExchangePackage,
  type TeamCreatorSavedPlayerRecord,
  type TeamCreatorSavedTeamRecord,
} from './teamImport'

function normalizeSavedPlayer(player: TeamCreatorSavedPlayerRecord): TeamCreatorSavedPlayerRecord {
  return {
    ...player,
    shirtNumber: player.shirtNumber ?? null,
    playerStatus:
      player.playerStatus === 'SOLD' ||
      player.playerStatus === 'DEAD' ||
      player.playerStatus === 'RETIRED'
        ? player.playerStatus
        : player.isDead
          ? 'DEAD'
          : 'ACTIVE',
    spp: player.spp ?? 0,
    nigglingInjuries: player.nigglingInjuries ?? 0,
    isDead: player.isDead ?? false,
    extraSkills: player.extraSkills ?? [],
    statAdjustments: player.statAdjustments ?? {},
  }
}

function normalizeSavedTeam(team: TeamCreatorSavedTeamRecord): TeamCreatorSavedTeamRecord {
  return {
    ...team,
    players: Array.isArray(team.players) ? team.players.map(normalizeSavedPlayer) : [],
  }
}

function normalizeSavedTeamCollection(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeSavedTeam) : []
}

export function readSavedTeamsFromTeamCreator(storage: Storage): TeamCreatorSavedTeamRecord[] {
  const rawValue = storage.getItem(TEAM_CREATOR_STORAGE_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue) as TeamCreatorSavedTeamRecord[]
    return normalizeSavedTeamCollection(parsedValue)
  } catch {
    return []
  }
}

export function buildTeamCreatorExchangePackage(teams: TeamCreatorSavedTeamRecord[]): TeamCreatorExchangePackage {
  return {
    format: TEAM_CREATOR_EXCHANGE_FORMAT,
    version: TEAM_CREATOR_EXCHANGE_VERSION,
    exportedAt: new Date().toISOString(),
    teams: normalizeSavedTeamCollection(teams),
  }
}

export function parseTeamCreatorExchangePackage(rawValue: string) {
  try {
    const parsedValue = JSON.parse(rawValue) as Partial<TeamCreatorExchangePackage>

    if (
      parsedValue.format !== TEAM_CREATOR_EXCHANGE_FORMAT ||
      parsedValue.version !== TEAM_CREATOR_EXCHANGE_VERSION
    ) {
      return null
    }

    return {
      format: TEAM_CREATOR_EXCHANGE_FORMAT,
      version: TEAM_CREATOR_EXCHANGE_VERSION,
      exportedAt: typeof parsedValue.exportedAt === 'string' ? parsedValue.exportedAt : '',
      teams: normalizeSavedTeamCollection(parsedValue.teams),
    } satisfies TeamCreatorExchangePackage
  } catch {
    return null
  }
}

export function readImportedTeamsFromExchangeStorage(storage: Storage) {
  const rawValue = storage.getItem(TEAM_CREATOR_EXCHANGE_STORAGE_KEY)

  if (!rawValue) {
    return [] as TeamCreatorSavedTeamRecord[]
  }

  return parseTeamCreatorExchangePackage(rawValue)?.teams ?? []
}

export function storeImportedTeamsExchange(storage: Storage, exchangePackage: TeamCreatorExchangePackage) {
  storage.setItem(TEAM_CREATOR_EXCHANGE_STORAGE_KEY, JSON.stringify(exchangePackage))
}

export function readAvailableTeamsForBlockDice(storage: Storage) {
  const mergedTeams = [
    ...readImportedTeamsFromExchangeStorage(storage),
    ...readSavedTeamsFromTeamCreator(storage),
  ]

  const dedupedTeams = new Map<string, TeamCreatorSavedTeamRecord>()

  for (const team of mergedTeams) {
    dedupedTeams.set(team.id, team)
  }

  return [...dedupedTeams.values()]
}

export function readSavedTeamsFromWindow() {
  if (typeof window === 'undefined') {
    return [] as TeamCreatorSavedTeamRecord[]
  }

  return readSavedTeamsFromTeamCreator(window.localStorage)
}

export function readAvailableTeamsFromWindow() {
  if (typeof window === 'undefined') {
    return [] as TeamCreatorSavedTeamRecord[]
  }

  return readAvailableTeamsForBlockDice(window.localStorage)
}
