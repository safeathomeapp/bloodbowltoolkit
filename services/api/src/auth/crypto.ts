import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const PASSWORD_HASH_ALGORITHM = 'scrypt'
const PASSWORD_KEY_LENGTH = 64
const PASSWORD_SALT_BYTES = 16

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url')
}

export async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('base64url')
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer

  return `${PASSWORD_HASH_ALGORITHM}:${salt}:${derivedKey.toString('base64url')}`
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedDigest] = passwordHash.split(':')

  if (algorithm !== PASSWORD_HASH_ALGORITHM || !salt || !storedDigest) {
    return false
  }

  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer
  const storedBuffer = Buffer.from(storedDigest, 'base64url')

  if (derivedKey.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(derivedKey, storedBuffer)
}

export async function hashOpaqueToken(token: string) {
  const digest = (await scrypt(token, 'blood-bowl-toolkit-auth', PASSWORD_KEY_LENGTH)) as Buffer
  return digest.toString('base64url')
}
