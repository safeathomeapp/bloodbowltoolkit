import type { User } from '@prisma/client'

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    pendingEmail: user.pendingEmail,
    emailVerifiedAt: user.emailVerifiedAt,
    townOrCity: user.townOrCity,
    country: user.country,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
