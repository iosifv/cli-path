import Ajv, { type ValidateFunction } from 'ajv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { FromSchema, JSONSchema } from 'json-schema-to-ts'

import { authenticate, type Auth0User } from './auth0.js'
import {
  CounterUnavailableError,
  release,
  monthlyKey,
  reserve,
  type Reservation,
} from './counter.js'
import { fail, quotaOf, type Quota } from './respond.js'

/**
 * The gate every metered endpoint passes through: method, body, identity, quota
 * — in that order, so unauthenticated traffic can never consume budget.
 *
 * This replaces archived-sls-api/src/libs/my-middleware.ts. That version was a
 * middy wrapper (Lambda-specific) and, more importantly, only *read* the count
 * here while the handler wrote the row, which is why concurrent requests could
 * all pass at the limit. Here the reservation is atomic and already claimed by
 * the time a handler runs.
 */

const ajv = new Ajv({ allErrors: true })
const validators = new WeakMap<object, ValidateFunction>()

function validatorFor(schema: object): ValidateFunction {
  let validate = validators.get(schema)
  if (!validate) {
    validate = ajv.compile(schema)
    validators.set(schema, validate)
  }
  return validate
}

export type Guarded<S> = {
  body: S
  user: Auth0User
  quota: Quota
  /**
   * Hands the reserved call back. Call this when the request fails upstream —
   * a provider outage shouldn't cost the user's monthly budget.
   */
  refund: () => Promise<void>
}

/**
 * Returns the request context, or `null` when it has already answered the
 * request — callers should simply return on `null`.
 */
export async function guard<S extends JSONSchema>(
  req: VercelRequest,
  res: VercelResponse,
  schema: S
): Promise<Guarded<FromSchema<S>> | null> {
  if (req.method !== 'POST') {
    fail(res, 'METHOD_NOT_ALLOWED', `Use POST, not ${req.method}.`)
    return null
  }

  // Vercel parses application/json into an object, but a client sending a raw
  // string body (or no content-type) still arrives here as text.
  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      fail(res, 'INVALID_REQUEST', 'Request body is not valid JSON.')
      return null
    }
  }
  if (body === undefined || body === null) {
    body = {}
  }

  const validate = validatorFor(schema as object)
  if (!validate(body)) {
    fail(
      res,
      'INVALID_REQUEST',
      'Request body does not match the expected shape.',
      validate.errors?.map((e) => `${e.instancePath || '/'} ${e.message}`)
    )
    return null
  }

  const auth = await authenticate(req.headers.authorization)
  if (!auth.ok) {
    fail(res, auth.status, auth.message)
    return null
  }

  let reservation: Reservation
  try {
    reservation = await reserve()
  } catch (error) {
    // Never fail open. The cap is the only thing protecting the provider's
    // free tier, so an unreachable counter means the service is unavailable.
    if (error instanceof CounterUnavailableError) {
      console.error('Usage counter unavailable', error.cause)
      fail(res, 'STORE_UNAVAILABLE', 'Usage accounting is unavailable, so calls are paused.')
      return null
    }
    throw error
  }

  if (!reservation.allowed) {
    fail(
      res,
      'QUOTA_EXCEEDED',
      'This service has reached its free quota for this month. ' +
        'Add your own map provider key and switch the engine with `clip config`.',
      quotaOf(reservation)
    )
    return null
  }

  const key = monthlyKey()
  return {
    body: body as FromSchema<S>,
    user: auth.user,
    quota: quotaOf(reservation),
    refund: () => release(key),
  }
}
