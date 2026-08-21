import type { VercelRequest, VercelResponse } from '@vercel/node'

import { guard } from '../lib/guard.js'
import { direction, OrsError } from '../lib/ors.js'
import { fail, ok } from '../lib/respond.js'
import schema from '../schemas/direction.js'

/**
 * POST /direction  { origin, destination, profile? }
 *
 * Answers with the five pre-formatted fields `print.direction()` renders:
 * { start, end, summary, distance, duration }.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const request = await guard(req, res, schema)
  if (!request) {
    return
  }

  try {
    const result = await direction(
      request.body.origin,
      request.body.destination,
      request.body.profile
    )
    return ok(res, { direction: result }, request.quota)
  } catch (error) {
    // The call was reserved before the provider was touched; give it back so a
    // provider failure doesn't spend the caller's quota.
    await request.refund()

    if (error instanceof OrsError) {
      return fail(res, error.kind, error.message)
    }
    console.error('Unhandled failure in /direction', error)
    return fail(res, 'SERVER_ERROR', 'Something went wrong finding that route.')
  }
}
