import { buildApp } from './app.js'
import { readEnv } from './config/env.js'

async function start() {
  const env = readEnv()
  const app = await buildApp()

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void start()
