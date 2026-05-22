import { TeamPlayerStatus, TeamStatus } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const statAdjustmentsSchema = z.object({
  movement: z.number().int().optional(),
  strength: z.number().int().optional(),
  agility: z.number().int().optional(),
  passing: z.number().int().optional(),
  armour: z.number().int().optional(),
})

const savedTeamPlayerSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  positionTemplateId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  shirtNumber: z.number().int().nullable(),
  playerStatus: z.nativeEnum(TeamPlayerStatus).optional(),
  currentValue: z.number().int().nonnegative(),
  spp: z.number().int().nonnegative(),
  nigglingInjuries: z.number().int().nonnegative(),
  missNextGame: z.boolean().optional(),
  isDead: z.boolean().optional(),
  extraSkills: z.array(z.string().trim().min(1)),
  statAdjustments: statAdjustmentsSchema,
})

const savedTeamSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  leagueId: z.string().min(1).nullable().optional(),
  rosterTemplateId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  status: z.nativeEnum(TeamStatus),
  draftBudget: z.number().int().nonnegative(),
  rerollCount: z.number().int().nonnegative(),
  assistantCoachCount: z.number().int().nonnegative(),
  cheerleaderCount: z.number().int().nonnegative(),
  dedicatedFans: z.number().int().min(0).max(7),
  apothecaryPurchased: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  players: z.array(savedTeamPlayerSchema),
})

const teamParamsSchema = z.object({
  teamId: z.string().min(1),
})

const listTeamsQuerySchema = z.object({
  ownerUserId: z.string().min(1).optional(),
  leagueId: z.string().min(1).optional(),
})

function toIsoString(value: Date) {
  return value.toISOString()
}

function isRosterOrderLocked(status: TeamStatus) {
  return status !== TeamStatus.DRAFT
}

function normalizePersistedPlayers(
  status: TeamStatus,
  players: z.infer<typeof savedTeamPlayerSchema>[],
) {
  const usedNumbers = new Set<number>()

  return players.map((player) => {
    const playerStatus = player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE)

    if (!isRosterOrderLocked(status) || playerStatus !== TeamPlayerStatus.ACTIVE) {
      return {
        ...player,
        playerStatus,
      }
    }

    if (
      typeof player.shirtNumber === 'number' &&
      player.shirtNumber > 0 &&
      !usedNumbers.has(player.shirtNumber)
    ) {
      usedNumbers.add(player.shirtNumber)
      return {
        ...player,
        playerStatus,
      }
    }

    let nextNumber = 1

    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1
    }

    usedNumbers.add(nextNumber)

    return {
      ...player,
      playerStatus,
      shirtNumber: nextNumber,
    }
  })
}

function toSavedTeam(playerTeam: {
  id: string
  ownerUserId: string
  leagueId: string | null
  rosterTemplateId: string
  name: string
  status: TeamStatus
  draftBudget: number
  rerollCount: number
  assistantCoachCount: number
  cheerleaderCount: number
  dedicatedFans: number
  apothecaryPurchased: boolean
  createdAt: Date
  updatedAt: Date
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
  const normalizedPlayers = normalizePersistedPlayers(
    playerTeam.status,
    playerTeam.players.map((player) => ({
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
  )

  return {
    id: playerTeam.id,
    ownerUserId: playerTeam.ownerUserId,
    leagueId: playerTeam.leagueId,
    rosterTemplateId: playerTeam.rosterTemplateId,
    name: playerTeam.name,
    status: playerTeam.status,
    draftBudget: playerTeam.draftBudget,
    rerollCount: playerTeam.rerollCount,
    assistantCoachCount: playerTeam.assistantCoachCount,
    cheerleaderCount: playerTeam.cheerleaderCount,
    dedicatedFans: playerTeam.dedicatedFans,
    apothecaryPurchased: playerTeam.apothecaryPurchased,
    createdAt: toIsoString(playerTeam.createdAt),
    updatedAt: toIsoString(playerTeam.updatedAt),
    players: normalizedPlayers,
  }
}

function toSavedTeamSummary(team: {
  id: string
  rosterTemplateId: string
  name: string
  status: TeamStatus
  updatedAt: Date
  players: Array<{ currentValue: number; playerStatus: TeamPlayerStatus }>
}) {
  const activePlayers = team.players.filter((player) => player.playerStatus === TeamPlayerStatus.ACTIVE)
  const totalValue = activePlayers.reduce((sum, player) => sum + player.currentValue, 0)

  return {
    id: team.id,
    rosterTemplateId: team.rosterTemplateId,
    name: team.name,
    status: team.status,
    playerCount: activePlayers.length,
    totalValue,
    updatedAt: toIsoString(team.updatedAt),
  }
}

async function validateTeamRelations(app: FastifyInstance, team: z.infer<typeof savedTeamSchema>) {
  const [owner, league] = await Promise.all([
    app.prisma.user.findUnique({
      where: {
        id: team.ownerUserId,
      },
    }),
    team.leagueId
      ? app.prisma.league.findUnique({
          where: {
            id: team.leagueId,
          },
        })
      : Promise.resolve(null),
  ])

  if (!owner) {
    return {
      statusCode: 404,
      payload: {
        message: 'Owner user not found.',
      },
    }
  }

  if (team.leagueId && !league) {
    return {
      statusCode: 404,
      payload: {
        message: 'League not found.',
      },
    }
  }

  if (team.leagueId) {
    const membership = await app.prisma.leagueMembership.findUnique({
      where: {
        leagueId_userId: {
          leagueId: team.leagueId,
          userId: team.ownerUserId,
        },
      },
    })

    if (!membership) {
      return {
        statusCode: 409,
        payload: {
          message: 'Team owner must be a member of the linked league.',
        },
      }
    }
  }

  return null
}

export async function registerTeamRoutes(app: FastifyInstance) {
  app.get('/teams', async (request, reply) => {
    const queryResult = listTeamsQuerySchema.safeParse(request.query)

    if (!queryResult.success) {
      return reply.code(400).send({
        message: 'Invalid team filter query.',
        issues: queryResult.error.issues,
      })
    }

    const teams = await app.prisma.team.findMany({
      where: {
        ownerUserId: queryResult.data.ownerUserId,
        leagueId: queryResult.data.leagueId,
      },
      include: {
        players: {
          select: {
            currentValue: true,
            playerStatus: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return reply.send({
      teams: teams.map(toSavedTeamSummary),
    })
  })

  app.get('/teams/:teamId', async (request, reply) => {
    const paramsResult = teamParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid team id.',
      })
    }

    const team = await app.prisma.team.findUnique({
      where: {
        id: paramsResult.data.teamId,
      },
      include: {
        players: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    })

    if (!team) {
      return reply.code(404).send({
        message: 'Team not found.',
      })
    }

    return reply.send({
      team: toSavedTeam(team),
    })
  })

  app.post('/teams', async (request, reply) => {
    const bodyResult = savedTeamSchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid team payload.',
        issues: bodyResult.error.issues,
      })
    }

    const normalizedTeam = {
      ...bodyResult.data,
      players: normalizePersistedPlayers(bodyResult.data.status, bodyResult.data.players),
    }

    const relationError = await validateTeamRelations(app, normalizedTeam)

    if (relationError) {
      return reply.code(relationError.statusCode).send(relationError.payload)
    }

    const existingTeam = await app.prisma.team.findUnique({
      where: {
        id: bodyResult.data.id,
      },
    })

    if (existingTeam) {
      return reply.code(409).send({
        message: 'Team already exists.',
      })
    }

    const team = await app.prisma.team.create({
      data: {
        id: bodyResult.data.id,
        ownerUserId: normalizedTeam.ownerUserId,
        leagueId: normalizedTeam.leagueId ?? null,
        rosterTemplateId: normalizedTeam.rosterTemplateId,
        name: normalizedTeam.name,
        status: normalizedTeam.status,
        draftBudget: normalizedTeam.draftBudget,
        rerollCount: normalizedTeam.rerollCount,
        assistantCoachCount: normalizedTeam.assistantCoachCount,
        cheerleaderCount: normalizedTeam.cheerleaderCount,
        dedicatedFans: normalizedTeam.dedicatedFans,
        apothecaryPurchased: normalizedTeam.apothecaryPurchased,
        createdAt: new Date(normalizedTeam.createdAt),
        updatedAt: new Date(normalizedTeam.updatedAt),
        players: {
          create: normalizedTeam.players.map((player, index) => ({
            id: player.id,
            positionTemplateId: player.positionTemplateId,
            name: player.name,
            shirtNumber: player.shirtNumber,
            playerStatus: player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE),
            currentValue: player.currentValue,
            spp: player.spp,
            nigglingInjuries: player.nigglingInjuries,
            missNextGame: player.missNextGame ?? false,
            isDead:
              (player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE)) ===
              TeamPlayerStatus.DEAD,
            extraSkills: player.extraSkills,
            statAdjustments: player.statAdjustments,
            displayOrder: index,
          })),
        },
      },
      include: {
        players: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    })

    return reply.code(201).send({
      team: toSavedTeam(team),
    })
  })

  app.put('/teams/:teamId', async (request, reply) => {
    const paramsResult = teamParamsSchema.safeParse(request.params)
    const bodyResult = savedTeamSchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid team id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid team payload.',
        issues: bodyResult.error.issues,
      })
    }

    if (paramsResult.data.teamId !== bodyResult.data.id) {
      return reply.code(400).send({
        message: 'Team id in path and payload must match.',
      })
    }

    const existingTeam = await app.prisma.team.findUnique({
      where: {
        id: paramsResult.data.teamId,
      },
    })

    if (!existingTeam) {
      return reply.code(404).send({
        message: 'Team not found.',
      })
    }

    const normalizedTeam = {
      ...bodyResult.data,
      players: normalizePersistedPlayers(bodyResult.data.status, bodyResult.data.players),
    }

    const relationError = await validateTeamRelations(app, normalizedTeam)

    if (relationError) {
      return reply.code(relationError.statusCode).send(relationError.payload)
    }

    const team = await app.prisma.$transaction(async (transaction) => {
      await transaction.teamPlayer.deleteMany({
        where: {
          teamId: paramsResult.data.teamId,
        },
      })

      return transaction.team.update({
        where: {
          id: paramsResult.data.teamId,
        },
        data: {
          ownerUserId: normalizedTeam.ownerUserId,
          leagueId: normalizedTeam.leagueId ?? null,
          rosterTemplateId: normalizedTeam.rosterTemplateId,
          name: normalizedTeam.name,
          status: normalizedTeam.status,
          draftBudget: normalizedTeam.draftBudget,
          rerollCount: normalizedTeam.rerollCount,
          assistantCoachCount: normalizedTeam.assistantCoachCount,
          cheerleaderCount: normalizedTeam.cheerleaderCount,
          dedicatedFans: normalizedTeam.dedicatedFans,
          apothecaryPurchased: normalizedTeam.apothecaryPurchased,
          createdAt: new Date(normalizedTeam.createdAt),
          updatedAt: new Date(normalizedTeam.updatedAt),
          players: {
            create: normalizedTeam.players.map((player, index) => ({
              id: player.id,
              positionTemplateId: player.positionTemplateId,
              name: player.name,
              shirtNumber: player.shirtNumber,
              playerStatus: player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE),
              currentValue: player.currentValue,
              spp: player.spp,
              nigglingInjuries: player.nigglingInjuries,
              missNextGame: player.missNextGame ?? false,
              isDead:
                (player.playerStatus ?? (player.isDead ? TeamPlayerStatus.DEAD : TeamPlayerStatus.ACTIVE)) ===
                TeamPlayerStatus.DEAD,
              extraSkills: player.extraSkills,
              statAdjustments: player.statAdjustments,
              displayOrder: index,
            })),
          },
        },
        include: {
          players: {
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      })
    })

    return reply.send({
      team: toSavedTeam(team),
    })
  })

  app.delete('/teams/:teamId', async (request, reply) => {
    const paramsResult = teamParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid team id.',
      })
    }

    const existingTeam = await app.prisma.team.findUnique({
      where: {
        id: paramsResult.data.teamId,
      },
      include: {
        homeSessions: {
          select: {
            id: true,
          },
          take: 1,
        },
        awaySessions: {
          select: {
            id: true,
          },
          take: 1,
        },
        sessionParticipants: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    })

    if (!existingTeam) {
      return reply.code(404).send({
        message: 'Team not found.',
      })
    }

    if (
      existingTeam.homeSessions.length > 0 ||
      existingTeam.awaySessions.length > 0 ||
      existingTeam.sessionParticipants.length > 0
    ) {
      return reply.code(409).send({
        message: 'Team cannot be deleted while linked to a match session.',
      })
    }

    await app.prisma.$transaction(async (transaction) => {
      await transaction.teamPlayer.deleteMany({
        where: {
          teamId: paramsResult.data.teamId,
        },
      })

      await transaction.team.delete({
        where: {
          id: paramsResult.data.teamId,
        },
      })
    })

    return reply.code(204).send()
  })
}
