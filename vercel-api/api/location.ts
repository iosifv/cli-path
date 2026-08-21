import type { VercelRequest, VercelResponse } from '@vercel/node'

import { guard } from '../lib/guard.js'
import { geocode, OrsError } from '../lib/ors.js'
import { fail, ok } from '../lib/respond.js'
import schema from '../schemas/location.js'

/**
 * POST /location  { query }
 *
 * Answers with `formatted_address`, the key
 * cli-app/lib/clients/ClipApi.js reads off the response.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const request = await guard(req, res, schema)
  if (!request) {
    return
  }

  try {
    const place = await geocode(request.body.query)
    return ok(res, { formatted_address: place.label }, request.quota)
  } catch (error) {
    await request.refund()

    if (error instanceof OrsError) {
      return fail(res, error.kind, error.message)
    }
    console.error('Unhandled failure in /location', error)
    return fail(res, 'SERVER_ERROR', 'Something went wrong looking up that place.')
  }
}
