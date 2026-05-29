import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { requireAuthenticatedUser } from '../auth/authorization.js'
import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from '../auth/crypto.js'
import { getBearerToken } from '../auth/session.js'
import { normalizeEmail, toPublicUser } from '../auth/users.js'
import { readEnv } from '../config/env.js'

const signupBodySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128).optional(),
  townOrCity: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().min(1).max(120).optional(),
})

const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
})

const passwordLoginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
})

const magicLinkRequestBodySchema = z.object({
  email: z.string().trim().email(),
})

const updateProfileBodySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  townOrCity: z.string().trim().min(1).max(120).nullable().optional(),
  country: z.string().trim().min(1).max(120).nullable().optional(),
})

const requestEmailChangeBodySchema = z.object({
  email: z.string().trim().email(),
})

const logoutBodySchema = z.object({
  sessionToken: z.string().min(1).optional(),
})

const SESSION_LOOKUP_SELECT = {
  id: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  revokedAt: true,
}

function createSessionPayload(sessionToken: string, expiresAt: Date) {
  return {
    token: sessionToken,
    expiresAt,
  }
}

async function issueSession(app: FastifyInstance, userId: string) {
  const env = readEnv()
  const sessionToken = createOpaqueToken()
  const expiresAt = new Date(Date.now() + env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  await app.prisma.userSession.create({
    data: {
      userId,
      tokenHash: await hashOpaqueToken(sessionToken),
      expiresAt,
      lastUsedAt: new Date(),
    },
  })

  return createSessionPayload(sessionToken, expiresAt)
}

async function issueUserAuthToken(
  app: FastifyInstance,
  userId: string,
  purpose: 'EMAIL_VERIFICATION' | 'MAGIC_LINK_LOGIN' | 'EMAIL_CHANGE_VERIFICATION',
  expiresAt: Date,
) {
  const token = createOpaqueToken()

  await app.prisma.userAuthToken.create({
    data: {
      userId,
      purpose,
      tokenHash: await hashOpaqueToken(token),
      expiresAt,
    },
  })

  return {
    token,
    expiresAt,
  }
}

async function resolveActiveSession(app: FastifyInstance, sessionToken: string) {
  const tokenHash = await hashOpaqueToken(sessionToken)
  const session = await app.prisma.userSession.findUnique({
    where: {
      tokenHash,
    },
    select: SESSION_LOOKUP_SELECT,
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

  return session
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (request, reply) => {
    const bodyResult = signupBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid signup payload.',
        issues: bodyResult.error.issues,
      })
    }

    const email = bodyResult.data.email.trim()
    const normalizedEmail = normalizeEmail(email)
    const existingUser = await app.prisma.user.findFirst({
      where: {
        normalizedEmail,
      },
      select: {
        id: true,
        normalizedEmail: true,
      },
    })

    if (existingUser?.normalizedEmail === normalizedEmail) {
      return reply.code(409).send({
        message: 'An account with that email already exists.',
      })
    }

    const user = await app.prisma.user.create({
      data: {
        displayName: bodyResult.data.displayName.trim(),
        email,
        normalizedEmail,
        passwordHash: bodyResult.data.password
          ? await hashPassword(bodyResult.data.password)
          : null,
        townOrCity: bodyResult.data.townOrCity?.trim() || null,
        country: bodyResult.data.country?.trim() || null,
      },
    })

    const env = readEnv()
    const verification = await issueUserAuthToken(
      app,
      user.id,
      'EMAIL_VERIFICATION',
      new Date(Date.now() + env.AUTH_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    )

    return reply.code(201).send({
      user: toPublicUser(user),
      verification: {
        required: true,
        deliveryMode: 'development_response',
        token: verification.token,
        expiresAt: verification.expiresAt,
      },
    })
  })

  app.post('/auth/verify-email', async (request, reply) => {
    const bodyResult = verifyEmailBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid verification payload.',
        issues: bodyResult.error.issues,
      })
    }

    const tokenHash = await hashOpaqueToken(bodyResult.data.token)
    const authToken = await app.prisma.userAuthToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    })

    if (
      !authToken ||
      authToken.purpose !== 'EMAIL_VERIFICATION' ||
      authToken.consumedAt ||
      authToken.expiresAt.getTime() <= Date.now()
    ) {
      return reply.code(400).send({
        message: 'Verification token is invalid or expired.',
      })
    }

    const updatedUser = await app.prisma.$transaction(async (tx) => {
      await tx.userAuthToken.update({
        where: {
          id: authToken.id,
        },
        data: {
          consumedAt: new Date(),
        },
      })

      return tx.user.update({
        where: {
          id: authToken.userId,
        },
        data: {
          emailVerifiedAt: authToken.user.emailVerifiedAt ?? new Date(),
        },
      })
    })

    const session = await issueSession(app, updatedUser.id)

    return reply.send({
      user: toPublicUser(updatedUser),
      session,
    })
  })

  app.post('/auth/login/password', async (request, reply) => {
    const bodyResult = passwordLoginBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid password login payload.',
        issues: bodyResult.error.issues,
      })
    }

    const user = await app.prisma.user.findFirst({
      where: {
        normalizedEmail: normalizeEmail(bodyResult.data.email),
      },
    })

    if (!user?.passwordHash || !(await verifyPassword(bodyResult.data.password, user.passwordHash))) {
      return reply.code(401).send({
        message: 'Invalid login credentials.',
      })
    }

    if (!user.emailVerifiedAt) {
      return reply.code(403).send({
        message: 'Email verification is required before login.',
      })
    }

    const session = await issueSession(app, user.id)

    return reply.send({
      user: toPublicUser(user),
      session,
    })
  })

  app.post('/auth/login/magic-link/request', async (request, reply) => {
    const bodyResult = magicLinkRequestBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid magic-link request payload.',
        issues: bodyResult.error.issues,
      })
    }

    const user = await app.prisma.user.findUnique({
      where: {
        normalizedEmail: normalizeEmail(bodyResult.data.email),
      },
    })

    if (!user || !user.emailVerifiedAt) {
      return reply.code(404).send({
        message: 'No verified account was found for that email address.',
      })
    }

    const env = readEnv()
    const magicLink = await issueUserAuthToken(
      app,
      user.id,
      'MAGIC_LINK_LOGIN',
      new Date(Date.now() + env.AUTH_MAGIC_LINK_TTL_MINUTES * 60 * 1000),
    )

    return reply.send({
      message: 'Magic link issued.',
      deliveryMode: 'development_response',
      token: magicLink.token,
      expiresAt: magicLink.expiresAt,
    })
  })

  app.post('/auth/login/magic-link/consume', async (request, reply) => {
    const bodyResult = verifyEmailBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid magic-link payload.',
        issues: bodyResult.error.issues,
      })
    }

    const tokenHash = await hashOpaqueToken(bodyResult.data.token)
    const authToken = await app.prisma.userAuthToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    })

    if (
      !authToken ||
      authToken.purpose !== 'MAGIC_LINK_LOGIN' ||
      authToken.consumedAt ||
      authToken.expiresAt.getTime() <= Date.now()
    ) {
      return reply.code(400).send({
        message: 'Magic link token is invalid or expired.',
      })
    }

    if (!authToken.user.emailVerifiedAt) {
      return reply.code(403).send({
        message: 'Email verification is required before magic-link login.',
      })
    }

    await app.prisma.userAuthToken.update({
      where: {
        id: authToken.id,
      },
      data: {
        consumedAt: new Date(),
      },
    })

    const session = await issueSession(app, authToken.userId)

    return reply.send({
      user: toPublicUser(authToken.user),
      session,
    })
  })

  app.get('/auth/me', async (request, reply) => {
    const sessionToken = getBearerToken(request)

    if (!sessionToken) {
      return reply.code(401).send({
        message: 'Bearer token required.',
      })
    }

    const session = await resolveActiveSession(app, sessionToken)

    if (!session) {
      return reply.code(401).send({
        message: 'Session is invalid or expired.',
      })
    }

    const user = await app.prisma.user.findUnique({
      where: {
        id: session.userId,
      },
    })

    if (!user) {
      return reply.code(404).send({
        message: 'User not found.',
      })
    }

    return reply.send({
      user: toPublicUser(user),
      session: {
        expiresAt: session.expiresAt,
      },
    })
  })

  app.patch('/auth/profile', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const bodyResult = updateProfileBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid profile update payload.',
        issues: bodyResult.error.issues,
      })
    }

    const user = await app.prisma.user.update({
      where: {
        id: actorUser.id,
      },
      data: {
        displayName: bodyResult.data.displayName,
        townOrCity: bodyResult.data.townOrCity?.trim() || null,
        country: bodyResult.data.country?.trim() || null,
      },
    })

    return reply.send({
      user: toPublicUser(user),
    })
  })

  app.post('/auth/email-change/request', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const bodyResult = requestEmailChangeBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid email change payload.',
        issues: bodyResult.error.issues,
      })
    }

    const email = bodyResult.data.email.trim()
    const normalizedEmail = normalizeEmail(email)

    if (actorUser.normalizedEmail === normalizedEmail) {
      return reply.code(409).send({
        message: 'That email is already the active email on this account.',
      })
    }

    const conflictingUser = await app.prisma.user.findFirst({
      where: {
        OR: [
          {
            normalizedEmail,
          },
          {
            pendingNormalizedEmail: normalizedEmail,
          },
        ],
        NOT: {
          id: actorUser.id,
        },
      },
      select: {
        id: true,
      },
    })

    if (conflictingUser) {
      return reply.code(409).send({
        message: 'That email address is already in use.',
      })
    }

    const env = readEnv()
    const emailChangeVerification = await issueUserAuthToken(
      app,
      actorUser.id,
      'EMAIL_CHANGE_VERIFICATION',
      new Date(Date.now() + env.AUTH_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    )

    const user = await app.prisma.user.update({
      where: {
        id: actorUser.id,
      },
      data: {
        pendingEmail: email,
        pendingNormalizedEmail: normalizedEmail,
      },
    })

    return reply.send({
      user: toPublicUser(user),
      verification: {
        required: true,
        deliveryMode: 'development_response',
        token: emailChangeVerification.token,
        expiresAt: emailChangeVerification.expiresAt,
      },
    })
  })

  app.post('/auth/email-change/verify', async (request, reply) => {
    const actorUser = await requireAuthenticatedUser(app, request, reply)

    if (!actorUser) {
      return
    }

    const bodyResult = verifyEmailBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid email-change verification payload.',
        issues: bodyResult.error.issues,
      })
    }

    const tokenHash = await hashOpaqueToken(bodyResult.data.token)
    const authToken = await app.prisma.userAuthToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    })

    if (
      !authToken ||
      authToken.userId !== actorUser.id ||
      authToken.purpose !== 'EMAIL_CHANGE_VERIFICATION' ||
      authToken.consumedAt ||
      authToken.expiresAt.getTime() <= Date.now()
    ) {
      return reply.code(400).send({
        message: 'Email change token is invalid or expired.',
      })
    }

    if (!authToken.user.pendingEmail || !authToken.user.pendingNormalizedEmail) {
      return reply.code(409).send({
        message: 'There is no pending email change to verify.',
      })
    }

    const updatedUser = await app.prisma.$transaction(async (tx) => {
      await tx.userAuthToken.update({
        where: {
          id: authToken.id,
        },
        data: {
          consumedAt: new Date(),
        },
      })

      return tx.user.update({
        where: {
          id: authToken.userId,
        },
        data: {
          email: authToken.user.pendingEmail,
          normalizedEmail: authToken.user.pendingNormalizedEmail,
          pendingEmail: null,
          pendingNormalizedEmail: null,
          emailVerifiedAt: new Date(),
        },
      })
    })

    return reply.send({
      user: toPublicUser(updatedUser),
    })
  })

  app.post('/auth/logout', async (request, reply) => {
    const bodyResult = logoutBodySchema.safeParse(request.body ?? {})

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid logout payload.',
        issues: bodyResult.error.issues,
      })
    }

    const sessionToken = bodyResult.data.sessionToken ?? getBearerToken(request)

    if (!sessionToken) {
      return reply.code(400).send({
        message: 'A session token is required to logout.',
      })
    }

    const sessionHash = await hashOpaqueToken(sessionToken)
    const session = await app.prisma.userSession.findUnique({
      where: {
        tokenHash: sessionHash,
      },
      select: SESSION_LOOKUP_SELECT,
    })

    if (!session || session.revokedAt) {
      return reply.code(204).send()
    }

    await app.prisma.userSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    return reply.code(204).send()
  })
}
