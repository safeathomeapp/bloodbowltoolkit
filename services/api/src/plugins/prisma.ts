import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export async function registerPrisma(app: FastifyInstance) {
  process.env.PRISMA_CLIENT_ENGINE_TYPE ??= 'library'
  const prisma = new PrismaClient()

  await prisma.$connect()
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}
