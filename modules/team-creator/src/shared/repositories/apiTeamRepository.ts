import { rosterTemplates } from '../../data/rosterTemplates'
import { AuthClient } from '../api/authClient'
import type { KeyValueStore } from '../storage/keyValueStore'
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../types/team'
import { normalizeTeamShirtNumbers } from '../utils/shirtNumbers'
import type { TeamRepository } from './teamRepository'

type FetchLike = typeof fetch

type TeamApiPayload = SavedTeam & {
  ownerUserId: string
  leagueId: string | null
}

function normalizeTeam(team: SavedTeam): SavedTeam {
  const normalizePlayerStatus = (
    player: SavedTeam['players'][number],
  ): SavedTeam['players'][number]['playerStatus'] =>
    player.playerStatus === 'SOLD' ||
    player.playerStatus === 'DEAD' ||
    player.playerStatus === 'RETIRED'
      ? player.playerStatus
      : player.isDead
        ? 'DEAD'
        : 'ACTIVE'

  const normalizedTeam = {
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
      playerStatus: normalizePlayerStatus(player),
      spp: player.spp ?? 0,
      nigglingInjuries: player.nigglingInjuries ?? 0,
      missNextGame: player.missNextGame ?? false,
      isDead: player.isDead ?? false,
      extraSkills: player.extraSkills ?? [],
      statAdjustments: player.statAdjustments ?? {},
    })),
  }

  return normalizeTeamShirtNumbers(normalizedTeam).team
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
    baseTeamId: team.baseTeamId ?? null,
    competitionEntryId: team.competitionEntryId ?? null,
    isCompetitionCopy: team.isCompetitionCopy ?? false,
    competitionLocked: team.competitionLocked ?? false,
    competitionLockedAt: team.competitionLockedAt ?? null,
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
  private readonly fetchImpl: FetchLike
  private readonly authClient: AuthClient

  constructor(options: {
    baseUrl: string
    store: KeyValueStore
    authClient?: AuthClient
    fetchImpl?: FetchLike
  }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '')
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
    this.authClient =
      options.authClient ??
      new AuthClient({
        baseUrl: this.baseUrl,
        store: options.store,
        fetchImpl: this.fetchImpl,
      })
  }

  async listTeams() {
    const ownerUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/teams?ownerUserId=${encodeURIComponent(ownerUserId)}`,
      {
        headers: this.authClient.createAuthHeaders(),
      },
    )
    const payload = await parseResponse<{ teams: SavedTeamSummary[] }>(response)

    return payload.teams
  }

  async listCompetitionTeams() {
    const ownerUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/teams?ownerUserId=${encodeURIComponent(ownerUserId)}&teamScope=competition`,
      {
        headers: this.authClient.createAuthHeaders(),
      },
    )
    const payload = await parseResponse<{ teams: SavedTeamSummary[] }>(response)

    return payload.teams
  }

  async getTeam(id: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/teams/${encodeURIComponent(id)}`, {
      headers: this.authClient.createAuthHeaders(),
    })

    if (response.status === 404) {
      return null
    }

    const payload = await parseResponse<{ team: TeamApiPayload }>(response)
    return toSavedTeam(payload.team)
  }

  async saveTeam(team: SavedTeam) {
    const ownerUserId = await this.getCurrentUserId()
    const payload = JSON.stringify({
      ...normalizeTeam(team),
      ownerUserId,
      leagueId: null,
    })

    const updateResponse = await this.fetchImpl(
      `${this.baseUrl}/teams/${encodeURIComponent(team.id)}`,
      {
        method: 'PUT',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
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
      headers: this.authClient.createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: payload,
    })

    await parseResponse(createResponse)
  }

  async deleteTeam(id: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/teams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.authClient.createAuthHeaders(),
    })

    if (response.status === 404 || response.status === 204) {
      return
    }

    await parseResponse(response)
  }

  async listRosterTemplates(): Promise<RosterTemplate[]> {
    return structuredClone(rosterTemplates)
  }

  private async getCurrentUserId() {
    const user = await this.authClient.getCurrentUser()
    return user.id
  }
}
