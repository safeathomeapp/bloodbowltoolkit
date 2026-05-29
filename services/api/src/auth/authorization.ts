import type { User } from '@prisma/client'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { hashOpaqueToken } from './crypto.js'
import { getBearerToken } from './session.js'

export async function findAuthenticatedUser(
  app: FastifyInstance,
  request: FastifyRequest,
): Promise<User | null> {
  const sessionToken = getBearerToken(request)

  if (!sessionToken) {
    return null
  }

  const session = await app.prisma.userSession.findUnique({
    where: {
      tokenHash: await hashOpaqueToken(sessionToken),
    },
    include: {
      user: true,
    },
  })

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null
  }

  await app.prisma.userSession.update({
    where: {
      id: session.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  })

  return session.user
}

export async function requireAuthenticatedUser(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<User | null> {
  const user = await findAuthenticatedUser(app, request)

  if (!user) {
    await reply.code(401).send({
      message: 'Authentication is required.',
    })
    return null
  }

  return user
}

export function doesActorMatchUserId(actorUser: User, expectedUserId: string) {
  return actorUser.id === expectedUserId
}
