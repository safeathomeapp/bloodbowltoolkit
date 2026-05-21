import type { TeamCreatorSavedTeamRecord } from './teamImport'

export interface MatchSessionTeamSummary {
  id: string
  name: string
  ownerUserId: string
}

export interface SharedTeamSummary {
  id: string
  rosterTemplateId: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  playerCount: number
  totalValue: number
  updatedAt: string
}

export interface SharedTeamRecord extends TeamCreatorSavedTeamRecord {
  ownerUserId: string
  leagueId: string | null
  draftBudget: number
  rerollCount: number
  assistantCoachCount: number
  cheerleaderCount: number
  dedicatedFans: number
  apothecaryPurchased: boolean
  createdAt: string
  updatedAt: string
}

export interface MatchSessionParticipantSummary {
  id: string
  userId: string
  teamId: string
  side: 'HOME' | 'AWAY'
  user: {
    id: string
    displayName: string
  }
}

export interface MatchSessionSummary {
  id: string
  leagueId: string | null
  homeTeamId: string
  awayTeamId: string
  sessionCode: string
  status: 'PENDING' | 'ACTIVE' | 'CLOSED'
  createdByUserId: string
  createdAt: string
  updatedAt: string
  participants: MatchSessionParticipantSummary[]
  homeTeam?: MatchSessionTeamSummary
  awayTeam?: MatchSessionTeamSummary
}

export interface BlockDiceSessionContextResponse {
  matchSession: MatchSessionSummary
  teams: {
    home: TeamCreatorSavedTeamRecord
    away: TeamCreatorSavedTeamRecord
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

function buildApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  return (configuredBaseUrl || 'http://127.0.0.1:3001').replace(/\/+$/u, '')
}

export async function fetchBlockDiceSessionContextByCode(sessionCode: string) {
  const baseUrl = buildApiBaseUrl()
  const normalizedCode = sessionCode.trim().toUpperCase()

  if (!normalizedCode) {
    throw new Error('Enter a match session code first.')
  }

  const sessionLookup = await parseResponse<{ matchSession: MatchSessionSummary }>(
    await fetch(`${baseUrl}/match-sessions/code/${encodeURIComponent(normalizedCode)}`),
  )

  return parseResponse<BlockDiceSessionContextResponse>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(sessionLookup.matchSession.id)}/block-dice-context`,
    ),
  )
}

export async function fetchSharedTeams() {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ teams: SharedTeamSummary[] }>(
    await fetch(`${baseUrl}/teams`),
  )

  return payload.teams
}

export async function fetchSharedTeam(teamId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ team: SharedTeamRecord }>(
    await fetch(`${baseUrl}/teams/${encodeURIComponent(teamId)}`),
  )

  return payload.team
}

export async function createBlockDiceSessionContext(homeTeamId: string, awayTeamId: string) {
  const baseUrl = buildApiBaseUrl()

  if (!homeTeamId || !awayTeamId) {
    throw new Error('Choose both teams before creating a session.')
  }

  if (homeTeamId === awayTeamId) {
    throw new Error('Choose two different teams.')
  }

  const homeTeam = await fetchSharedTeam(homeTeamId)
  const sessionPayload = {
    homeTeamId,
    awayTeamId,
    createdByUserId: homeTeam.ownerUserId,
  }

  const createdSession = await parseResponse<{ matchSession: MatchSessionSummary }>(
    await fetch(`${baseUrl}/match-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionPayload),
    }),
  )

  const context = await parseResponse<BlockDiceSessionContextResponse>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(createdSession.matchSession.id)}/block-dice-context`,
    ),
  )

  return context
}
