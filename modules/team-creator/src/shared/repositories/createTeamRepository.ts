import { BrowserLocalStorageStore, MemoryKeyValueStore } from '../storage/keyValueStore'
import type { TeamRepository } from './teamRepository'
import { ApiTeamRepository } from './apiTeamRepository'
import { LocalTeamRepository } from './localTeamRepository'

type RepositoryMode = 'local' | 'api' | 'auto'

function resolveRepositoryMode() {
  const rawMode = import.meta.env.VITE_TEAM_REPOSITORY_MODE?.trim().toLowerCase() as
    | RepositoryMode
    | undefined

  if (rawMode === 'local' || rawMode === 'api' || rawMode === 'auto') {
    return rawMode
  }

  return 'auto' as const
}

export function createTeamRepository(): TeamRepository {
  return resolveTeamRepositorySelection().repository
}

export function resolveTeamRepositorySelection(): {
  repository: TeamRepository
  label: string
  mode: 'local' | 'api'
} {
  if (typeof window === 'undefined') {
    return {
      repository: new LocalTeamRepository(new MemoryKeyValueStore()),
      label: 'Local browser storage',
      mode: 'local',
    }
  }

  const store = new BrowserLocalStorageStore(window.localStorage)
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  const repositoryMode = resolveRepositoryMode()
  const shouldUseApi =
    repositoryMode === 'api' || (repositoryMode === 'auto' && Boolean(baseUrl))

  if (shouldUseApi && baseUrl) {
    return {
      repository: new ApiTeamRepository({
        baseUrl,
        store,
      }),
      label: `Shared API (${baseUrl})`,
      mode: 'api',
    }
  }

  return {
    repository: new LocalTeamRepository(store),
    label: 'Local browser storage',
    mode: 'local',
  }
}
