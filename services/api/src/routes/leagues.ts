import type { FastifyInstance } from 'fastify'
import { LeagueMembershipRole } from '@prisma/client'
import { z } from 'zod'

const leagueParamsSchema = z.object({
  leagueId: z.string().min(1),
})

const createLeagueBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  createdByUserId: z.string().min(1),
})

const joinLeagueBodySchema = z.object({
  userId: z.string().min(1),
})

export async function registerLeagueRoutes(app: FastifyInstance) {
  app.post('/leagues', async (request, reply) => {
    const bodyResult = createLeagueBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid league payload.',
        issues: bodyResult.error.issues,
      })
    }

    const owner = await app.prisma.user.findUnique({
      where: {
        id: bodyResult.data.createdByUserId,
      },
    })

    if (!owner) {
      return reply.code(404).send({
        message: 'Owner user not found.',
      })
    }

    const league = await app.prisma.league.create({
      data: {
        name: bodyResult.data.name,
        createdById: owner.id,
        memberships: {
          create: {
            userId: owner.id,
            role: LeagueMembershipRole.OWNER,
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    })

    return reply.code(201).send({
      league,
    })
  })

  app.get('/leagues/:leagueId', async (request, reply) => {
    const paramsResult = leagueParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid league id.',
      })
    }

    const league = await app.prisma.league.findUnique({
      where: {
        id: paramsResult.data.leagueId,
      },
      include: {
        createdBy: true,
        memberships: {
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    })

    if (!league) {
      return reply.code(404).send({
        message: 'League not found.',
      })
    }

    return reply.send({
      league,
    })
  })

  app.post('/leagues/:leagueId/join', async (request, reply) => {
    const paramsResult = leagueParamsSchema.safeParse(request.params)
    const bodyResult = joinLeagueBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid league id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid join payload.',
        issues: bodyResult.error.issues,
      })
    }

    const [league, user] = await Promise.all([
      app.prisma.league.findUnique({
        where: {
          id: paramsResult.data.leagueId,
        },
      }),
      app.prisma.user.findUnique({
        where: {
          id: bodyResult.data.userId,
        },
      }),
    ])

    if (!league) {
      return reply.code(404).send({
        message: 'League not found.',
      })
    }

    if (!user) {
      return reply.code(404).send({
        message: 'User not found.',
      })
    }

    const existingMembership = await app.prisma.leagueMembership.findUnique({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id,
        },
      },
    })

    if (existingMembership) {
      return reply.code(409).send({
        message: 'User is already a member of this league.',
      })
    }

    const membership = await app.prisma.leagueMembership.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        role: LeagueMembershipRole.MEMBER,
      },
      include: {
        user: true,
        league: true,
      },
    })

    return reply.code(201).send({
      membership,
    })
  })

  app.get('/leagues/:leagueId/members', async (request, reply) => {
    const paramsResult = leagueParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid league id.',
      })
    }

    const league = await app.prisma.league.findUnique({
      where: {
        id: paramsResult.data.leagueId,
      },
    })

    if (!league) {
      return reply.code(404).send({
        message: 'League not found.',
      })
    }

    const memberships = await app.prisma.leagueMembership.findMany({
      where: {
        leagueId: league.id,
      },
      include: {
        user: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    return reply.send({
      memberships,
    })
  })
}
