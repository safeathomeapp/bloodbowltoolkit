import { randomBytes } from 'node:crypto'
import {
  CompetitionType,
  MatchSessionCasualtyResolutionType,
  MatchSessionSide,
  MatchSessionStatus,
  TeamPlayerStatus,
  TeamStatus,
  type Prisma,
} from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { findAuthenticatedUser, requireAuthenticatedUser } from '../auth/authorization.js'

const statAdjustmentsSchema = z.object({
  movement: z.number().int().optional(),
  strength: z.number().int().optional(),
  agility: z.number().int().optional(),
  passing: z.number().int().optional(),
  armour: z.number().int().optional(),
})

type StatAdjustmentsRecord = z.infer<typeof statAdjustmentsSchema>

const createMatchSessionBodySchema = z.object({
  leagueId: z.string().min(1).nullable().optional(),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  createdByUserId: z.string().min(1),
})

const matchSessionEventTypes = [
  'TOUCHDOWN',
  'CASUALTY',
  'COMPLETION',
  'INTERCEPTION',
  'MVP_ASSIGNMENT',
] as const

type MatchSessionEventTypeValue = (typeof matchSessionEventTypes)[number]
type MatchSessionStatusValue = 'PENDING' | 'ACTIVE' | 'CLOSED'
type MatchSessionProgressionStatus = 'NOT_APPLICABLE' | 'READY' | 'APPLIED'
type MatchSessionTurnPhaseValue = 'READY' | 'RUNNING' | 'PAUSE_REQUESTED' | 'PAUSED' | 'REVIEW'

const matchSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
})

const matchSessionCodeParamsSchema = z.object({
  sessionCode: z.string().trim().min(1),
})

const joinMatchSessionBodySchema = z.object({
  side: z.nativeEnum(MatchSessionSide).optional(),
})

const timerActionParamsSchema = z.object({
  sessionId: z.string().min(1),
})

const startTimerBodySchema = z.object({
  side: z.nativeEnum(MatchSessionSide).optional(),
})

const pauseTimerBodySchema = z.object({
  requestedSide: z.nativeEnum(MatchSessionSide),
})

const confirmPauseBodySchema = z.object({
  confirmedSide: z.nativeEnum(MatchSessionSide),
})

const matchSessionEventParamsSchema = z.object({
  sessionId: z.string().min(1),
  eventId: z.string().min(1),
})

const createMatchSessionEventBodySchema = z.object({
  eventType: z.enum(matchSessionEventTypes),
  teamSide: z.nativeEnum(MatchSessionSide),
  playerNumber: z.number().int().positive().nullable().optional(),
  injuredTeamSide: z.nativeEnum(MatchSessionSide).nullable().optional(),
  injuredPlayerNumber: z.number().int().positive().nullable().optional(),
  casualtyResolutionType: z.nativeEnum(MatchSessionCasualtyResolutionType).nullable().optional(),
  notes: z.string().trim().max(280).nullable().optional(),
})

const confirmEventBodySchema = z.object({
  confirmedSide: z.nativeEnum(MatchSessionSide),
})

const finalSignoffBodySchema = z.object({
  signedOffSide: z.nativeEnum(MatchSessionSide),
})

const casualtyResolutionBodySchema = z.object({
  resolutionType: z.nativeEnum(MatchSessionCasualtyResolutionType),
})

function toIsoString(value: Date) {
  return value.toISOString()
}

function clampNonNegative(value: number) {
  return value < 0 ? 0 : value
}

function isRosterOrderLocked(status: TeamStatus) {
  return status !== TeamStatus.DRAFT
}

function normalizeShirtNumbers<T extends { shirtNumber: number | null; playerStatus?: TeamPlayerStatus }>(
  status: TeamStatus,
  players: T[],
) {
  if (!isRosterOrderLocked(status)) {
    return players
  }

  const usedNumbers = new Set<number>()

  return players.map((player) => {
    if ((player.playerStatus ?? TeamPlayerStatus.ACTIVE) !== TeamPlayerStatus.ACTIVE) {
      return player
    }

    if (
      typeof player.shirtNumber === 'number' &&
      player.shirtNumber > 0 &&
      !usedNumbers.has(player.shirtNumber)
    ) {
      usedNumbers.add(player.shirtNumber)
      return player
    }

    let nextNumber = 1

    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1
    }

    usedNumbers.add(nextNumber)

    return {
      ...player,
      shirtNumber: nextNumber,
    }
  })
}

function toSavedTeamRecord(team: {
  id: string
  rosterTemplateId: string
  name: string
  status: TeamStatus
  players: Array<{
    id: string
    teamId: string
    positionTemplateId: string
    name: string
    shirtNumber: number | null
    playerStatus?: TeamPlayerStatus
    currentValue: number
    spp: number
    nigglingInjuries: number
    missNextGame?: boolean
    isDead?: boolean
    extraSkills: string[]
    statAdjustments: unknown
  }>
}) {
  const normalizedPlayers = normalizeShirtNumbers(team.status, team.players)

  return {
    id: team.id,
    rosterTemplateId: team.rosterTemplateId,
    name: team.name,
    status: team.status,
    players: normalizedPlayers.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      positionTemplateId: player.positionTemplateId,
      name: player.name,
      shirtNumber: player.shirtNumber,
      playerStatus: player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE),
      currentValue: player.currentValue,
      spp: player.spp,
      nigglingInjuries: player.nigglingInjuries,
      missNextGame: player.missNextGame ?? false,
      isDead: player.isDead ?? false,
      extraSkills: player.extraSkills,
      statAdjustments: statAdjustmentsSchema.parse(player.statAdjustments),
    })),
  }
}

function toSavedTeamRecordFromSubmission(submission: {
  id: string
  rosterTemplateId: string
  teamName: string
  players: Array<{
    id: string
    positionTemplateId: string
    name: string
    shirtNumber: number | null
    playerStatus?: TeamPlayerStatus
    currentValue: number
    extraSkills: string[]
    statAdjustments: Prisma.JsonValue
  }>
}) {
  const normalizedPlayers = normalizeShirtNumbers(TeamStatus.ACTIVE, submission.players)

  return {
    id: submission.id,
    rosterTemplateId: submission.rosterTemplateId,
    name: submission.teamName,
    status: TeamStatus.ACTIVE,
    players: normalizedPlayers.map((player) => ({
      id: player.id,
      teamId: submission.id,
      positionTemplateId: player.positionTemplateId,
      name: player.name,
      shirtNumber: player.shirtNumber,
      playerStatus: player.playerStatus ?? TeamPlayerStatus.ACTIVE,
      currentValue: player.currentValue,
      spp: 0,
      nigglingInjuries: 0,
      missNextGame: false,
      isDead: false,
      extraSkills: player.extraSkills,
      statAdjustments: statAdjustmentsSchema.parse(player.statAdjustments),
    })),
  }
}

function toParticipantSummary(participant: {
  id: string
  userId: string
  teamId: string
  side: MatchSessionSide
  user: {
    id: string
    displayName: string
  }
}) {
  return {
    id: participant.id,
    userId: participant.userId,
    teamId: participant.teamId,
    side: participant.side,
    user: participant.user,
  }
}

function toMatchSessionSummary(session: {
  id: string
  leagueId: string | null
  fixtureId: string | null
  homeTeamId: string
  awayTeamId: string
  sessionCode: string
  status: MatchSessionStatus
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
  participants: Array<{
    id: string
    userId: string
    teamId: string
    side: MatchSessionSide
    user: {
      id: string
      displayName: string
    }
  }>
}) {
  return {
    id: session.id,
    leagueId: session.leagueId,
    fixtureId: session.fixtureId,
    homeTeamId: session.homeTeamId,
    awayTeamId: session.awayTeamId,
    sessionCode: session.sessionCode,
    status: session.status,
    createdByUserId: session.createdByUserId,
    createdAt: toIsoString(session.createdAt),
    updatedAt: toIsoString(session.updatedAt),
    participants: session.participants.map(toParticipantSummary),
  }
}

function toTimerStateSummary(session: {
  timerEnabled: boolean
  timerTurnSeconds: number | null
  timerBankSeconds: number | null
  timerBankResetsAtHalf: boolean
  timerCurrentHalf: number
  timerCurrentTurnNumber: number
  timerActiveSide: MatchSessionSide
  timerTurnPhase: MatchSessionTurnPhaseValue
  timerTurnRemainingSeconds: number | null
  timerTurnStartedAt: Date | null
  timerHomeBankRemainingSeconds: number | null
  timerAwayBankRemainingSeconds: number | null
}) {
  const now = new Date()
  const defaults = getDefaultTimerConfig()
  const turnSeconds = session.timerTurnSeconds ?? defaults.perTurnSeconds
  const storedTurnRemainingSeconds = session.timerTurnRemainingSeconds ?? turnSeconds
  const baseBankSeconds = session.timerBankSeconds ?? defaults.bankSeconds
  const homeBankRemainingSeconds = session.timerHomeBankRemainingSeconds ?? baseBankSeconds
  const awayBankRemainingSeconds = session.timerAwayBankRemainingSeconds ?? baseBankSeconds
  const elapsedSeconds = session.timerTurnStartedAt
    ? Math.max(0, Math.floor((now.getTime() - session.timerTurnStartedAt.getTime()) / 1000))
    : 0
  const overtimeSeconds = session.timerTurnStartedAt
    ? Math.max(0, elapsedSeconds - storedTurnRemainingSeconds)
    : 0
  const perTurnRemainingSeconds = session.timerTurnStartedAt
    ? clampNonNegative(storedTurnRemainingSeconds - elapsedSeconds)
    : storedTurnRemainingSeconds

  const activeBankRemainingSeconds =
    session.timerActiveSide === MatchSessionSide.HOME
      ? clampNonNegative(homeBankRemainingSeconds - overtimeSeconds)
      : clampNonNegative(awayBankRemainingSeconds - overtimeSeconds)

  return {
    enabled: session.timerEnabled,
    turnSeconds,
    bankSeconds: baseBankSeconds,
    bankResetsAtHalf: session.timerBankResetsAtHalf,
    currentHalf: session.timerCurrentHalf,
    currentTurnNumber: session.timerCurrentTurnNumber,
    activeSide: session.timerActiveSide,
    phase: session.timerTurnPhase,
    turnStartedAt: session.timerTurnStartedAt ? toIsoString(session.timerTurnStartedAt) : null,
    serverNow: toIsoString(now),
    perTurnRemainingSeconds,
    homeBankRemainingSeconds:
      session.timerActiveSide === MatchSessionSide.HOME
        ? activeBankRemainingSeconds
        : homeBankRemainingSeconds,
    awayBankRemainingSeconds:
      session.timerActiveSide === MatchSessionSide.AWAY
        ? activeBankRemainingSeconds
        : awayBankRemainingSeconds,
    isRunning: Boolean(session.timerTurnStartedAt),
  }
}

function getDefaultTimerConfig() {
  return {
    enabled: true,
    perTurnSeconds: 180,
    bankSeconds: 300,
    bankResetsAtHalf: true,
  }
}

function getAssignedUserIdForSessionSide(
  session: {
    homeTeam: { ownerUserId: string }
    awayTeam: { ownerUserId: string }
    fixture: {
      homeEntry: { userId: string } | null
      awayEntry: { userId: string } | null
    } | null
  },
  side: MatchSessionSide,
) {
  if (session.fixture) {
    return side === MatchSessionSide.HOME
      ? session.fixture.homeEntry?.userId ?? null
      : session.fixture.awayEntry?.userId ?? null
  }

  return side === MatchSessionSide.HOME ? session.homeTeam.ownerUserId : session.awayTeam.ownerUserId
}

function getAssignedSessionSideForUser(
  session: {
    homeTeam: { ownerUserId: string }
    awayTeam: { ownerUserId: string }
    fixture: {
      homeEntry: { userId: string } | null
      awayEntry: { userId: string } | null
    } | null
  },
  userId: string,
): MatchSessionSide | null {
  if (getAssignedUserIdForSessionSide(session, MatchSessionSide.HOME) === userId) {
    return MatchSessionSide.HOME
  }

  if (getAssignedUserIdForSessionSide(session, MatchSessionSide.AWAY) === userId) {
    return MatchSessionSide.AWAY
  }

  return null
}

const timerStateSelect = {
  id: true,
  status: true,
  timerEnabled: true,
  timerTurnSeconds: true,
  timerBankSeconds: true,
  timerBankResetsAtHalf: true,
  timerCurrentHalf: true,
  timerCurrentTurnNumber: true,
  timerActiveSide: true,
  timerTurnPhase: true,
  timerTurnRemainingSeconds: true,
  timerTurnStartedAt: true,
  timerHomeBankRemainingSeconds: true,
  timerAwayBankRemainingSeconds: true,
  homeFinalSignoffAt: true,
  awayFinalSignoffAt: true,
  closedAt: true,
  progressionAppliedAt: true,
} satisfies Prisma.MatchSessionSelect

function toMatchSessionEventSummary(event: {
  id: string
  half: number
  turnNumber: number
  actingSide: MatchSessionSide
  teamSide: MatchSessionSide
  eventType: MatchSessionEventTypeValue
  playerNumber: number | null
  injuredTeamSide: MatchSessionSide | null
  injuredPlayerNumber: number | null
  notes: string | null
  homeConfirmedAt: Date | null
  awayConfirmedAt: Date | null
  createdAt: Date
}) {
  return {
    id: event.id,
    half: event.half,
    turnNumber: event.turnNumber,
    actingSide: event.actingSide,
    teamSide: event.teamSide,
    eventType: event.eventType,
    playerNumber: event.playerNumber,
    injuredTeamSide: event.injuredTeamSide,
    injuredPlayerNumber: event.injuredPlayerNumber,
    notes: event.notes,
    homeConfirmedAt: event.homeConfirmedAt ? toIsoString(event.homeConfirmedAt) : null,
    awayConfirmedAt: event.awayConfirmedAt ? toIsoString(event.awayConfirmedAt) : null,
    homeConfirmed: Boolean(event.homeConfirmedAt),
    awayConfirmed: Boolean(event.awayConfirmedAt),
    createdAt: toIsoString(event.createdAt),
  }
}

function createMatchSessionEventTotals(events: Array<{ eventType: MatchSessionEventTypeValue }>) {
  const totals: Record<MatchSessionEventTypeValue, number> = {
    TOUCHDOWN: 0,
    CASUALTY: 0,
    COMPLETION: 0,
    INTERCEPTION: 0,
    MVP_ASSIGNMENT: 0,
  }

  for (const event of events) {
    totals[event.eventType] += 1
  }

  return totals
}

function toFinalSignoffSummary(input: {
  status: MatchSessionStatusValue
  homeFinalSignoffAt: Date | null
  awayFinalSignoffAt: Date | null
  closedAt: Date | null
  events: Array<{ eventType: MatchSessionEventTypeValue }>
}) {
  const eventTotals = createMatchSessionEventTotals(input.events)

  return {
    status: input.status,
    homeFinalSignoffAt: input.homeFinalSignoffAt ? toIsoString(input.homeFinalSignoffAt) : null,
    awayFinalSignoffAt: input.awayFinalSignoffAt ? toIsoString(input.awayFinalSignoffAt) : null,
    homeSignedOff: Boolean(input.homeFinalSignoffAt),
    awaySignedOff: Boolean(input.awayFinalSignoffAt),
    closedAt: input.closedAt ? toIsoString(input.closedAt) : null,
    eventTotals,
    totalEvents: input.events.length,
  }
}

function getEventSppValue(eventType: MatchSessionEventTypeValue) {
  switch (eventType) {
    case 'TOUCHDOWN':
      return 3
    case 'CASUALTY':
      return 2
    case 'COMPLETION':
      return 1
    case 'INTERCEPTION':
      return 2
    case 'MVP_ASSIGNMENT':
      return 4
  }
}

function createEmptyEventTotals() {
  return {
    TOUCHDOWN: 0,
    CASUALTY: 0,
    COMPLETION: 0,
    INTERCEPTION: 0,
    MVP_ASSIGNMENT: 0,
  } satisfies Record<MatchSessionEventTypeValue, number>
}

function createEmptyTeamProgressionSummary(team: {
  id: string
  name: string
}) {
  return {
    teamId: team.id,
    teamName: team.name,
    totalAwardedSpp: 0,
    players: [] as Array<{
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
      statAdjustmentsBefore: StatAdjustmentsRecord
      statAdjustmentsAfter: StatAdjustmentsRecord
      eventTotals: Record<MatchSessionEventTypeValue, number>
    }>,
  }
}

function cloneStatAdjustments(statAdjustments: StatAdjustmentsRecord): StatAdjustmentsRecord {
  return { ...statAdjustments }
}

function reduceStatAdjustment(
  statAdjustments: StatAdjustmentsRecord,
  key: keyof StatAdjustmentsRecord,
) {
  const currentValue = statAdjustments[key] ?? 0

  if (currentValue <= -1) {
    return {
      next: cloneStatAdjustments(statAdjustments),
      fellBackToMissNextGame: true,
    }
  }

  return {
    next: {
      ...cloneStatAdjustments(statAdjustments),
      [key]: currentValue - 1,
    },
    fellBackToMissNextGame: false,
  }
}

function toCasualtyResolutionSummary(resolution: {
  matchSessionEventId: string
  resolutionType: MatchSessionCasualtyResolutionType
}) {
  return {
    matchSessionEventId: resolution.matchSessionEventId,
    resolutionType: resolution.resolutionType,
  }
}

function buildMatchSessionProgressionSummary(session: {
  id: string
  status: MatchSessionStatus
  fixtureId: string | null
  progressionAppliedAt: Date | null
  events: Array<{
    id: string
    teamSide: MatchSessionSide
    eventType: MatchSessionEventTypeValue
    playerNumber: number | null
    injuredTeamSide: MatchSessionSide | null
    injuredPlayerNumber: number | null
  }>
  casualtyResolutions: Array<{
    matchSessionEventId: string
    resolutionType: MatchSessionCasualtyResolutionType
  }>
  fixture: {
    competition: {
      type: CompetitionType
    }
  } | null
  homeTeam: {
    id: string
    name: string
    players: Array<{
      id: string
      name: string
      shirtNumber: number | null
      playerStatus?: TeamPlayerStatus
      spp: number
      nigglingInjuries: number
      missNextGame: boolean
      isDead: boolean
      statAdjustments: Prisma.JsonValue
    }>
  }
  awayTeam: {
    id: string
    name: string
    players: Array<{
      id: string
      name: string
      shirtNumber: number | null
      playerStatus?: TeamPlayerStatus
      spp: number
      nigglingInjuries: number
      missNextGame: boolean
      isDead: boolean
      statAdjustments: Prisma.JsonValue
    }>
  }
}) {
  const isTournamentFixture = session.fixture?.competition.type === CompetitionType.TOURNAMENT
  const normalizedHomeTeam = {
    ...session.homeTeam,
    players: normalizeShirtNumbers(TeamStatus.ACTIVE, session.homeTeam.players),
  }
  const normalizedAwayTeam = {
    ...session.awayTeam,
    players: normalizeShirtNumbers(TeamStatus.ACTIVE, session.awayTeam.players),
  }
  const casualtyResolutionMap = new Map(
    session.casualtyResolutions.map((resolution) => [resolution.matchSessionEventId, resolution.resolutionType]),
  )

  if (isTournamentFixture) {
    return {
      applicable: false,
      scope: 'TOURNAMENT_SNAPSHOT' as const,
      status: 'NOT_APPLICABLE' as MatchSessionProgressionStatus,
      appliedAt: null,
      canApply: false,
      reason: 'Tournament snapshot rooms record history but do not mutate saved team progression.',
      homeTeam: createEmptyTeamProgressionSummary(normalizedHomeTeam),
      awayTeam: createEmptyTeamProgressionSummary(normalizedAwayTeam),
      casualtyResolutions: session.casualtyResolutions.map(toCasualtyResolutionSummary),
      unresolvedEvents: [] as Array<{
        eventId: string
        eventType: MatchSessionEventTypeValue
        teamSide: MatchSessionSide
        playerNumber: number | null
        injuredTeamSide: MatchSessionSide | null
        injuredPlayerNumber: number | null
        reason: string
      }>,
    }
  }

  const homePlayersByNumber = new Map(
    normalizedHomeTeam.players
      .filter((player) => typeof player.shirtNumber === 'number')
      .map((player) => [player.shirtNumber as number, player]),
  )
  const awayPlayersByNumber = new Map(
    normalizedAwayTeam.players
      .filter((player) => typeof player.shirtNumber === 'number')
      .map((player) => [player.shirtNumber as number, player]),
  )

  const homeSummary = createEmptyTeamProgressionSummary(normalizedHomeTeam)
  const awaySummary = createEmptyTeamProgressionSummary(normalizedAwayTeam)
  const homePlayerSummaries = new Map<string, (typeof homeSummary.players)[number]>()
  const awayPlayerSummaries = new Map<string, (typeof awaySummary.players)[number]>()
  const unresolvedEvents: Array<{
    eventId: string
    eventType: MatchSessionEventTypeValue
    teamSide: MatchSessionSide
    playerNumber: number | null
    injuredTeamSide: MatchSessionSide | null
    injuredPlayerNumber: number | null
    reason: string
  }> = []

  for (const event of session.events) {
    if (typeof event.playerNumber !== 'number') {
      unresolvedEvents.push({
        eventId: event.id,
        eventType: event.eventType,
        teamSide: event.teamSide,
        playerNumber: event.playerNumber,
        injuredTeamSide: event.injuredTeamSide,
        injuredPlayerNumber: event.injuredPlayerNumber,
        reason: 'Player number is required before progression can be applied.',
      })
      continue
    }

    const teamSummary = event.teamSide === MatchSessionSide.HOME ? homeSummary : awaySummary
    const playerSummaries = event.teamSide === MatchSessionSide.HOME ? homePlayerSummaries : awayPlayerSummaries
    const player =
      event.teamSide === MatchSessionSide.HOME
        ? homePlayersByNumber.get(event.playerNumber)
        : awayPlayersByNumber.get(event.playerNumber)

    if (!player) {
      unresolvedEvents.push({
        eventId: event.id,
        eventType: event.eventType,
        teamSide: event.teamSide,
        playerNumber: event.playerNumber,
        injuredTeamSide: event.injuredTeamSide,
        injuredPlayerNumber: event.injuredPlayerNumber,
        reason: 'No live team player matches that shirt number.',
      })
      continue
    }

    const isSelfInflictedCasualty =
      event.eventType === 'CASUALTY' &&
      event.injuredTeamSide === event.teamSide &&
      typeof event.injuredPlayerNumber === 'number'
    const sppAward = isSelfInflictedCasualty ? 0 : getEventSppValue(event.eventType)
    const existingSummary = playerSummaries.get(player.id)
    const casualtyResolution = event.eventType === 'CASUALTY' ? casualtyResolutionMap.get(event.id) ?? null : null
    const playerStatAdjustments = statAdjustmentsSchema.parse(player.statAdjustments)

    if (existingSummary) {
      existingSummary.sppAwarded += sppAward
      if (session.progressionAppliedAt) {
        existingSummary.sppBefore -= sppAward
      } else {
        existingSummary.sppAfter += sppAward
      }
      existingSummary.eventTotals[event.eventType] += 1
    } else {
      playerSummaries.set(player.id, {
        playerId: player.id,
      playerName: player.name,
      shirtNumber: player.shirtNumber,
      sppBefore: session.progressionAppliedAt ? player.spp - sppAward : player.spp,
      sppAwarded: sppAward,
      sppAfter: session.progressionAppliedAt ? player.spp : player.spp + sppAward,
        missNextGameBefore: player.missNextGame,
        missNextGameAfter: player.missNextGame,
        nigglingInjuriesBefore: player.nigglingInjuries,
        nigglingInjuriesAfter: player.nigglingInjuries,
        isDeadBefore: player.isDead,
        isDeadAfter: player.isDead,
        statAdjustmentsBefore: cloneStatAdjustments(playerStatAdjustments),
        statAdjustmentsAfter: cloneStatAdjustments(playerStatAdjustments),
      eventTotals: {
        ...createEmptyEventTotals(),
        [event.eventType]: 1,
      },
    })
    }

    teamSummary.totalAwardedSpp += sppAward

    if (event.eventType !== 'CASUALTY') {
      continue
    }

    if (!event.injuredTeamSide || typeof event.injuredPlayerNumber !== 'number') {
      unresolvedEvents.push({
        eventId: event.id,
        eventType: event.eventType,
        teamSide: event.teamSide,
        playerNumber: event.playerNumber,
        injuredTeamSide: event.injuredTeamSide,
        injuredPlayerNumber: event.injuredPlayerNumber,
        reason: 'Choose the injured team and player before progression can be applied.',
      })
      continue
    }

    const injuredPlayerSummaries =
      event.injuredTeamSide === MatchSessionSide.HOME ? homePlayerSummaries : awayPlayerSummaries
    const injuredPlayer =
      event.injuredTeamSide === MatchSessionSide.HOME
        ? homePlayersByNumber.get(event.injuredPlayerNumber)
        : awayPlayersByNumber.get(event.injuredPlayerNumber)

    if (!injuredPlayer) {
      unresolvedEvents.push({
        eventId: event.id,
        eventType: event.eventType,
        teamSide: event.teamSide,
        playerNumber: event.playerNumber,
        injuredTeamSide: event.injuredTeamSide,
        injuredPlayerNumber: event.injuredPlayerNumber,
        reason: 'No injured live team player matches that shirt number.',
      })
      continue
    }

    if (!casualtyResolution) {
      unresolvedEvents.push({
        eventId: event.id,
        eventType: event.eventType,
        teamSide: event.teamSide,
        playerNumber: event.playerNumber,
        injuredTeamSide: event.injuredTeamSide,
        injuredPlayerNumber: event.injuredPlayerNumber,
        reason: 'Choose a casualty outcome before progression can be applied.',
      })
      continue
    }

    const existingInjuredSummary = injuredPlayerSummaries.get(injuredPlayer.id)
    const injuredPlayerStatAdjustments = statAdjustmentsSchema.parse(injuredPlayer.statAdjustments)

    if (existingInjuredSummary) {
      if (casualtyResolution === 'MISS_NEXT_GAME') {
        existingInjuredSummary.missNextGameBefore =
          session.progressionAppliedAt && injuredPlayer.missNextGame
            ? false
            : existingInjuredSummary.missNextGameBefore
        existingInjuredSummary.missNextGameAfter = session.progressionAppliedAt
          ? injuredPlayer.missNextGame
          : true
      }

      if (casualtyResolution === 'NIGGLING_INJURY') {
        existingInjuredSummary.nigglingInjuriesBefore = session.progressionAppliedAt
          ? injuredPlayer.nigglingInjuries - 1
          : existingInjuredSummary.nigglingInjuriesBefore
        existingInjuredSummary.nigglingInjuriesAfter = session.progressionAppliedAt
          ? injuredPlayer.nigglingInjuries
          : injuredPlayer.nigglingInjuries + 1
      }

      if (casualtyResolution === 'SERIOUS_INJURY') {
        existingInjuredSummary.missNextGameBefore =
          session.progressionAppliedAt && injuredPlayer.missNextGame
            ? false
            : existingInjuredSummary.missNextGameBefore
        existingInjuredSummary.missNextGameAfter = session.progressionAppliedAt
          ? injuredPlayer.missNextGame
          : true
        existingInjuredSummary.nigglingInjuriesBefore = session.progressionAppliedAt
          ? injuredPlayer.nigglingInjuries - 1
          : existingInjuredSummary.nigglingInjuriesBefore
        existingInjuredSummary.nigglingInjuriesAfter = session.progressionAppliedAt
          ? injuredPlayer.nigglingInjuries
          : injuredPlayer.nigglingInjuries + 1
      }

      if (
        casualtyResolution === 'LASTING_INJURY_ARMOUR' ||
        casualtyResolution === 'LASTING_INJURY_MOVEMENT' ||
        casualtyResolution === 'LASTING_INJURY_PASSING' ||
        casualtyResolution === 'LASTING_INJURY_AGILITY' ||
        casualtyResolution === 'LASTING_INJURY_STRENGTH'
      ) {
        existingInjuredSummary.missNextGameBefore =
          session.progressionAppliedAt && injuredPlayer.missNextGame
            ? false
            : existingInjuredSummary.missNextGameBefore
        existingInjuredSummary.missNextGameAfter = session.progressionAppliedAt
          ? injuredPlayer.missNextGame
          : true

        const reductionKey =
          casualtyResolution === 'LASTING_INJURY_ARMOUR'
            ? 'armour'
            : casualtyResolution === 'LASTING_INJURY_MOVEMENT'
              ? 'movement'
              : casualtyResolution === 'LASTING_INJURY_PASSING'
                ? 'passing'
                : casualtyResolution === 'LASTING_INJURY_AGILITY'
                  ? 'agility'
                  : 'strength'
        const reduced = reduceStatAdjustment(existingInjuredSummary.statAdjustmentsBefore, reductionKey)

        if (reduced.fellBackToMissNextGame) {
          existingInjuredSummary.statAdjustmentsAfter = cloneStatAdjustments(
            existingInjuredSummary.statAdjustmentsBefore,
          )
        } else {
          existingInjuredSummary.statAdjustmentsAfter = session.progressionAppliedAt
            ? cloneStatAdjustments(injuredPlayerStatAdjustments)
            : reduced.next
          existingInjuredSummary.statAdjustmentsBefore = session.progressionAppliedAt
            ? reduceStatAdjustment(injuredPlayerStatAdjustments, reductionKey).next
            : existingInjuredSummary.statAdjustmentsBefore
        }
      }

      if (casualtyResolution === 'DEAD') {
        existingInjuredSummary.isDeadBefore =
          session.progressionAppliedAt && injuredPlayer.isDead ? false : existingInjuredSummary.isDeadBefore
        existingInjuredSummary.isDeadAfter = session.progressionAppliedAt ? injuredPlayer.isDead : true
      }
    } else {
      injuredPlayerSummaries.set(injuredPlayer.id, {
        playerId: injuredPlayer.id,
        playerName: injuredPlayer.name,
        shirtNumber: injuredPlayer.shirtNumber,
        sppBefore: injuredPlayer.spp,
        sppAwarded: 0,
        sppAfter: injuredPlayer.spp,
        missNextGameBefore:
          session.progressionAppliedAt && casualtyResolution === 'MISS_NEXT_GAME'
            ? false
            : injuredPlayer.missNextGame,
        missNextGameAfter:
          session.progressionAppliedAt
            ? injuredPlayer.missNextGame
            : casualtyResolution === 'MISS_NEXT_GAME'
              ? true
              : injuredPlayer.missNextGame,
        nigglingInjuriesBefore:
          session.progressionAppliedAt && casualtyResolution === 'NIGGLING_INJURY'
            ? injuredPlayer.nigglingInjuries - 1
            : injuredPlayer.nigglingInjuries,
        nigglingInjuriesAfter:
          session.progressionAppliedAt
            ? injuredPlayer.nigglingInjuries
            : casualtyResolution === 'NIGGLING_INJURY'
              ? injuredPlayer.nigglingInjuries + 1
              : injuredPlayer.nigglingInjuries,
        isDeadBefore:
          session.progressionAppliedAt && casualtyResolution === 'DEAD' ? false : injuredPlayer.isDead,
        isDeadAfter:
          session.progressionAppliedAt ? injuredPlayer.isDead : casualtyResolution === 'DEAD' ? true : injuredPlayer.isDead,
        statAdjustmentsBefore:
          session.progressionAppliedAt &&
          (casualtyResolution === 'LASTING_INJURY_ARMOUR' ||
            casualtyResolution === 'LASTING_INJURY_MOVEMENT' ||
            casualtyResolution === 'LASTING_INJURY_PASSING' ||
            casualtyResolution === 'LASTING_INJURY_AGILITY' ||
            casualtyResolution === 'LASTING_INJURY_STRENGTH')
            ? reduceStatAdjustment(
                injuredPlayerStatAdjustments,
                casualtyResolution === 'LASTING_INJURY_ARMOUR'
                  ? 'armour'
                  : casualtyResolution === 'LASTING_INJURY_MOVEMENT'
                    ? 'movement'
                    : casualtyResolution === 'LASTING_INJURY_PASSING'
                      ? 'passing'
                      : casualtyResolution === 'LASTING_INJURY_AGILITY'
                        ? 'agility'
                        : 'strength',
              ).next
            : cloneStatAdjustments(injuredPlayerStatAdjustments),
        statAdjustmentsAfter:
          session.progressionAppliedAt
            ? cloneStatAdjustments(injuredPlayerStatAdjustments)
            : casualtyResolution === 'LASTING_INJURY_ARMOUR'
              ? reduceStatAdjustment(injuredPlayerStatAdjustments, 'armour').next
              : casualtyResolution === 'LASTING_INJURY_MOVEMENT'
                ? reduceStatAdjustment(injuredPlayerStatAdjustments, 'movement').next
                : casualtyResolution === 'LASTING_INJURY_PASSING'
                  ? reduceStatAdjustment(injuredPlayerStatAdjustments, 'passing').next
                  : casualtyResolution === 'LASTING_INJURY_AGILITY'
                    ? reduceStatAdjustment(injuredPlayerStatAdjustments, 'agility').next
                    : casualtyResolution === 'LASTING_INJURY_STRENGTH'
                      ? reduceStatAdjustment(injuredPlayerStatAdjustments, 'strength').next
                      : cloneStatAdjustments(injuredPlayerStatAdjustments),
        eventTotals: createEmptyEventTotals(),
      })
    }
  }

  homeSummary.players = Array.from(homePlayerSummaries.values()).sort(
    (left, right) => (left.shirtNumber ?? 999) - (right.shirtNumber ?? 999),
  )
  awaySummary.players = Array.from(awayPlayerSummaries.values()).sort(
    (left, right) => (left.shirtNumber ?? 999) - (right.shirtNumber ?? 999),
  )

  return {
    applicable: true,
    scope: 'LIVE_TEAM' as const,
    status: session.progressionAppliedAt ? ('APPLIED' as MatchSessionProgressionStatus) : ('READY' as MatchSessionProgressionStatus),
    appliedAt: session.progressionAppliedAt ? toIsoString(session.progressionAppliedAt) : null,
    canApply:
      session.status === MatchSessionStatus.CLOSED &&
      !session.progressionAppliedAt &&
      unresolvedEvents.length === 0 &&
      session.events.length > 0,
    reason:
      session.status !== MatchSessionStatus.CLOSED
        ? 'Final signoff must be completed before progression can be applied.'
        : session.progressionAppliedAt
          ? 'Progression has already been applied for this room.'
          : unresolvedEvents.some((event) => event.eventType === 'CASUALTY')
            ? 'Resolve all casualty outcomes before progression can be applied.'
            : session.events.length === 0
              ? 'At least one match event is required before progression can be applied.'
              : null,
    homeTeam: homeSummary,
    awayTeam: awaySummary,
    casualtyResolutions: session.casualtyResolutions.map(toCasualtyResolutionSummary),
    unresolvedEvents,
  }
}

function isClosedMatchSession(session: { status: MatchSessionStatus }) {
  return session.status === MatchSessionStatus.CLOSED
}

function isTurnClockRunning(session: { timerTurnPhase: MatchSessionTurnPhaseValue; timerTurnStartedAt: Date | null }) {
  return session.timerTurnPhase === 'RUNNING' && Boolean(session.timerTurnStartedAt)
}

function getOpposingSessionSide(side: MatchSessionSide) {
  return side === MatchSessionSide.HOME ? MatchSessionSide.AWAY : MatchSessionSide.HOME
}

function getNextTurnPosition(side: MatchSessionSide, turnNumber: number) {
  const nextActiveSide = getOpposingSessionSide(side)
  return {
    nextActiveSide,
    nextTurnNumber: side === MatchSessionSide.AWAY ? turnNumber + 1 : turnNumber,
  }
}

function isCompletedFinalTurnOfHalf(session: {
  timerCurrentTurnNumber: number
  timerActiveSide: MatchSessionSide
}) {
  return session.timerCurrentTurnNumber === 8 && session.timerActiveSide === MatchSessionSide.AWAY
}

function areAllTurnEventsConfirmed(
  events: Array<{ homeConfirmedAt: Date | null; awayConfirmedAt: Date | null }>,
) {
  return events.every((event) => event.homeConfirmedAt && event.awayConfirmedAt)
}

function buildValidSessionPlayerMap(team: {
  players: Array<{
    shirtNumber: number | null
    name: string
    positionTemplateId: string
    playerStatus?: TeamPlayerStatus
    isDead?: boolean
  }>
}) {
  const playerMap = new Map<number, { shirtNumber: number; name: string; positionTemplateId: string }>()
  const normalizedPlayers = normalizeShirtNumbers(TeamStatus.ACTIVE, team.players)

  for (const player of normalizedPlayers) {
    if (
      typeof player.shirtNumber === 'number' &&
      player.shirtNumber > 0 &&
      (player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE)) !== TeamPlayerStatus.DEAD
    ) {
      playerMap.set(player.shirtNumber, {
        shirtNumber: player.shirtNumber,
        name: player.name,
        positionTemplateId: player.positionTemplateId,
      })
    }
  }

  return playerMap
}

function createSessionCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function generateUniqueSessionCode(app: FastifyInstance) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = createSessionCode()
    const existingSession = await app.prisma.matchSession.findUnique({
      where: {
        sessionCode: candidate,
      },
      select: {
        id: true,
      },
    })

    if (!existingSession) {
      return candidate
    }
  }

  throw new Error('Could not generate a unique match session code.')
}

export async function fetchMatchSessionById(app: FastifyInstance, sessionId: string) {
  return app.prisma.matchSession.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          side: 'asc',
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      },
    },
  })
}

export async function fetchMatchSessionByCode(app: FastifyInstance, sessionCode: string) {
  return app.prisma.matchSession.findUnique({
    where: {
      sessionCode,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          side: 'asc',
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      },
    },
  })
}

export async function fetchMatchSessionByFixtureId(app: FastifyInstance, fixtureId: string) {
  return app.prisma.matchSession.findUnique({
    where: {
      fixtureId,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          side: 'asc',
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          ownerUserId: true,
        },
      },
    },
  })
}

export { generateUniqueSessionCode, toMatchSessionSummary }

export async function registerMatchSessionRoutes(app: FastifyInstance) {
  app.post('/match-sessions', async (request, reply) => {
    const bodyResult = createMatchSessionBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session payload.',
        issues: bodyResult.error.issues,
      })
    }

    if (bodyResult.data.homeTeamId === bodyResult.data.awayTeamId) {
      return reply.code(400).send({
        message: 'Home and away teams must be different.',
      })
    }

    const [creator, league, homeTeam, awayTeam] = await Promise.all([
      app.prisma.user.findUnique({
        where: {
          id: bodyResult.data.createdByUserId,
        },
      }),
      bodyResult.data.leagueId
        ? app.prisma.league.findUnique({
            where: {
              id: bodyResult.data.leagueId,
            },
          })
        : Promise.resolve(null),
      app.prisma.team.findUnique({
        where: {
          id: bodyResult.data.homeTeamId,
        },
      }),
      app.prisma.team.findUnique({
        where: {
          id: bodyResult.data.awayTeamId,
        },
      }),
    ])

    if (!creator) {
      return reply.code(404).send({
        message: 'Creator user not found.',
      })
    }

    if (bodyResult.data.leagueId && !league) {
      return reply.code(404).send({
        message: 'League not found.',
      })
    }

    if (!homeTeam || !awayTeam) {
      return reply.code(404).send({
        message: 'One or both teams could not be found.',
      })
    }

    if (bodyResult.data.leagueId) {
      if (homeTeam.leagueId !== bodyResult.data.leagueId || awayTeam.leagueId !== bodyResult.data.leagueId) {
        return reply.code(409).send({
          message: 'League match sessions require both teams to belong to the selected league.',
        })
      }

      const membership = await app.prisma.leagueMembership.findUnique({
        where: {
          leagueId_userId: {
            leagueId: bodyResult.data.leagueId,
            userId: creator.id,
          },
        },
      })

      if (!membership) {
        return reply.code(409).send({
          message: 'Session creator must be a member of the selected league.',
        })
      }
    }

    const timerConfig = getDefaultTimerConfig()
    const sessionCode = await generateUniqueSessionCode(app)
    const createdSession = await app.prisma.matchSession.create({
      data: {
        leagueId: bodyResult.data.leagueId ?? null,
        homeTeamId: bodyResult.data.homeTeamId,
        awayTeamId: bodyResult.data.awayTeamId,
        sessionCode,
        status: MatchSessionStatus.PENDING,
        timerEnabled: timerConfig.enabled,
        timerTurnSeconds: timerConfig.perTurnSeconds,
        timerBankSeconds: timerConfig.bankSeconds,
        timerBankResetsAtHalf: timerConfig.bankResetsAtHalf,
        timerCurrentHalf: 1,
        timerCurrentTurnNumber: 1,
        timerActiveSide: MatchSessionSide.HOME,
        timerTurnPhase: 'READY',
        timerTurnRemainingSeconds: timerConfig.perTurnSeconds,
        timerHomeBankRemainingSeconds: timerConfig.bankSeconds,
        timerAwayBankRemainingSeconds: timerConfig.bankSeconds,
        createdByUserId: creator.id,
      },
    })

    const session = await fetchMatchSessionById(app, createdSession.id)

    if (!session) {
      return reply.code(500).send({
        message: 'Match session was created but could not be reloaded.',
      })
    }

    return reply.code(201).send({
      matchSession: toMatchSessionSummary(session),
    })
  })

  app.get('/match-sessions/:sessionId', async (request, reply) => {
    const paramsResult = matchSessionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await fetchMatchSessionById(app, paramsResult.data.sessionId)

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    return reply.send({
      matchSession: {
        ...toMatchSessionSummary(session),
        homeTeam: session.homeTeam,
        awayTeam: session.awayTeam,
      },
    })
  })

  app.get('/match-sessions/code/:sessionCode', async (request, reply) => {
    const paramsResult = matchSessionCodeParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session code.',
      })
    }

    const session = await fetchMatchSessionByCode(app, paramsResult.data.sessionCode.toUpperCase())

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    return reply.send({
      matchSession: {
        ...toMatchSessionSummary(session),
        homeTeam: session.homeTeam,
        awayTeam: session.awayTeam,
      },
    })
  })

  app.post('/match-sessions/:sessionId/join', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = matchSessionParamsSchema.safeParse(request.params)
    const bodyResult = joinMatchSessionBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid join payload.',
        issues: bodyResult.error.issues,
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: true,
        homeTeam: true,
        awayTeam: true,
        fixture: {
          include: {
            homeEntry: {
              select: {
                userId: true,
              },
            },
            awayEntry: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (session.leagueId) {
      const membership = await app.prisma.leagueMembership.findUnique({
        where: {
          leagueId_userId: {
            leagueId: session.leagueId,
            userId: actorUser.id,
          },
        },
      })

      if (!membership) {
        return reply.code(409).send({
          message: 'User must be a member of the session league to join.',
        })
      }
    }

    const existingParticipant = session.participants.find((participant) => participant.userId === actorUser.id)

    if (existingParticipant) {
      return reply.send({
        participant: {
          ...toParticipantSummary({
            ...existingParticipant,
            user: {
              id: actorUser.id,
              displayName: actorUser.displayName,
            },
          }),
        },
        matchSessionStatus: session.status,
      })
    }

    const assignedSide = getAssignedSessionSideForUser(session, actorUser.id)

    if (!assignedSide) {
      return reply.code(409).send({
        message: 'Signed-in user is not assigned to either side of this match session.',
      })
    }

    if (bodyResult.data.side && bodyResult.data.side !== assignedSide) {
      return reply.code(409).send({
        message: 'Signed-in user can only claim their assigned side for this session.',
      })
    }

    const requestedTeam = assignedSide === MatchSessionSide.HOME ? session.homeTeam : session.awayTeam
    const occupiedSide = session.participants.find((participant) => participant.side === assignedSide)

    if (occupiedSide) {
      return reply.code(409).send({
        message: 'That side has already been claimed for this session.',
      })
    }

    const participant = await app.prisma.matchSessionParticipant.create({
      data: {
        matchSessionId: session.id,
        userId: actorUser.id,
        teamId: requestedTeam.id,
        side: assignedSide,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })

    const participantCount = session.participants.length + 1
    const nextStatus = participantCount >= 2 ? MatchSessionStatus.ACTIVE : session.status

    if (nextStatus !== session.status) {
      await app.prisma.matchSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: nextStatus,
        },
      })
    }

    return reply.code(201).send({
      participant: toParticipantSummary(participant),
      matchSessionStatus: nextStatus,
    })
  })

  app.get('/match-sessions/:sessionId/block-dice-context', async (request, reply) => {
    const actorUser = await findAuthenticatedUser(app, request)
    const paramsResult = matchSessionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            side: 'asc',
          },
        },
        homeTeam: {
          include: {
            players: {
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
        },
        fixture: {
          include: {
            homeEntry: {
              include: {
                submission: {
                  include: {
                    players: {
                      orderBy: {
                        displayOrder: 'asc',
                      },
                    },
                  },
                },
              },
            },
            awayEntry: {
              include: {
                submission: {
                  include: {
                    players: {
                      orderBy: {
                        displayOrder: 'asc',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    const homeSubmission = session.fixture?.homeEntry?.submission ?? null
    const awaySubmission = session.fixture?.awayEntry?.submission ?? null

    return reply.send({
      matchSession: toMatchSessionSummary(session),
      viewer: {
        userId: actorUser?.id ?? null,
        assignedSide: actorUser ? getAssignedSessionSideForUser(session, actorUser.id) : null,
        participantSide: actorUser
          ? session.participants.find((participant) => participant.userId === actorUser.id)?.side ?? null
          : null,
      },
      teams: {
        home: homeSubmission
          ? toSavedTeamRecordFromSubmission(homeSubmission)
          : toSavedTeamRecord(session.homeTeam),
        away: awaySubmission
          ? toSavedTeamRecordFromSubmission(awaySubmission)
          : toSavedTeamRecord(session.awayTeam),
      },
    })
  })

  app.get('/match-sessions/:sessionId/events', async (request, reply) => {
    const paramsResult = timerActionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      select: timerStateSelect,
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    const events = await app.prisma.matchSessionEvent.findMany({
      where: {
        matchSessionId: session.id,
      },
      orderBy: [
        {
          half: 'desc',
        },
        {
          turnNumber: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    })

    return reply.send({
      currentTurn: {
        half: session.timerCurrentHalf,
        turnNumber: session.timerCurrentTurnNumber,
        side: session.timerActiveSide,
        phase: session.timerTurnPhase,
      },
      events: events.map(toMatchSessionEventSummary),
      signoff: toFinalSignoffSummary({
        status: session.status,
        homeFinalSignoffAt: session.homeFinalSignoffAt,
        awayFinalSignoffAt: session.awayFinalSignoffAt,
        closedAt: session.closedAt,
        events,
      }),
    })
  })

  app.get('/match-sessions/:sessionId/progression', async (request, reply) => {
    const paramsResult = timerActionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        events: {
          select: {
            id: true,
            teamSide: true,
            eventType: true,
            playerNumber: true,
            injuredTeamSide: true,
            injuredPlayerNumber: true,
          },
        },
        casualtyResolutions: {
          select: {
            matchSessionEventId: true,
            resolutionType: true,
          },
        },
        fixture: {
          include: {
            competition: {
              select: {
                type: true,
              },
            },
          },
        },
        homeTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    return reply.send({
      progression: buildMatchSessionProgressionSummary(session),
    })
  })

  app.put('/match-sessions/:sessionId/casualty-resolution/:eventId', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = matchSessionEventParamsSchema.safeParse(request.params)
    const bodyResult = casualtyResolutionBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid casualty event id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid casualty resolution payload.',
        issues: bodyResult.error.issues,
      })
    }

    const event = await app.prisma.matchSessionEvent.findFirst({
      where: {
        id: paramsResult.data.eventId,
        matchSessionId: paramsResult.data.sessionId,
      },
      select: {
        id: true,
        matchSessionId: true,
        half: true,
        turnNumber: true,
        actingSide: true,
        eventType: true,
        homeConfirmedAt: true,
        awayConfirmedAt: true,
      },
    })

    if (!event) {
      return reply.code(404).send({
        message: 'Match session event not found.',
      })
    }

    if (event.eventType !== 'CASUALTY') {
      return reply.code(409).send({
        message: 'Only casualty events can receive a casualty resolution.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (!session.participants.some((participant) => participant.userId === actorUser.id)) {
      return reply.code(403).send({
        message: 'Only claimed match participants can update a casualty result.',
      })
    }

    if (event.homeConfirmedAt && event.awayConfirmedAt) {
      return reply.code(409).send({
        message: 'Confirmed events are locked and cannot be changed.',
      })
    }

    await app.prisma.$transaction(async (transaction) => {
      await transaction.matchSessionCasualtyResolution.upsert({
        where: {
          matchSessionEventId: event.id,
        },
        create: {
          matchSessionId: event.matchSessionId,
          matchSessionEventId: event.id,
          resolutionType: bodyResult.data.resolutionType,
        },
        update: {
          resolutionType: bodyResult.data.resolutionType,
        },
      })

      await transaction.matchSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
          homeFinalSignoffAt: null,
          awayFinalSignoffAt: null,
          closedAt: null,
          progressionAppliedAt: null,
        },
      })
    })

    const updatedSession = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        events: {
          select: {
            id: true,
            teamSide: true,
            eventType: true,
            playerNumber: true,
            injuredTeamSide: true,
            injuredPlayerNumber: true,
          },
        },
        casualtyResolutions: {
          select: {
            matchSessionEventId: true,
            resolutionType: true,
          },
        },
        fixture: {
          include: {
            competition: {
              select: {
                type: true,
              },
            },
          },
        },
        homeTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
      },
    })

    if (!updatedSession) {
      return reply.code(500).send({
        message: 'Casualty resolution was saved but the updated room state could not be reloaded.',
      })
    }

    return reply.send({
      progression: buildMatchSessionProgressionSummary(updatedSession),
    })
  })

  app.post('/match-sessions/:sessionId/progression/apply', async (request, reply) => {
    const paramsResult = timerActionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        events: {
          select: {
            id: true,
            teamSide: true,
            eventType: true,
            playerNumber: true,
            injuredTeamSide: true,
            injuredPlayerNumber: true,
          },
        },
        casualtyResolutions: {
          select: {
            matchSessionEventId: true,
            resolutionType: true,
          },
        },
        fixture: {
          include: {
            competition: {
              select: {
                type: true,
              },
            },
          },
        },
        homeTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    const progression = buildMatchSessionProgressionSummary(session)

    if (!progression.applicable) {
      return reply.code(409).send({
        message: progression.reason ?? 'This match room does not support live team progression updates.',
      })
    }

    if (session.status !== MatchSessionStatus.CLOSED) {
      return reply.code(409).send({
        message: 'Final signoff must be completed before progression can be applied.',
      })
    }

    if (session.progressionAppliedAt) {
      return reply.send({
        progression,
      })
    }

    if (session.events.length === 0) {
      return reply.code(409).send({
        message: 'At least one match event is required before progression can be applied.',
      })
    }

    if (progression.unresolvedEvents.length > 0) {
      return reply.code(409).send({
        message: 'Resolve all progression-linked events before applying progression.',
        unresolvedEvents: progression.unresolvedEvents,
      })
    }

    const allPlayerUpdates = [...progression.homeTeam.players, ...progression.awayTeam.players]
    await app.prisma.$transaction(async (transaction) => {
      for (const player of allPlayerUpdates) {
        await transaction.teamPlayer.update({
          where: {
            id: player.playerId,
          },
          data: {
            spp: player.sppAfter,
            nigglingInjuries: player.nigglingInjuriesAfter,
            missNextGame: player.missNextGameAfter,
            playerStatus: player.isDeadAfter ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE,
            isDead: player.isDeadAfter,
            statAdjustments: player.statAdjustmentsAfter,
          },
        })
      }

      await transaction.matchSession.update({
        where: {
          id: session.id,
        },
        data: {
          progressionAppliedAt: new Date(),
        },
      })
    })

    const updatedSession = await app.prisma.matchSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        events: {
          select: {
            id: true,
            teamSide: true,
            eventType: true,
            playerNumber: true,
            injuredTeamSide: true,
            injuredPlayerNumber: true,
          },
        },
        casualtyResolutions: {
          select: {
            matchSessionEventId: true,
            resolutionType: true,
          },
        },
        fixture: {
          include: {
            competition: {
              select: {
                type: true,
              },
            },
          },
        },
        homeTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                shirtNumber: true,
                playerStatus: true,
                spp: true,
                nigglingInjuries: true,
                missNextGame: true,
                isDead: true,
                statAdjustments: true,
              },
            },
          },
        },
      },
    })

    if (!updatedSession) {
      return reply.code(500).send({
        message: 'Progression was applied but the updated room state could not be reloaded.',
      })
    }

    return reply.send({
      progression: buildMatchSessionProgressionSummary(updatedSession),
    })
  })

  app.post('/match-sessions/:sessionId/events', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)
    const bodyResult = createMatchSessionEventBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid match event payload.',
        issues: bodyResult.error.issues,
      })
    }

    if (typeof bodyResult.data.playerNumber !== 'number') {
      return reply.code(400).send({
        message: 'Match events must include a player number.',
      })
    }

    if (bodyResult.data.eventType === 'CASUALTY') {
      if (
        !bodyResult.data.injuredTeamSide ||
        typeof bodyResult.data.injuredPlayerNumber !== 'number' ||
        !bodyResult.data.casualtyResolutionType
      ) {
        return reply.code(400).send({
          message: 'Casualty events require an injured team, injured player number, and injury result.',
        })
      }
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
        homeTeam: {
          select: {
            players: {
              select: {
                shirtNumber: true,
                name: true,
                positionTemplateId: true,
                playerStatus: true,
                isDead: true,
              },
            },
          },
        },
        awayTeam: {
          select: {
            players: {
              select: {
                shirtNumber: true,
                name: true,
                positionTemplateId: true,
                playerStatus: true,
                isDead: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({
        message: 'Closed match sessions cannot be modified.',
      })
    }

    const participant = session.participants.find((entry) => entry.userId === actorUser.id)

    if (!participant) {
      return reply.code(403).send({
        message: 'Only claimed match participants can log events.',
      })
    }

    if (
      session.timerTurnPhase !== 'RUNNING' &&
      session.timerTurnPhase !== 'REVIEW'
    ) {
      return reply.code(409).send({
        message: 'Start the active turn clock before logging events for this turn.',
      })
    }

    const homePlayerMap = buildValidSessionPlayerMap(session.homeTeam)
    const awayPlayerMap = buildValidSessionPlayerMap(session.awayTeam)
    const actingTeamPlayerMap = bodyResult.data.teamSide === MatchSessionSide.HOME ? homePlayerMap : awayPlayerMap

    if (!actingTeamPlayerMap.has(bodyResult.data.playerNumber)) {
      return reply.code(400).send({
        message: 'Selected acting player does not exist on that team.',
      })
    }

    if (bodyResult.data.eventType === 'CASUALTY') {
      const injuredTeamPlayerMap =
        bodyResult.data.injuredTeamSide === MatchSessionSide.HOME ? homePlayerMap : awayPlayerMap

      if (!injuredTeamPlayerMap.has(bodyResult.data.injuredPlayerNumber!)) {
        return reply.code(400).send({
          message: 'Selected injured player does not exist on that team.',
        })
      }
    }

    const event = await app.prisma.$transaction(async (transaction) => {
      const createdEvent = await transaction.matchSessionEvent.create({
        data: {
          matchSessionId: session.id,
          half: session.timerCurrentHalf,
          turnNumber: session.timerCurrentTurnNumber,
          actingSide: session.timerActiveSide,
          teamSide: bodyResult.data.teamSide,
          injuredTeamSide:
            bodyResult.data.eventType === 'CASUALTY' ? bodyResult.data.injuredTeamSide ?? null : null,
          eventType: bodyResult.data.eventType,
          playerNumber: bodyResult.data.playerNumber ?? null,
          injuredPlayerNumber:
            bodyResult.data.eventType === 'CASUALTY' ? bodyResult.data.injuredPlayerNumber ?? null : null,
          notes: bodyResult.data.notes || null,
          homeConfirmedAt: null,
          awayConfirmedAt: null,
        },
      })

      if (bodyResult.data.eventType === 'CASUALTY' && bodyResult.data.casualtyResolutionType) {
        await transaction.matchSessionCasualtyResolution.create({
          data: {
            matchSessionId: session.id,
            matchSessionEventId: createdEvent.id,
            resolutionType: bodyResult.data.casualtyResolutionType,
          },
        })
      }

      await transaction.matchSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
          timerTurnPhase:
            session.timerTurnPhase === 'READY'
              ? 'REVIEW'
              : session.timerTurnPhase,
          homeFinalSignoffAt: null,
          awayFinalSignoffAt: null,
          closedAt: null,
          progressionAppliedAt: null,
        },
      })

      return createdEvent
    })

    return reply.code(201).send({
      event: toMatchSessionEventSummary(event),
    })
  })

  app.delete('/match-sessions/:sessionId/events/:eventId', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = matchSessionEventParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match event id.',
      })
    }

    const event = await app.prisma.matchSessionEvent.findFirst({
      where: {
        id: paramsResult.data.eventId,
        matchSessionId: paramsResult.data.sessionId,
      },
    })

    if (!event) {
      return reply.code(404).send({
        message: 'Match session event not found.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({
        message: 'Closed match sessions cannot be modified.',
      })
    }

    if (!session.participants.some((participant) => participant.userId === actorUser.id)) {
      return reply.code(403).send({
        message: 'Only claimed match participants can remove events.',
      })
    }

    if (event.homeConfirmedAt && event.awayConfirmedAt) {
      return reply.code(409).send({
        message: 'Confirmed events are locked and cannot be removed.',
      })
    }

    await app.prisma.$transaction(async (transaction) => {
      await transaction.matchSessionCasualtyResolution.deleteMany({
        where: {
          matchSessionEventId: event.id,
        },
      })

      await transaction.matchSessionEvent.delete({
        where: {
          id: event.id,
        },
      })

      await transaction.matchSession.update({
        where: {
          id: event.matchSessionId,
        },
        data: {
          status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
          homeFinalSignoffAt: null,
          awayFinalSignoffAt: null,
          closedAt: null,
          progressionAppliedAt: null,
        },
      })
    })

    return reply.code(204).send()
  })

  app.post('/match-sessions/:sessionId/events/:eventId/confirm', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = matchSessionEventParamsSchema.safeParse(request.params)
    const bodyResult = confirmEventBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({ message: 'Invalid match event id.' })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid event confirmation payload.',
        issues: bodyResult.error.issues,
      })
    }

    const event = await app.prisma.matchSessionEvent.findFirst({
      where: {
        id: paramsResult.data.eventId,
        matchSessionId: paramsResult.data.sessionId,
      },
    })

    if (!event) {
      return reply.code(404).send({
        message: 'Match session event not found.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({
        message: 'Closed match sessions cannot be modified.',
      })
    }

    const participant = session.participants.find((entry) => entry.userId === actorUser.id)

    if (!participant) {
      return reply.code(403).send({
        message: 'Only claimed match participants can confirm an event.',
      })
    }

    if (participant.side !== bodyResult.data.confirmedSide) {
      return reply.code(409).send({
        message: 'You can only confirm an event for your own assigned side.',
      })
    }

    if (
      (bodyResult.data.confirmedSide === MatchSessionSide.HOME && event.homeConfirmedAt) ||
      (bodyResult.data.confirmedSide === MatchSessionSide.AWAY && event.awayConfirmedAt)
    ) {
      return reply.send({
        event: toMatchSessionEventSummary(event),
      })
    }

    const updatedEvent = await app.prisma.$transaction(async (transaction) => {
      const nextEvent = await transaction.matchSessionEvent.update({
        where: {
          id: event.id,
        },
        data:
          bodyResult.data.confirmedSide === MatchSessionSide.HOME
            ? { homeConfirmedAt: new Date() }
            : { awayConfirmedAt: new Date() },
      })

      await transaction.matchSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
          homeFinalSignoffAt: null,
          awayFinalSignoffAt: null,
          closedAt: null,
          progressionAppliedAt: null,
        },
      })

      return nextEvent
    })

    return reply.send({
      event: toMatchSessionEventSummary(updatedEvent),
    })
  })

  app.post('/match-sessions/:sessionId/final-signoff', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)
    const bodyResult = finalSignoffBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid final signoff payload.',
        issues: bodyResult.error.issues,
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        events: true,
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (session.events.length === 0) {
      return reply.code(409).send({
        message: 'Log at least one match event before final signoff.',
      })
    }

    if (isTurnClockRunning(session) || session.timerTurnPhase === 'PAUSE_REQUESTED') {
      return reply.code(409).send({
        message: 'Resolve the active turn before final signoff.',
      })
    }

    const participant = session.participants.find((entry) => entry.userId === actorUser.id)

    if (!participant) {
      return reply.code(403).send({
        message: 'Only claimed match participants can sign off the match.',
      })
    }

    if (participant.side !== bodyResult.data.signedOffSide) {
      return reply.code(409).send({
        message: 'You can only sign off the match for your own assigned side.',
      })
    }

    const hasUnconfirmedEvents = session.events.some(
      (event) => !event.homeConfirmedAt || !event.awayConfirmedAt,
    )

    if (hasUnconfirmedEvents) {
      return reply.code(409).send({
        message: 'All logged events must be confirmed by both sides before final signoff.',
      })
    }

    const now = new Date()
    const updatedSession = await app.prisma.matchSession.update({
      where: {
        id: session.id,
      },
      data:
        bodyResult.data.signedOffSide === MatchSessionSide.HOME
          ? {
              homeFinalSignoffAt: now,
              status: session.awayFinalSignoffAt ? MatchSessionStatus.CLOSED : session.status,
              closedAt: session.awayFinalSignoffAt ? now : null,
            }
          : {
              awayFinalSignoffAt: now,
              status: session.homeFinalSignoffAt ? MatchSessionStatus.CLOSED : session.status,
              closedAt: session.homeFinalSignoffAt ? now : null,
            },
      select: {
        status: true,
        homeFinalSignoffAt: true,
        awayFinalSignoffAt: true,
        closedAt: true,
      },
    })

    return reply.send({
      signoff: toFinalSignoffSummary({
        status: updatedSession.status,
        homeFinalSignoffAt: updatedSession.homeFinalSignoffAt,
        awayFinalSignoffAt: updatedSession.awayFinalSignoffAt,
        closedAt: updatedSession.closedAt,
        events: session.events,
      }),
    })
  })

  app.get('/match-sessions/:sessionId/timer', async (request, reply) => {
    const paramsResult = timerActionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      select: {
        id: true,
        status: true,
        timerEnabled: true,
        timerTurnSeconds: true,
        timerBankSeconds: true,
        timerBankResetsAtHalf: true,
        timerCurrentHalf: true,
        timerCurrentTurnNumber: true,
        timerActiveSide: true,
        timerTurnPhase: true,
        timerTurnRemainingSeconds: true,
        timerTurnStartedAt: true,
        timerHomeBankRemainingSeconds: true,
        timerAwayBankRemainingSeconds: true,
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    return reply.send({
      timer: toTimerStateSummary(session),
    })
  })

  app.post('/match-sessions/:sessionId/timer/start', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)
    const bodyResult = startTimerBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid timer start payload.',
        issues: bodyResult.error.issues,
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({
        message: 'Closed match sessions cannot be modified.',
      })
    }

    if (session.participants.length < 2) {
      return reply.code(409).send({
        message: 'Both sides must claim the match room before the clock can start.',
      })
    }

    if (!session.participants.some((participant) => participant.userId === actorUser.id)) {
      return reply.code(403).send({
        message: 'Only claimed match participants can start the turn clock.',
      })
    }

    if (session.timerTurnPhase === 'RUNNING') {
      return reply.code(409).send({
        message: 'The active turn clock is already running.',
      })
    }

    if (session.timerTurnPhase === 'PAUSE_REQUESTED') {
      return reply.code(409).send({
        message: 'The opponent must confirm the pause request before the clock can be resumed.',
      })
    }

    const turnSeconds = session.timerTurnSeconds ?? getDefaultTimerConfig().perTurnSeconds
    const currentTurnEvents =
      session.timerTurnPhase === 'REVIEW'
        ? await app.prisma.matchSessionEvent.findMany({
            where: {
              matchSessionId: session.id,
              half: session.timerCurrentHalf,
              turnNumber: session.timerCurrentTurnNumber,
              actingSide: session.timerActiveSide,
            },
            select: {
              homeConfirmedAt: true,
              awayConfirmedAt: true,
            },
          })
        : []

    if (
      session.timerTurnPhase === 'REVIEW' &&
      !areAllTurnEventsConfirmed(currentTurnEvents)
    ) {
      return reply.code(409).send({
        message: 'All logged events for the ended turn must be confirmed before the next turn can start.',
      })
    }

    const requiresManualOpeningSideChoice =
      session.timerTurnPhase === 'READY' && session.timerCurrentTurnNumber === 1
    const nextTurnPosition =
      session.timerTurnPhase === 'REVIEW' && !isCompletedFinalTurnOfHalf(session)
        ? getNextTurnPosition(session.timerActiveSide, session.timerCurrentTurnNumber)
        : null
    const participant = session.participants.find((entry) => entry.userId === actorUser.id)
    const requiredStartingSide =
      requiresManualOpeningSideChoice
        ? bodyResult.data.side ?? null
        : session.timerTurnPhase === 'REVIEW'
        ? nextTurnPosition?.nextActiveSide ?? session.timerActiveSide
        : session.timerActiveSide

    if (requiresManualOpeningSideChoice && !bodyResult.data.side) {
      return reply.code(400).send({
        message: 'Choose which side starts turn 1 before starting the clock.',
      })
    }

    if (
      session.timerTurnPhase === 'REVIEW' &&
      isCompletedFinalTurnOfHalf(session)
    ) {
      return reply.code(session.timerCurrentHalf >= 2 ? 409 : 409).send({
        message:
          session.timerCurrentHalf >= 2
            ? 'Turn 8 for the second side ends the half. Do not start turn 9; continue to final signoff.'
            : 'Turn 8 for the second side ends the half. Press Next half before starting the clock again.',
      })
    }

    if (!participant || participant.side !== requiredStartingSide) {
      return reply.code(403).send({
        message: 'Only the side about to take the turn can start or resume its turn clock.',
      })
    }

    if (bodyResult.data.side && bodyResult.data.side !== requiredStartingSide) {
      return reply.code(409).send({
        message: 'The side for this turn is fixed by the room state and cannot be changed here.',
      })
    }

    const updatedSession = await app.prisma.matchSession.update({
      where: {
        id: session.id,
      },
      data: {
        timerEnabled: true,
        status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
        timerTurnSeconds: turnSeconds,
        timerBankSeconds: session.timerBankSeconds ?? getDefaultTimerConfig().bankSeconds,
        timerHomeBankRemainingSeconds:
          session.timerHomeBankRemainingSeconds ?? session.timerBankSeconds ?? getDefaultTimerConfig().bankSeconds,
        timerAwayBankRemainingSeconds:
          session.timerAwayBankRemainingSeconds ?? session.timerBankSeconds ?? getDefaultTimerConfig().bankSeconds,
        timerActiveSide: requiredStartingSide ?? nextTurnPosition?.nextActiveSide ?? session.timerActiveSide,
        timerCurrentTurnNumber: nextTurnPosition?.nextTurnNumber ?? session.timerCurrentTurnNumber,
        timerTurnPhase: 'RUNNING',
        timerTurnRemainingSeconds:
          session.timerTurnPhase === 'PAUSED'
            ? session.timerTurnRemainingSeconds ?? turnSeconds
            : turnSeconds,
        timerTurnStartedAt: new Date(),
        homeFinalSignoffAt: null,
        awayFinalSignoffAt: null,
        closedAt: null,
        progressionAppliedAt: null,
      },
      select: {
        id: true,
        status: true,
        timerEnabled: true,
        timerTurnSeconds: true,
        timerBankSeconds: true,
        timerBankResetsAtHalf: true,
        timerCurrentHalf: true,
        timerCurrentTurnNumber: true,
        timerActiveSide: true,
        timerTurnPhase: true,
        timerTurnRemainingSeconds: true,
        timerTurnStartedAt: true,
        timerHomeBankRemainingSeconds: true,
        timerAwayBankRemainingSeconds: true,
        homeFinalSignoffAt: true,
        awayFinalSignoffAt: true,
        closedAt: true,
      },
    })

    return reply.send({
      timer: toTimerStateSummary(updatedSession),
    })
  })

  app.post('/match-sessions/:sessionId/timer/pause-request', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)
    const bodyResult = pauseTimerBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({ message: 'Invalid match session id.' })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid pause request payload.',
        issues: bodyResult.error.issues,
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: { id: paramsResult.data.sessionId },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({ message: 'Match session not found.' })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({ message: 'Closed match sessions cannot be modified.' })
    }

    const participant = session.participants.find((entry) => entry.userId === actorUser.id)

    if (!participant || participant.side !== session.timerActiveSide) {
      return reply.code(403).send({
        message: 'Only the active team can request a pause.',
      })
    }

    if (bodyResult.data.requestedSide !== session.timerActiveSide) {
      return reply.code(409).send({
        message: 'Pause requests must come from the active side.',
      })
    }

    if (!isTurnClockRunning(session)) {
      return reply.code(409).send({
        message: 'The turn clock must be running before it can be paused.',
      })
    }

    const defaults = getDefaultTimerConfig()
    const turnSeconds = session.timerTurnSeconds ?? defaults.perTurnSeconds
    const storedTurnRemainingSeconds = session.timerTurnRemainingSeconds ?? turnSeconds
    const baseBankSeconds = session.timerBankSeconds ?? defaults.bankSeconds
    const homeBankRemainingSeconds = session.timerHomeBankRemainingSeconds ?? baseBankSeconds
    const awayBankRemainingSeconds = session.timerAwayBankRemainingSeconds ?? baseBankSeconds
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - session.timerTurnStartedAt!.getTime()) / 1000))
    const overtimeSeconds = Math.max(0, elapsedSeconds - storedTurnRemainingSeconds)
    const nextTurnRemainingSeconds = clampNonNegative(storedTurnRemainingSeconds - elapsedSeconds)
    const nextHomeBankRemainingSeconds =
      session.timerActiveSide === MatchSessionSide.HOME
        ? clampNonNegative(homeBankRemainingSeconds - overtimeSeconds)
        : homeBankRemainingSeconds
    const nextAwayBankRemainingSeconds =
      session.timerActiveSide === MatchSessionSide.AWAY
        ? clampNonNegative(awayBankRemainingSeconds - overtimeSeconds)
        : awayBankRemainingSeconds

    const updatedSession = await app.prisma.matchSession.update({
      where: { id: session.id },
      data: {
        status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
        timerTurnPhase: 'PAUSE_REQUESTED',
        timerTurnRemainingSeconds: nextTurnRemainingSeconds,
        timerTurnStartedAt: null,
        timerHomeBankRemainingSeconds: nextHomeBankRemainingSeconds,
        timerAwayBankRemainingSeconds: nextAwayBankRemainingSeconds,
        homeFinalSignoffAt: null,
        awayFinalSignoffAt: null,
        closedAt: null,
        progressionAppliedAt: null,
      },
      select: {
        id: true,
        status: true,
        timerEnabled: true,
        timerTurnSeconds: true,
        timerBankSeconds: true,
        timerBankResetsAtHalf: true,
        timerCurrentHalf: true,
        timerCurrentTurnNumber: true,
        timerActiveSide: true,
        timerTurnPhase: true,
        timerTurnRemainingSeconds: true,
        timerTurnStartedAt: true,
        timerHomeBankRemainingSeconds: true,
        timerAwayBankRemainingSeconds: true,
        homeFinalSignoffAt: true,
        awayFinalSignoffAt: true,
        closedAt: true,
      },
    })

    return reply.send({
      timer: toTimerStateSummary(updatedSession),
    })
  })

  app.post('/match-sessions/:sessionId/timer/confirm-pause', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)
    const bodyResult = confirmPauseBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({ message: 'Invalid match session id.' })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid pause confirmation payload.',
        issues: bodyResult.error.issues,
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: { id: paramsResult.data.sessionId },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({ message: 'Match session not found.' })
    }

    const participant = session.participants.find((entry) => entry.userId === actorUser.id)

    if (!participant || participant.side === session.timerActiveSide) {
      return reply.code(403).send({
        message: 'Only the non-active side can confirm a pause request.',
      })
    }

    if (participant.side !== bodyResult.data.confirmedSide) {
      return reply.code(409).send({
        message: 'You can only confirm the pause for your own side.',
      })
    }

    if (session.timerTurnPhase !== 'PAUSE_REQUESTED') {
      return reply.code(409).send({
        message: 'There is no pending pause request to confirm.',
      })
    }

    const updatedSession = await app.prisma.matchSession.update({
      where: { id: session.id },
      data: {
        timerTurnPhase: 'PAUSED',
      },
      select: {
        id: true,
        status: true,
        timerEnabled: true,
        timerTurnSeconds: true,
        timerBankSeconds: true,
        timerBankResetsAtHalf: true,
        timerCurrentHalf: true,
        timerCurrentTurnNumber: true,
        timerActiveSide: true,
        timerTurnPhase: true,
        timerTurnRemainingSeconds: true,
        timerTurnStartedAt: true,
        timerHomeBankRemainingSeconds: true,
        timerAwayBankRemainingSeconds: true,
        homeFinalSignoffAt: true,
        awayFinalSignoffAt: true,
        closedAt: true,
      },
    })

    return reply.send({
      timer: toTimerStateSummary(updatedSession),
    })
  })

  app.post('/match-sessions/:sessionId/timer/end-turn', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({
        message: 'Closed match sessions cannot be modified.',
      })
    }

    const participant = session.participants.find((entry) => entry.userId === actorUser.id)

    if (!participant || participant.side !== session.timerActiveSide) {
      return reply.code(403).send({
        message: 'Only the active team can end its turn.',
      })
    }

    if (!isTurnClockRunning(session)) {
      return reply.code(409).send({
        message: 'The active turn clock is not running.',
      })
    }

    const defaults = getDefaultTimerConfig()
    const turnSeconds = session.timerTurnSeconds ?? defaults.perTurnSeconds
    const storedTurnRemainingSeconds = session.timerTurnRemainingSeconds ?? turnSeconds
    const baseBankSeconds = session.timerBankSeconds ?? defaults.bankSeconds
    const homeBankRemainingSeconds = session.timerHomeBankRemainingSeconds ?? baseBankSeconds
    const awayBankRemainingSeconds = session.timerAwayBankRemainingSeconds ?? baseBankSeconds
    const elapsedSeconds = session.timerTurnStartedAt
      ? Math.max(0, Math.floor((Date.now() - session.timerTurnStartedAt.getTime()) / 1000))
      : 0
    const overtimeSeconds = session.timerTurnStartedAt
      ? Math.max(0, elapsedSeconds - storedTurnRemainingSeconds)
      : 0
    const nextTurnRemainingSeconds = clampNonNegative(storedTurnRemainingSeconds - elapsedSeconds)

    const nextHomeBankRemainingSeconds =
      session.timerActiveSide === MatchSessionSide.HOME
        ? clampNonNegative(homeBankRemainingSeconds - overtimeSeconds)
        : homeBankRemainingSeconds
    const nextAwayBankRemainingSeconds =
      session.timerActiveSide === MatchSessionSide.AWAY
        ? clampNonNegative(awayBankRemainingSeconds - overtimeSeconds)
        : awayBankRemainingSeconds

    const updatedSession = await app.prisma.matchSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
        timerHomeBankRemainingSeconds: nextHomeBankRemainingSeconds,
        timerAwayBankRemainingSeconds: nextAwayBankRemainingSeconds,
        timerTurnPhase: 'REVIEW',
        timerTurnRemainingSeconds: nextTurnRemainingSeconds,
        timerTurnStartedAt: null,
        homeFinalSignoffAt: null,
        awayFinalSignoffAt: null,
        closedAt: null,
        progressionAppliedAt: null,
      },
      select: {
        id: true,
        status: true,
        timerEnabled: true,
        timerTurnSeconds: true,
        timerBankSeconds: true,
        timerBankResetsAtHalf: true,
        timerCurrentHalf: true,
        timerCurrentTurnNumber: true,
        timerActiveSide: true,
        timerTurnPhase: true,
        timerTurnRemainingSeconds: true,
        timerTurnStartedAt: true,
        timerHomeBankRemainingSeconds: true,
        timerAwayBankRemainingSeconds: true,
        homeFinalSignoffAt: true,
        awayFinalSignoffAt: true,
        closedAt: true,
      },
    })

    return reply.send({
      timer: toTimerStateSummary(updatedSession),
    })
  })

  app.post('/match-sessions/:sessionId/timer/reset-half', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const paramsResult = timerActionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid match session id.',
      })
    }

    const session = await app.prisma.matchSession.findUnique({
      where: {
        id: paramsResult.data.sessionId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            side: true,
          },
        },
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    if (isClosedMatchSession(session)) {
      return reply.code(409).send({
        message: 'Closed match sessions cannot be modified.',
      })
    }

    if (!session.participants.some((participant) => participant.userId === actorUser.id)) {
      return reply.code(403).send({
        message: 'Only claimed match participants can advance the half.',
      })
    }

    if (isTurnClockRunning(session) || session.timerTurnPhase === 'PAUSE_REQUESTED') {
      return reply.code(409).send({
        message: 'End or resolve the active turn before advancing the half.',
      })
    }

    if (session.timerCurrentHalf >= 2) {
      return reply.code(409).send({
        message: 'The second half is already active. Further half advancement is not allowed.',
      })
    }

    if (
      session.timerCurrentTurnNumber < 8 ||
      (session.timerCurrentTurnNumber === 8 && session.timerActiveSide !== MatchSessionSide.AWAY)
    ) {
      return reply.code(409).send({
        message: 'The first half can only advance after turn 8 has been completed.',
      })
    }

    if (session.timerTurnPhase === 'REVIEW') {
      const reviewEvents = await app.prisma.matchSessionEvent.findMany({
        where: {
          matchSessionId: session.id,
          half: session.timerCurrentHalf,
          turnNumber: session.timerCurrentTurnNumber,
          actingSide: session.timerActiveSide,
        },
        select: {
          homeConfirmedAt: true,
          awayConfirmedAt: true,
        },
      })

      if (!areAllTurnEventsConfirmed(reviewEvents)) {
        return reply.code(409).send({
          message: 'All logged events for the ended turn must be confirmed before the next half can begin.',
        })
      }
    }

    const baseBankSeconds = session.timerBankSeconds ?? getDefaultTimerConfig().bankSeconds
    const turnSeconds = session.timerTurnSeconds ?? getDefaultTimerConfig().perTurnSeconds
    const updatedSession = await app.prisma.matchSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: session.status === MatchSessionStatus.CLOSED ? MatchSessionStatus.PENDING : session.status,
        timerCurrentHalf: session.timerCurrentHalf + 1,
        timerCurrentTurnNumber: 1,
        timerActiveSide: session.timerActiveSide,
        timerTurnPhase: 'READY',
        timerTurnRemainingSeconds: turnSeconds,
        timerTurnStartedAt: null,
        timerHomeBankRemainingSeconds: session.timerBankResetsAtHalf
          ? baseBankSeconds
          : session.timerHomeBankRemainingSeconds ?? baseBankSeconds,
        timerAwayBankRemainingSeconds: session.timerBankResetsAtHalf
          ? baseBankSeconds
          : session.timerAwayBankRemainingSeconds ?? baseBankSeconds,
        homeFinalSignoffAt: null,
        awayFinalSignoffAt: null,
        closedAt: null,
        progressionAppliedAt: null,
      },
      select: {
        id: true,
        status: true,
        timerEnabled: true,
        timerTurnSeconds: true,
        timerBankSeconds: true,
        timerBankResetsAtHalf: true,
        timerCurrentHalf: true,
        timerCurrentTurnNumber: true,
        timerActiveSide: true,
        timerTurnPhase: true,
        timerTurnRemainingSeconds: true,
        timerTurnStartedAt: true,
        timerHomeBankRemainingSeconds: true,
        timerAwayBankRemainingSeconds: true,
        homeFinalSignoffAt: true,
        awayFinalSignoffAt: true,
        closedAt: true,
      },
    })

    return reply.send({
      timer: toTimerStateSummary(updatedSession),
    })
  })
}
