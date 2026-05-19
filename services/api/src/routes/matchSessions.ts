import type { FastifyInstance } from 'fastify'

export async function registerMatchSessionRoutes(app: FastifyInstance) {
  app.post('/match-sessions', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Match session creation not implemented yet.',
    })
  })

  app.get('/match-sessions/:sessionId', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Match session lookup not implemented yet.',
    })
  })

  app.get('/match-sessions/code/:sessionCode', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Match session code lookup not implemented yet.',
    })
  })

  app.post('/match-sessions/:sessionId/join', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Match session join not implemented yet.',
    })
  })

  app.get('/match-sessions/:sessionId/block-dice-context', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Block-dice preload context not implemented yet.',
    })
  })
}
