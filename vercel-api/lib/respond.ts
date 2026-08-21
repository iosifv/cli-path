import type { VercelResponse } from '@vercel/node'

/**
 * Machine-readable outcome, carried in the body as `status_code`.
 *
 * The archived API returned HTTP 401 for every failure class, which is why
 * cli-app/lib/clients/ClipApi.js branches on `status_code` instead of on the
 * HTTP status. This API sends a real HTTP status *and* keeps `status_code`, so
 * the field stays useful for diagnostics without being load-bearing.
 */
export const STATUS = {
  OK: 200,
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  QUOTA_EXCEEDED: 429,
  SERVER_ERROR: 500,
  PROVIDER_ERROR: 502,
  STORE_UNAVAILABLE: 503,
} as const

export type StatusCode = keyof typeof STATUS

export type Quota = {
  monthly_call_count: number
  monthly_call_limit: number
}

/** Project a counter reservation onto the response envelope's quota fields. */
export function quotaOf(reservation: { count: number; limit: number }): Quota {
  return {
    monthly_call_count: reservation.count,
    monthly_call_limit: reservation.limit,
  }
}

export function ok(res: VercelResponse, payload: Record<string, unknown>, quota?: Quota) {
  return res.status(STATUS.OK).json({
    message: 'Success!',
    status_code: 'OK',
    ...(quota ?? {}),
    ...payload,
  })
}

export function fail(
  res: VercelResponse,
  statusCode: Exclude<StatusCode, 'OK'>,
  message: string,
  error?: unknown
) {
  return res.status(STATUS[statusCode]).json({
    message,
    status_code: statusCode,
    ...(error === undefined ? {} : { error }),
  })
}
