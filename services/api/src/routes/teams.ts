import { TeamStatus } from '@prisma/client'
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
  currentValue: z.number().int().nonnegative(),
  spp: z.number().int().nonnegative(),
  nigglingInjuries: z.number().int().nonnegative(),
  missNextGame: z.boolean().optional(),
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
    currentValue: number
    spp: number
    nigglingInjuries: number
    missNextGame?: boolean
    extraSkills: string[]
    statAdjustments: unknown
  }>
}) {
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
    players: playerTeam.players.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      positionTemplateId: player.positionTemplateId,
      name: player.name,
      shirtNumber: player.shirtNumber,
      currentValue: player.currentValue,
      spp: player.spp,
      nigglingInjuries: player.nigglingInjuries,
      missNextGame: player.missNextGame ?? false,
      extraSkills: player.extraSkills,
      statAdjustments: statAdjustmentsSchema.parse(player.statAdjustments),
    })),
  }
}

function toSavedTeamSummary(team: {
  id: string
  rosterTemplateId: string
  name: string
  status: TeamStatus
  updatedAt: Date
  players: Array<{ currentValue: number }>
}) {
  const totalValue = team.players.reduce((sum, player) => sum + player.currentValue, 0)

  return {
    id: team.id,
    rosterTemplateId: team.rosterTemplateId,
    name: team.name,
    status: team.status,
    playerCount: team.players.length,
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

    const relationError = await validateTeamRelations(app, bodyResult.data)

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
        ownerUserId: bodyResult.data.ownerUserId,
        leagueId: bodyResult.data.leagueId ?? null,
        rosterTemplateId: bodyResult.data.rosterTemplateId,
        name: bodyResult.data.name,
        status: bodyResult.data.status,
        draftBudget: bodyResult.data.draftBudget,
        rerollCount: bodyResult.data.rerollCount,
        assistantCoachCount: bodyResult.data.assistantCoachCount,
        cheerleaderCount: bodyResult.data.cheerleaderCount,
        dedicatedFans: bodyResult.data.dedicatedFans,
        apothecaryPurchased: bodyResult.data.apothecaryPurchased,
        createdAt: new Date(bodyResult.data.createdAt),
        updatedAt: new Date(bodyResult.data.updatedAt),
        players: {
          create: bodyResult.data.players.map((player, index) => ({
            id: player.id,
            positionTemplateId: player.positionTemplateId,
            name: player.name,
            shirtNumber: player.shirtNumber,
            currentValue: player.currentValue,
            spp: player.spp,
            nigglingInjuries: player.nigglingInjuries,
            missNextGame: player.missNextGame ?? false,
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

    const relationError = await validateTeamRelations(app, bodyResult.data)

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
          ownerUserId: bodyResult.data.ownerUserId,
          leagueId: bodyResult.data.leagueId ?? null,
          rosterTemplateId: bodyResult.data.rosterTemplateId,
          name: bodyResult.data.name,
          status: bodyResult.data.status,
          draftBudget: bodyResult.data.draftBudget,
          rerollCount: bodyResult.data.rerollCount,
          assistantCoachCount: bodyResult.data.assistantCoachCount,
          cheerleaderCount: bodyResult.data.cheerleaderCount,
          dedicatedFans: bodyResult.data.dedicatedFans,
          apothecaryPurchased: bodyResult.data.apothecaryPurchased,
          createdAt: new Date(bodyResult.data.createdAt),
          updatedAt: new Date(bodyResult.data.updatedAt),
          players: {
            create: bodyResult.data.players.map((player, index) => ({
              id: player.id,
              positionTemplateId: player.positionTemplateId,
              name: player.name,
              shirtNumber: player.shirtNumber,
              currentValue: player.currentValue,
              spp: player.spp,
              nigglingInjuries: player.nigglingInjuries,
              missNextGame: player.missNextGame ?? false,
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
