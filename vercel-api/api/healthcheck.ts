import type { VercelRequest, VercelResponse } from '@vercel/node'

import { CounterUnavailableError, peek, quotaDisabled } from '../lib/counter.js'
import { fail, ok, quotaOf } from '../lib/respond.js'

/**
 * GET|POST /healthcheck
 *
 * Deliberately unauthenticated and unmetered — a liveness probe that needs a
 * bearer token is useless for monitoring, and one that consumes quota is worse.
 * It reports configuration and remaining budget without claiming a call.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return fail(res, 'METHOD_NOT_ALLOWED', `Use GET or POST, not ${req.method}.`)
  }

  const configured = {
    routing_provider: Boolean(process.env.ORS_API_KEY),
    usage_counter: Boolean(process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL),
    quota_enforced: !quotaDisabled(),
  }

  try {
    const reservation = await peek()
    return ok(res, { configured }, quotaOf(reservation))
  } catch (error) {
    if (error instanceof CounterUnavailableError) {
      console.error('Usage counter unavailable', error.cause)
      return fail(res, 'STORE_UNAVAILABLE', 'Usage accounting is unavailable.', { configured })
    }
    throw error
  }
}
