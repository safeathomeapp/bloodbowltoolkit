import { randomBytes } from 'node:crypto'
import {
  MatchSessionSide,
  MatchSessionStatus,
  TeamStatus,
} from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const statAdjustmentsSchema = z.object({
  movement: z.number().int().optional(),
  strength: z.number().int().optional(),
  agility: z.number().int().optional(),
  passing: z.number().int().optional(),
  armour: z.number().int().optional(),
})

const createMatchSessionBodySchema = z.object({
  leagueId: z.string().min(1).nullable().optional(),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  createdByUserId: z.string().min(1),
})

const matchSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
})

const matchSessionCodeParamsSchema = z.object({
  sessionCode: z.string().trim().min(1),
})

const joinMatchSessionBodySchema = z.object({
  userId: z.string().min(1),
  side: z.nativeEnum(MatchSessionSide),
})

function toIsoString(value: Date) {
  return value.toISOString()
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
    currentValue: number
    spp: number
    nigglingInjuries: number
    extraSkills: string[]
    statAdjustments: unknown
  }>
}) {
  return {
    id: team.id,
    rosterTemplateId: team.rosterTemplateId,
    name: team.name,
    status: team.status,
    players: team.players.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      positionTemplateId: player.positionTemplateId,
      name: player.name,
      shirtNumber: player.shirtNumber,
      currentValue: player.currentValue,
      spp: player.spp,
      nigglingInjuries: player.nigglingInjuries,
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

async function fetchMatchSessionById(app: FastifyInstance, sessionId: string) {
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

async function fetchMatchSessionByCode(app: FastifyInstance, sessionCode: string) {
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

    const sessionCode = await generateUniqueSessionCode(app)
    const createdSession = await app.prisma.matchSession.create({
      data: {
        leagueId: bodyResult.data.leagueId ?? null,
        homeTeamId: bodyResult.data.homeTeamId,
        awayTeamId: bodyResult.data.awayTeamId,
        sessionCode,
        status: MatchSessionStatus.PENDING,
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
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    const user = await app.prisma.user.findUnique({
      where: {
        id: bodyResult.data.userId,
      },
    })

    if (!user) {
      return reply.code(404).send({
        message: 'User not found.',
      })
    }

    if (session.leagueId) {
      const membership = await app.prisma.leagueMembership.findUnique({
        where: {
          leagueId_userId: {
            leagueId: session.leagueId,
            userId: user.id,
          },
        },
      })

      if (!membership) {
        return reply.code(409).send({
          message: 'User must be a member of the session league to join.',
        })
      }
    }

    const existingParticipant = session.participants.find((participant) => participant.userId === user.id)

    if (existingParticipant) {
      return reply.code(409).send({
        message: 'User has already joined this match session.',
      })
    }

    const requestedTeam = bodyResult.data.side === MatchSessionSide.HOME ? session.homeTeam : session.awayTeam

    if (requestedTeam.ownerUserId !== user.id) {
      return reply.code(409).send({
        message: 'User can only join the side owned by their team.',
      })
    }

    const occupiedSide = session.participants.find((participant) => participant.side === bodyResult.data.side)

    if (occupiedSide) {
      return reply.code(409).send({
        message: 'That side has already been claimed for this session.',
      })
    }

    const participant = await app.prisma.matchSessionParticipant.create({
      data: {
        matchSessionId: session.id,
        userId: user.id,
        teamId: requestedTeam.id,
        side: bodyResult.data.side,
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
      },
    })

    if (!session) {
      return reply.code(404).send({
        message: 'Match session not found.',
      })
    }

    return reply.send({
      matchSession: toMatchSessionSummary(session),
      teams: {
        home: toSavedTeamRecord(session.homeTeam),
        away: toSavedTeamRecord(session.awayTeam),
      },
    })
  })
}
