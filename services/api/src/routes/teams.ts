import type { FastifyInstance } from 'fastify'

export async function registerTeamRoutes(app: FastifyInstance) {
  app.get('/teams', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Team listing not implemented yet.',
    })
  })

  app.get('/teams/:teamId', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Team lookup not implemented yet.',
    })
  })

  app.post('/teams', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Team creation not implemented yet.',
    })
  })

  app.put('/teams/:teamId', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Team update not implemented yet.',
    })
  })

  app.delete('/teams/:teamId', async (_request, reply) => {
    return reply.code(501).send({
      message: 'Team deletion not implemented yet.',
    })
  })
}
