import type { KeyValueStore } from '../storage/keyValueStore'
import { AuthClient, type AuthApiUser } from './authClient'

type FetchLike = typeof fetch

export type SharedApiUser = AuthApiUser

export type CompetitionSummary = {
  id: string
  name: string
  description: string | null
  type: 'LEAGUE' | 'TOURNAMENT'
  format: 'KNOCKOUT' | 'SWISS' | 'ROUND_ROBIN'
  status:
    | 'DRAFT'
    | 'OPEN_FOR_JOIN'
    | 'TEAM_SUBMISSION_OPEN'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'ARCHIVED'
  visibility: 'PRIVATE' | 'INVITE_ONLY' | 'OPEN'
  maxEntrants: number
  submissionDeadline: string | null
  allowUnofficialRosters: boolean
  createdByUserId: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    displayName: string
  } | null
  entrantCount: number
}

export type CompetitionEntrySummary = {
  id: string
  competitionId: string
  userId: string
  status:
    | 'JOINED'
    | 'TEAM_PENDING'
    | 'TEAM_SUBMITTED'
    | 'TEAM_APPROVED'
    | 'ELIMINATED'
    | 'COMPLETED'
    | 'WITHDRAWN'
  joinedAt: string
  submittedAt: string | null
  approvedAt: string | null
  seed: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    displayName: string
  }
  submission: {
    id: string
    sourceTeamId: string | null
    competitionTeamId: string | null
    teamName: string
    rosterTemplateId: string
    submittedAt: string
  } | null
}

export type CompetitionDetail = CompetitionSummary & {
  configJson: Record<string, unknown>
  entries: CompetitionEntrySummary[]
}

export type CompetitionSubmissionDetail = {
  id: string
  competitionEntryId: string
  sourceType: 'COPIED_FROM_TEAM' | 'DIRECT_EVENT_BUILD'
  sourceTeamId: string | null
  competitionTeamId: string | null
  rosterTemplateId: string
  teamName: string
  tierId: string | null
  teamValue: number
  draftBudget: number
  rerollCount: number
  assistantCoachCount: number
  cheerleaderCount: number
  dedicatedFans: number
  apothecaryPurchased: boolean
  extraSkillsPackageJson: Record<string, unknown>
  submittedAt: string
  createdAt: string
  updatedAt: string
  players: Array<{
    id: string
    sourcePlayerId: string | null
    positionTemplateId: string
    name: string
    shirtNumber: number | null
    currentValue: number
    displayOrder: number
    extraSkills: string[]
    statAdjustments: Record<string, unknown>
  }>
}

export type CompetitionFixtureSummary = {
  id: string
  competitionId: string
  roundNumber: number
  bracketPosition: number | null
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'VOID'
  sourceType: 'GENERATED' | 'COMMISSIONER_OVERRIDE'
  scheduledAt: string | null
  nextFixtureId: string | null
  winnerEntryId: string | null
  createdAt: string
  updatedAt: string
  homeEntry: {
    id: string
    userId: string
    status: CompetitionEntrySummary['status']
    user: {
      id: string
      displayName: string
    }
    submission: {
      id: string
      teamName: string
      rosterTemplateId: string
    } | null
  } | null
  awayEntry: {
    id: string
    userId: string
    status: CompetitionEntrySummary['status']
    user: {
      id: string
      displayName: string
    }
    submission: {
      id: string
      teamName: string
      rosterTemplateId: string
    } | null
  } | null
}

export type CompetitionFixtureMatchSession = {
  id: string
  fixtureId: string | null
  leagueId: string | null
  homeTeamId: string
  awayTeamId: string
  sessionCode: string
  status: 'PENDING' | 'ACTIVE' | 'CLOSED'
  createdByUserId: string
  createdAt: string
  updatedAt: string
  participants: Array<{
    id: string
    userId: string
    teamId: string
    side: 'HOME' | 'AWAY'
    user: {
      id: string
      displayName: string
    }
  }>
  homeTeam?: {
    id: string
    name: string
    ownerUserId: string
  }
  awayTeam?: {
    id: string
    name: string
    ownerUserId: string
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

export class CompetitionClient {
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

  async getCurrentUser() {
    return this.authClient.getCurrentUser()
  }

  async listCompetitions() {
    const response = await this.fetchImpl(`${this.baseUrl}/competitions`)
    const payload = await parseResponse<{ competitions: CompetitionSummary[] }>(response)

    return payload.competitions
  }

  async getCompetition(id: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/competitions/${encodeURIComponent(id)}`)

    if (response.status === 404) {
      return null
    }

    const payload = await parseResponse<{ competition: CompetitionDetail }>(response)
    return payload.competition
  }

  async createCompetition(input: {
    name: string
    description: string
    type: CompetitionSummary['type']
    format: CompetitionSummary['format']
    status: CompetitionSummary['status']
    visibility: CompetitionSummary['visibility']
    maxEntrants: number
    submissionDeadline: string | null
    allowUnofficialRosters: boolean
  }) {
    const createdByUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(`${this.baseUrl}/competitions`, {
      method: 'POST',
      headers: this.authClient.createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        createdByUserId,
        name: input.name,
        description: input.description || null,
        type: input.type,
        format: input.format,
        status: input.status,
        visibility: input.visibility,
        maxEntrants: input.maxEntrants,
        submissionDeadline: input.submissionDeadline,
        allowUnofficialRosters: input.allowUnofficialRosters,
        configJson: {
          allowByes: true,
          timerPolicy: {
            enabled: true,
            perTurnSeconds: 180,
            bankSeconds: 300,
            bankResetsAtHalf: true,
          },
        },
      }),
    })
    const payload = await parseResponse<{ competition: CompetitionSummary }>(response)

    return payload.competition
  }

  async updateCompetition(competitionId: string, input: {
    name: string
    description: string
    maxEntrants: number
    submissionDeadline: string | null
    allowUnofficialRosters: boolean
    status: CompetitionSummary['status']
    visibility: CompetitionSummary['visibility']
  }) {
    const requestedByUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(`${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}`, {
      method: 'PUT',
      headers: this.authClient.createAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        requestedByUserId,
        name: input.name,
        description: input.description || null,
        maxEntrants: input.maxEntrants,
        submissionDeadline: input.submissionDeadline,
        allowUnofficialRosters: input.allowUnofficialRosters,
        status: input.status,
        visibility: input.visibility,
      }),
    })
    const payload = await parseResponse<{ competition: CompetitionSummary }>(response)

    return payload.competition
  }

  async joinCompetition(competitionId: string) {
    const userId = await this.getCurrentUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/join`,
      {
        method: 'POST',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          userId,
        }),
      },
    )
    const payload = await parseResponse<{ entry: CompetitionEntrySummary }>(response)

    return payload.entry
  }

  async getSubmission(competitionId: string, entryId: string) {
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/entries/${encodeURIComponent(entryId)}/submission`,
    )

    if (response.status === 404) {
      return null
    }

    const payload = await parseResponse<{
      entry: CompetitionEntrySummary
      submission: CompetitionSubmissionDetail
    }>(response)

    return payload
  }

  async submitTeam(competitionId: string, entryId: string, input: {
    sourceTeamId: string
    tierId: string | null
    extraSkillsPackageJson: Record<string, unknown>
  }) {
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/entries/${encodeURIComponent(entryId)}/submission`,
      {
        method: 'POST',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(input),
      },
    )
    const payload = await parseResponse<{ submission: CompetitionSubmissionDetail }>(response)

    return payload.submission
  }

  async updateSubmission(competitionId: string, entryId: string, input: {
    sourceTeamId: string
    tierId: string | null
    extraSkillsPackageJson: Record<string, unknown>
  }) {
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/entries/${encodeURIComponent(entryId)}/submission`,
      {
        method: 'PUT',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(input),
      },
    )
    const payload = await parseResponse<{ submission: CompetitionSubmissionDetail }>(response)

    return payload.submission
  }

  async approveSubmission(competitionId: string, entryId: string) {
    const approvedByUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/entries/${encodeURIComponent(entryId)}/approve`,
      {
        method: 'POST',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          approvedByUserId,
        }),
      },
    )
    const payload = await parseResponse<{ entry: CompetitionEntrySummary }>(response)

    return payload.entry
  }

  async listFixtures(competitionId: string) {
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/fixtures`,
    )
    const payload = await parseResponse<{ fixtures: CompetitionFixtureSummary[] }>(response)

    return payload.fixtures
  }

  async generateFixtures(competitionId: string) {
    const requestedByUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/fixtures/generate`,
      {
        method: 'POST',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          requestedByUserId,
        }),
      },
    )
    const payload = await parseResponse<{ fixtures: CompetitionFixtureSummary[] }>(response)

    return payload.fixtures
  }

  async getFixtureMatchSession(competitionId: string, fixtureId: string) {
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/fixtures/${encodeURIComponent(fixtureId)}/match-session`,
    )
    const payload = await parseResponse<{ matchSession: CompetitionFixtureMatchSession | null }>(response)

    return payload.matchSession
  }

  async createFixtureMatchSession(competitionId: string, fixtureId: string) {
    const requestedByUserId = await this.getCurrentUserId()
    const response = await this.fetchImpl(
      `${this.baseUrl}/competitions/${encodeURIComponent(competitionId)}/fixtures/${encodeURIComponent(fixtureId)}/match-session`,
      {
        method: 'POST',
        headers: this.authClient.createAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          requestedByUserId,
        }),
      },
    )
    const payload = await parseResponse<{ matchSession: CompetitionFixtureMatchSession }>(response)

    return payload.matchSession
  }

  private async getCurrentUserId() {
    const user = await this.authClient.getCurrentUser()
    return user.id
  }
}
