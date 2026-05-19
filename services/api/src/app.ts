import Fastify from 'fastify'

import { registerPrisma } from './plugins/prisma.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerLeagueRoutes } from './routes/leagues.js'
import { registerMatchSessionRoutes } from './routes/matchSessions.js'
import { registerTeamRoutes } from './routes/teams.js'
import { registerUserRoutes } from './routes/users.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  await registerPrisma(app)
  await registerHealthRoutes(app)
  await registerUserRoutes(app)
  await registerLeagueRoutes(app)
  await registerTeamRoutes(app)
  await registerMatchSessionRoutes(app)

  return app
}
