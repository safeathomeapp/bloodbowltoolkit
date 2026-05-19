import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const userParamsSchema = z.object({
  userId: z.string().min(1),
})

const createUserBodySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
})

export async function registerUserRoutes(app: FastifyInstance) {
  app.get('/users/:userId', async (request, reply) => {
    const paramsResult = userParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid user id.',
      })
    }

    const user = await app.prisma.user.findUnique({
      where: {
        id: paramsResult.data.userId,
      },
    })

    if (!user) {
      return reply.code(404).send({
        message: 'User not found.',
      })
    }

    return reply.send({
      user,
    })
  })

  app.post('/users', async (request, reply) => {
    const bodyResult = createUserBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid user payload.',
        issues: bodyResult.error.issues,
      })
    }

    const user = await app.prisma.user.create({
      data: {
        displayName: bodyResult.data.displayName,
      },
    })

    return reply.code(201).send({
      user,
    })
  })
}
