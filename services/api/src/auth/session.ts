import type { FastifyRequest } from 'fastify'

export function getBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization

  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(/\s+/u)

  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null
  }

  return token
}
