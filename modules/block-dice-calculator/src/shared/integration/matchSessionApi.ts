import type { TeamCreatorSavedTeamRecord } from './teamImport'

export interface MatchSessionTeamSummary {
  id: string
  name: string
  ownerUserId: string
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
