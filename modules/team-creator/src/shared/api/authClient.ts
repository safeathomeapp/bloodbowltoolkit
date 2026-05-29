import type { KeyValueStore } from '../storage/keyValueStore'

const AUTH_SESSION_TOKEN_KEY = 'blood-bowl-toolkit:auth:session-token'

type FetchLike = typeof fetch

export type AuthApiUser = {
  id: string
  displayName: string
  email: string | null
  pendingEmail: string | null
  emailVerifiedAt: string | null
  townOrCity: string | null
  country: string | null
  createdAt: string
  updatedAt: string
}

export type AuthSessionPayload = {
  token: string
  expiresAt: string
}

export type SignupResult = {
  user: AuthApiUser
  verification: {
    required: boolean
    deliveryMode: 'development_response'
    token: string
    expiresAt: string
  }
}

export type RequestMagicLinkResult = {
  message: string
  deliveryMode: 'development_response'
  token: string
  expiresAt: string
}

export type EmailChangeRequestResult = {
  user: AuthApiUser
  verification: {
    required: boolean
    deliveryMode: 'development_response'
    token: string
    expiresAt: string
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T
  }

  let message = `Request failed with status ${response.status}.`

  try {
    const payload = (await response.json()) as { message?: string }

    if (payload.message) {
      message = payload.message
    }
  } catch {
    // Keep the fallback message when the error body is empty or invalid.
  }

  throw new Error(message)
}

export class AuthClient {
  private readonly baseUrl: string
  private readonly store: KeyValueStore
  private readonly fetchImpl: FetchLike

  constructor(options: {
    baseUrl: string
    store: KeyValueStore
    fetchImpl?: FetchLike
  }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '')
    this.store = options.store
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  hasStoredSession() {
    return Boolean(this.getSessionToken())
  }

  getSessionToken() {
    return this.store.getItem(AUTH_SESSION_TOKEN_KEY)
  }

  async getCurrentUser() {
    const sessionToken = this.getSessionToken()

    if (!sessionToken) {
      throw new Error('Sign in is required.')
    }

    const response = await this.fetchImpl(`${this.baseUrl}/auth/me`, {
      headers: this.createHeaders(undefined, sessionToken),
    })
    const payload = await parseResponse<{
      user: AuthApiUser
      session: {
        expiresAt: string
      }
    }>(response)

    return payload.user
  }

  async signup(input: {
    displayName: string
    email: string
    password: string
    townOrCity?: string
    country?: string
  }) {
    const response = await this.fetchImpl(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: this.createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(input),
    })

    return parseResponse<SignupResult>(response)
  }

  async verifyEmail(token: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: this.createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        token,
      }),
    })
    const payload = await parseResponse<{
      user: AuthApiUser
      session: AuthSessionPayload
    }>(response)

    this.store.setItem(AUTH_SESSION_TOKEN_KEY, payload.session.token)

    return payload
  }

  async loginWithPassword(input: {
    email: string
    password: string
  }) {
    const response = await this.fetchImpl(`${this.baseUrl}/auth/login/password`, {
      method: 'POST',
      headers: this.createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(input),
    })
    const payload = await parseResponse<{
      user: AuthApiUser
      session: AuthSessionPayload
    }>(response)

    this.store.setItem(AUTH_SESSION_TOKEN_KEY, payload.session.token)

    return payload
  }

  async requestMagicLink(email: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/auth/login/magic-link/request`, {
      method: 'POST',
      headers: this.createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        email,
      }),
    })

    return parseResponse<RequestMagicLinkResult>(response)
  }

  async updateProfile(input: {
    displayName: string
    townOrCity?: string | null
    country?: string | null
  }) {
    const sessionToken = this.getSessionToken()

    if (!sessionToken) {
      throw new Error('Sign in is required.')
    }

    const response = await this.fetchImpl(`${this.baseUrl}/auth/profile`, {
      method: 'PATCH',
      headers: this.createHeaders(
        {
          'Content-Type': 'application/json',
        },
        sessionToken,
      ),
      body: JSON.stringify(input),
    })

    return parseResponse<{ user: AuthApiUser }>(response)
  }

  async requestEmailChange(email: string) {
    const sessionToken = this.getSessionToken()

    if (!sessionToken) {
      throw new Error('Sign in is required.')
    }

    const response = await this.fetchImpl(`${this.baseUrl}/auth/email-change/request`, {
      method: 'POST',
      headers: this.createHeaders(
        {
          'Content-Type': 'application/json',
        },
        sessionToken,
      ),
      body: JSON.stringify({
        email,
      }),
    })

    return parseResponse<EmailChangeRequestResult>(response)
  }

  async verifyEmailChange(token: string) {
    const sessionToken = this.getSessionToken()

    if (!sessionToken) {
      throw new Error('Sign in is required.')
    }

    const response = await this.fetchImpl(`${this.baseUrl}/auth/email-change/verify`, {
      method: 'POST',
      headers: this.createHeaders(
        {
          'Content-Type': 'application/json',
        },
        sessionToken,
      ),
      body: JSON.stringify({
        token,
      }),
    })

    return parseResponse<{ user: AuthApiUser }>(response)
  }

  async consumeMagicLink(token: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/auth/login/magic-link/consume`, {
      method: 'POST',
      headers: this.createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        token,
      }),
    })
    const payload = await parseResponse<{
      user: AuthApiUser
      session: AuthSessionPayload
    }>(response)

    this.store.setItem(AUTH_SESSION_TOKEN_KEY, payload.session.token)

    return payload
  }

  async logout() {
    const sessionToken = this.getSessionToken()

    if (!sessionToken) {
      return
    }

    await this.fetchImpl(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: this.createHeaders({
        'Content-Type': 'application/json',
      }, sessionToken),
    }).catch(() => {
      // Clear the local session even if the API call fails.
    })

    this.store.removeItem(AUTH_SESSION_TOKEN_KEY)
  }

  clearSession() {
    this.store.removeItem(AUTH_SESSION_TOKEN_KEY)
  }

  createAuthHeaders(headers?: HeadersInit) {
    const sessionToken = this.getSessionToken()
    return this.createHeaders(headers, sessionToken)
  }

  private createHeaders(headers?: HeadersInit, sessionToken?: string | null) {
    const nextHeaders = new Headers(headers)

    if (sessionToken) {
      nextHeaders.set('Authorization', `Bearer ${sessionToken}`)
    }

    return nextHeaders
  }
}
