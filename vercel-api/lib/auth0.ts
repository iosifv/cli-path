import { AUTH0_TIMEOUT_MS, AUTH0_URL_USERINFO } from '../utils/constants.js'

/**
 * Validates the CLI's bearer token by asking Auth0 who it belongs to.
 *
 * Carried over from archived-sls-api/src/libs/client-auth0.ts, with the status
 * handling straightened out: the archived version funnelled every failure into
 * an HTTP 401 response object, which is what taught the CLI to ignore HTTP
 * status codes entirely.
 */

export type Auth0User = {
  sub?: string
  name?: string
  nickname?: string
  email?: string
}

export type AuthResult =
  | { ok: true; user: Auth0User }
  | { ok: false; status: 'UNAUTHENTICATED' | 'PROVIDER_ERROR'; message: string }

export async function authenticate(authorization?: string): Promise<AuthResult> {
  if (!authorization || !authorization.trim().toLowerCase().startsWith('bearer ')) {
    return {
      ok: false,
      status: 'UNAUTHENTICATED',
      message:
        'Missing or malformed Authorization header. Run `clip` and use the Authenticate option.',
    }
  }

  let response: Response
  try {
    response = await fetch(AUTH0_URL_USERINFO, {
      method: 'GET',
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(AUTH0_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('Auth0 /userinfo is unreachable', error)
    return {
      ok: false,
      status: 'PROVIDER_ERROR',
      message: 'Could not reach the authentication provider. Try again shortly.',
    }
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      status: 'UNAUTHENTICATED',
      message: 'Your access token was rejected. Run `clip` and use the Authenticate option.',
    }
  }

  if (!response.ok) {
    console.error('Auth0 /userinfo returned', response.status)
    return {
      ok: false,
      status: 'PROVIDER_ERROR',
      message: 'The authentication provider returned an unexpected response.',
    }
  }

  const user = (await response.json()) as Auth0User

  // Omitting `scope` on the token request yields a 200 with an empty object
  // here — the gotcha recorded in docs/README.md. Treat it as unauthenticated
  // rather than letting an anonymous caller through.
  if (!user || !user.sub) {
    return {
      ok: false,
      status: 'UNAUTHENTICATED',
      message: 'The access token carries no identity. Re-authenticate to obtain a scoped token.',
    }
  }

  return { ok: true, user }
}
