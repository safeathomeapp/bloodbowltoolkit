import type { TeamCreatorSavedTeamRecord } from './teamImport'

const AUTH_SESSION_TOKEN_KEY = 'blood-bowl-toolkit:auth:session-token'

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

export interface MatchSessionViewerSummary {
  userId: string | null
  assignedSide: 'HOME' | 'AWAY' | null
  participantSide: 'HOME' | 'AWAY' | null
}

export interface MatchSessionSummary {
  id: string
  leagueId: string | null
  fixtureId?: string | null
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

export interface MatchSessionTimerState {
  enabled: boolean
  turnSeconds: number
  bankSeconds: number
  bankResetsAtHalf: boolean
  currentHalf: number
  currentTurnNumber: number
  activeSide: 'HOME' | 'AWAY'
  phase: 'READY' | 'RUNNING' | 'PAUSE_REQUESTED' | 'PAUSED' | 'REVIEW'
  turnStartedAt: string | null
  serverNow: string
  perTurnRemainingSeconds: number
  homeBankRemainingSeconds: number
  awayBankRemainingSeconds: number
  isRunning: boolean
}

export interface MatchSessionEventSummary {
  id: string
  half: number
  turnNumber: number
  actingSide: 'HOME' | 'AWAY'
  teamSide: 'HOME' | 'AWAY'
  eventType: 'TOUCHDOWN' | 'CASUALTY' | 'COMPLETION' | 'INTERCEPTION' | 'MVP_ASSIGNMENT'
  playerNumber: number | null
  injuredTeamSide: 'HOME' | 'AWAY' | null
  injuredPlayerNumber: number | null
  notes: string | null
  homeConfirmedAt: string | null
  awayConfirmedAt: string | null
  homeConfirmed: boolean
  awayConfirmed: boolean
  createdAt: string
}

export interface MatchSessionFinalSignoff {
  status: 'PENDING' | 'ACTIVE' | 'CLOSED'
  homeFinalSignoffAt: string | null
  awayFinalSignoffAt: string | null
  homeSignedOff: boolean
  awaySignedOff: boolean
  closedAt: string | null
  eventTotals: Record<MatchSessionEventSummary['eventType'], number>
  totalEvents: number
}

export interface MatchSessionProgressionPlayerSummary {
  playerId: string
  playerName: string
  shirtNumber: number | null
  sppBefore: number
  sppAwarded: number
  sppAfter: number
  missNextGameBefore: boolean
  missNextGameAfter: boolean
  nigglingInjuriesBefore: number
  nigglingInjuriesAfter: number
  isDeadBefore: boolean
  isDeadAfter: boolean
  statAdjustmentsBefore: {
    movement?: number
    strength?: number
    agility?: number
    passing?: number
    armour?: number
  }
  statAdjustmentsAfter: {
    movement?: number
    strength?: number
    agility?: number
    passing?: number
    armour?: number
  }
  eventTotals: Record<MatchSessionEventSummary['eventType'], number>
}

export interface MatchSessionProgressionTeamSummary {
  teamId: string
  teamName: string
  totalAwardedSpp: number
  players: MatchSessionProgressionPlayerSummary[]
}

export interface MatchSessionProgressionSummary {
  applicable: boolean
  scope: 'LIVE_TEAM' | 'TOURNAMENT_SNAPSHOT'
  status: 'NOT_APPLICABLE' | 'READY' | 'APPLIED'
  appliedAt: string | null
  canApply: boolean
  reason: string | null
  homeTeam: MatchSessionProgressionTeamSummary
  awayTeam: MatchSessionProgressionTeamSummary
  casualtyResolutions: Array<{
    matchSessionEventId: string
    resolutionType: MatchSessionCasualtyResolutionValue
  }>
  unresolvedEvents: Array<{
    eventId: string
    eventType: MatchSessionEventSummary['eventType']
    teamSide: 'HOME' | 'AWAY'
    playerNumber: number | null
    injuredTeamSide: 'HOME' | 'AWAY' | null
    injuredPlayerNumber: number | null
    reason: string
  }>
}

export type MatchSessionCasualtyResolutionValue =
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

export interface BlockDiceSessionContextResponse {
  matchSession: MatchSessionSummary
  viewer: MatchSessionViewerSummary
  teams: {
    home: TeamCreatorSavedTeamRecord
    away: TeamCreatorSavedTeamRecord
  }
}

export interface MatchSessionEventsResponse {
  currentTurn: {
    half: number
    turnNumber: number
    side: 'HOME' | 'AWAY'
    phase: 'READY' | 'RUNNING' | 'PAUSE_REQUESTED' | 'PAUSED' | 'REVIEW'
  }
  events: MatchSessionEventSummary[]
  signoff: MatchSessionFinalSignoff
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

function getStoredSessionToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(AUTH_SESSION_TOKEN_KEY)
}

function createAuthHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers)
  const sessionToken = getStoredSessionToken()

  if (sessionToken) {
    nextHeaders.set('Authorization', `Bearer ${sessionToken}`)
  }

  return nextHeaders
}

export function bootstrapMatchSessionAuthFromUrl() {
  if (typeof window === 'undefined') {
    return {
      sessionCode: null as string | null,
    }
  }

  const url = new URL(window.location.href)
  const sessionCode = url.searchParams.get('sessionCode')?.trim().toUpperCase() ?? null
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const authToken = hashParams.get('authToken')?.trim() ?? null

  if (authToken) {
    window.localStorage.setItem(AUTH_SESSION_TOKEN_KEY, authToken)
    hashParams.delete('authToken')
    const nextHash = hashParams.toString()
    window.history.replaceState(
      {},
      document.title,
      `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ''}`,
    )
  }

  return {
    sessionCode,
  }
}

export async function fetchBlockDiceSessionContextByCode(sessionCode: string) {
  const baseUrl = buildApiBaseUrl()
  const normalizedCode = sessionCode.trim().toUpperCase()

  if (!normalizedCode) {
    throw new Error('Enter a match session code first.')
  }

  const sessionLookup = await parseResponse<{ matchSession: MatchSessionSummary }>(
    await fetch(`${baseUrl}/match-sessions/code/${encodeURIComponent(normalizedCode)}`, {
      headers: createAuthHeaders(),
    }),
  )

  return parseResponse<BlockDiceSessionContextResponse>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(sessionLookup.matchSession.id)}/block-dice-context`,
      {
        headers: createAuthHeaders(),
      },
    ),
  )
}

export async function fetchBlockDiceSessionContext(sessionId: string) {
  const baseUrl = buildApiBaseUrl()

  if (!sessionId.trim()) {
    throw new Error('Enter a match session id first.')
  }

  return parseResponse<BlockDiceSessionContextResponse>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/block-dice-context`, {
      headers: createAuthHeaders(),
    }),
  )
}

export async function fetchSharedTeams() {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ teams: SharedTeamSummary[] }>(
    await fetch(`${baseUrl}/teams`, {
      headers: createAuthHeaders(),
    }),
  )

  return payload.teams
}

export async function fetchSharedTeam(teamId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ team: SharedTeamRecord }>(
    await fetch(`${baseUrl}/teams/${encodeURIComponent(teamId)}`, {
      headers: createAuthHeaders(),
    }),
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
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(sessionPayload),
    }),
  )

  const context = await parseResponse<BlockDiceSessionContextResponse>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(createdSession.matchSession.id)}/block-dice-context`,
      {
        headers: createAuthHeaders(),
      },
    ),
  )

  return context
}

export async function fetchMatchSessionTimer(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ timer: MatchSessionTimerState }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/timer`, {
      headers: createAuthHeaders(),
    }),
  )

  return payload.timer
}

export async function startMatchSessionTimer(sessionId: string, side?: 'HOME' | 'AWAY') {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ timer: MatchSessionTimerState }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/timer/start`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(side ? { side } : {}),
    }),
  )

  return payload.timer
}

export async function requestMatchSessionPause(sessionId: string, requestedSide: 'HOME' | 'AWAY') {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ timer: MatchSessionTimerState }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/timer/pause-request`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ requestedSide }),
    }),
  )

  return payload.timer
}

export async function confirmMatchSessionPause(sessionId: string, confirmedSide: 'HOME' | 'AWAY') {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ timer: MatchSessionTimerState }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/timer/confirm-pause`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ confirmedSide }),
    }),
  )

  return payload.timer
}

export async function endMatchSessionTurn(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ timer: MatchSessionTimerState }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/timer/end-turn`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({}),
    }),
  )

  return payload.timer
}

export async function resetMatchSessionHalf(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ timer: MatchSessionTimerState }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/timer/reset-half`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({}),
    }),
  )

  return payload.timer
}

export async function fetchMatchSessionEvents(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  return parseResponse<MatchSessionEventsResponse>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/events`, {
      headers: createAuthHeaders(),
    }),
  )
}

export async function createMatchSessionEvent(
  sessionId: string,
  input: {
    eventType: MatchSessionEventSummary['eventType']
    teamSide: MatchSessionEventSummary['teamSide']
    playerNumber?: number | null
    injuredTeamSide?: MatchSessionEventSummary['teamSide'] | null
    injuredPlayerNumber?: number | null
    casualtyResolutionType?:
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
      | null
    notes?: string | null
  },
) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ event: MatchSessionEventSummary }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/events`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(input),
    }),
  )

  return payload.event
}

export async function deleteMatchSessionEvent(sessionId: string, eventId: string) {
  const baseUrl = buildApiBaseUrl()
  const response = await fetch(
    `${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: createAuthHeaders(),
    },
  )

  if (!response.ok && response.status !== 204) {
    await parseResponse(response)
  }
}

export async function confirmMatchSessionEvent(
  sessionId: string,
  eventId: string,
  confirmedSide: 'HOME' | 'AWAY',
) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ event: MatchSessionEventSummary }>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/events/${encodeURIComponent(eventId)}/confirm`,
      {
        method: 'POST',
        headers: createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          confirmedSide,
        }),
      },
    ),
  )

  return payload.event
}

export async function signOffMatchSession(
  sessionId: string,
  signedOffSide: 'HOME' | 'AWAY',
) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ signoff: MatchSessionFinalSignoff }>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/final-signoff`,
      {
        method: 'POST',
        headers: createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          signedOffSide,
        }),
      },
    ),
  )

  return payload.signoff
}

export async function fetchMatchSessionProgression(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ progression: MatchSessionProgressionSummary }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/progression`, {
      headers: createAuthHeaders(),
    }),
  )

  return payload.progression
}

export async function applyMatchSessionProgression(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ progression: MatchSessionProgressionSummary }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/progression/apply`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({}),
    }),
  )

  return payload.progression
}

export async function updateMatchSessionCasualtyResolution(
  sessionId: string,
  eventId: string,
  resolutionType: MatchSessionCasualtyResolutionValue,
) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{ progression: MatchSessionProgressionSummary }>(
    await fetch(
      `${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/casualty-resolution/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          resolutionType,
        }),
      },
    ),
  )

  return payload.progression
}

export async function claimMatchSessionParticipant(sessionId: string) {
  const baseUrl = buildApiBaseUrl()
  const payload = await parseResponse<{
    participant: MatchSessionParticipantSummary
    matchSessionStatus: MatchSessionSummary['status']
  }>(
    await fetch(`${baseUrl}/match-sessions/${encodeURIComponent(sessionId)}/join`, {
      method: 'POST',
      headers: createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({}),
    }),
  )

  return payload
}
