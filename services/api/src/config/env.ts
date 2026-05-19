import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().min(1).default('127.0.0.1'),
})

export type AppEnv = z.infer<typeof envSchema>

function parseEnvFile(fileContents: string): Record<string, string> {
  const entries: Record<string, string> = {}

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    entries[key] = value
  }

  return entries
}

function loadEnvFromFile(source: NodeJS.ProcessEnv) {
  const moduleDir = dirname(fileURLToPath(import.meta.url))
  const candidatePaths = [
    resolve(process.cwd(), '.env'),
    resolve(moduleDir, '../../.env'),
  ]

  for (const candidatePath of candidatePaths) {
    if (!existsSync(candidatePath)) {
      continue
    }

    const parsedValues = parseEnvFile(readFileSync(candidatePath, 'utf8'))

    for (const [key, value] of Object.entries(parsedValues)) {
      if (!source[key]) {
        source[key] = value
      }
    }

    return
  }
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  loadEnvFromFile(source)
  return envSchema.parse(source)
}
