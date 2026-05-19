import { rosterTemplates } from '../../data/rosterTemplates'
import type { KeyValueStore } from '../storage/keyValueStore'
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../types/team'
import type { TeamRepository } from './teamRepository'

const API_USER_ID_KEY = 'blood-bowl-toolkit:team-creator:api-user-id'
const DEFAULT_DISPLAY_NAME = 'Local Coach'

type FetchLike = typeof fetch

type TeamApiPayload = SavedTeam & {
  ownerUserId: string
  leagueId: string | null
}

function normalizeTeam(team: SavedTeam): SavedTeam {
  return {
    ...team,
    draftBudget: team.draftBudget ?? 1_000_000,
    rerollCount: team.rerollCount ?? 0,
    assistantCoachCount: team.assistantCoachCount ?? 0,
    cheerleaderCount: team.cheerleaderCount ?? 0,
    dedicatedFans: team.dedicatedFans ?? 1,
    apothecaryPurchased: team.apothecaryPurchased ?? false,
    players: team.players.map((player) => ({
      ...player,
      shirtNumber: player.shirtNumber ?? null,
      spp: player.spp ?? 0,
      nigglingInjuries: player.nigglingInjuries ?? 0,
      extraSkills: player.extraSkills ?? [],
      statAdjustments: player.statAdjustments ?? {},
    })),
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T
  }

  let message = `Request failed with status ${response.status}.`

  try {
    const payload = (await response.json()) as { message?: string }

    if (payload.message) {
      message = payload.message
    }
  } catch {
    // Keep the fallback message when the error body is empty or invalid.
  }

  throw new Error(message)
}

function toSavedTeam(team: TeamApiPayload): SavedTeam {
  return normalizeTeam({
    id: team.id,
    rosterTemplateId: team.rosterTemplateId,
    name: team.name,
    status: team.status,
    draftBudget: team.draftBudget,
    rerollCount: team.rerollCount,
    assistantCoachCount: team.assistantCoachCount,
    cheerleaderCount: team.cheerleaderCount,
    dedicatedFans: team.dedicatedFans,
    apothecaryPurchased: team.apothecaryPurchased,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    players: team.players,
  })
}

export class ApiTeamRepository implements TeamRepository {
  private readonly baseUrl: string
  private readonly store: KeyValueStore
  private readonly fetchImpl: FetchLike
  private userIdPromise: Promise<string> | null = null

  constructor(options: {
    baseUrl: string
    store: KeyValueStore
    fetchImpl?: FetchLike
  }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '')
    this.store = options.store
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  async listTeams() {
    const ownerUserId = await this.ensureUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/teams?ownerUserId=${encodeURIComponent(ownerUserId)}`,
    )
    const payload = await parseResponse<{ teams: SavedTeamSummary[] }>(response)

    return payload.teams
  }

  async getTeam(id: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/teams/${encodeURIComponent(id)}`)

    if (response.status === 404) {
      return null
    }

    const payload = await parseResponse<{ team: TeamApiPayload }>(response)
    return toSavedTeam(payload.team)
  }

  async saveTeam(team: SavedTeam) {
    const ownerUserId = await this.ensureUserId()
    const payload = JSON.stringify({
      ...normalizeTeam(team),
      ownerUserId,
      leagueId: null,
    })

    const updateResponse = await this.fetchImpl(
      `${this.baseUrl}/teams/${encodeURIComponent(team.id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      },
    )

    if (updateResponse.ok) {
      return
    }

    if (updateResponse.status !== 404) {
      await parseResponse(updateResponse)
      return
    }

    const createResponse = await this.fetchImpl(`${this.baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    })

    await parseResponse(createResponse)
  }

  async deleteTeam(id: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/teams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })

    if (response.status === 404 || response.status === 204) {
      return
    }

    await parseResponse(response)
  }

  async listRosterTemplates(): Promise<RosterTemplate[]> {
    return structuredClone(rosterTemplates)
  }

  private async ensureUserId() {
    if (!this.userIdPromise) {
      this.userIdPromise = this.createOrLoadUserId()
    }

    return this.userIdPromise
  }

  private async createOrLoadUserId() {
    const existingUserId = this.store.getItem(API_USER_ID_KEY)

    if (existingUserId) {
      return existingUserId
    }

    const response = await this.fetchImpl(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: DEFAULT_DISPLAY_NAME,
      }),
    })
    const payload = await parseResponse<{ user: { id: string } }>(response)

    this.store.setItem(API_USER_ID_KEY, payload.user.id)

    return payload.user.id
  }
}
