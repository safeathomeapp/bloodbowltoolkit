import Fastify from 'fastify'

import { registerPrisma } from './plugins/prisma.js'
import { registerCompetitionRoutes } from './routes/competitions.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerLeagueRoutes } from './routes/leagues.js'
import { registerMatchSessionRoutes } from './routes/matchSessions.js'
import { registerTeamRoutes } from './routes/teams.js'
import { registerUserRoutes } from './routes/users.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', request.headers.origin ?? '*')
    reply.header('Vary', 'Origin')
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')

    if (request.method === 'OPTIONS') {
      return reply.code(204).send()
    }
  })

  await registerPrisma(app)
  await registerHealthRoutes(app)
  await registerUserRoutes(app)
  await registerCompetitionRoutes(app)
  await registerLeagueRoutes(app)
  await registerTeamRoutes(app)
  await registerMatchSessionRoutes(app)

  return app
}
