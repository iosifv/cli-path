import { Redis } from '@upstash/redis'
import {
  COUNTER_KEY_PREFIX,
  COUNTER_TTL_SECONDS,
  MAXIMUM_ALLOWED_MONTHLY_CALLS,
} from '../utils/constants.js'

/**
 * The global monthly call cap.
 *
 * The archived DynamoDB implementation had two flaws this deliberately avoids
 * (see archived-sls-api/ARCHIVED.md):
 *
 *   1. It counted with a full-table `Scan` on every request — O(all rows ever
 *      written). `INCR` is O(1) and never degrades.
 *   2. It read the count in middleware and wrote the row in the handler, two
 *      non-atomic steps, so concurrent requests at the limit all passed the
 *      check. Here the increment *is* the check: `INCR` returns the new value,
 *      so exactly one caller can observe the value that crosses the cap.
 */

export class CounterUnavailableError extends Error {
  constructor(cause: unknown) {
    super('The usage counter is unreachable')
    this.name = 'CounterUnavailableError'
    this.cause = cause
  }
}

export type Reservation = {
  allowed: boolean
  count: number
  limit: number
}

/** `calls:2026-08` */
export function monthlyKey(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${COUNTER_KEY_PREFIX}${year}-${month}`
}

/**
 * Quota enforcement is opt-out only, and only ever explicitly: an unreachable
 * or unconfigured store must never silently fail open, because the cap is the
 * one thing standing between this project and its provider's free tier.
 */
export function quotaDisabled(): boolean {
  return process.env.CLIP_DISABLE_QUOTA === '1'
}

let client: Redis | null = null

function redis(): Redis {
  if (client) {
    return client
  }

  // The Vercel Marketplace Upstash integration injects KV_REST_API_*; a
  // hand-rolled Upstash database injects UPSTASH_REDIS_REST_*. Accept either.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new CounterUnavailableError(
      new Error(
        'No Redis credentials. Set KV_REST_API_URL/KV_REST_API_TOKEN (or the ' +
          'UPSTASH_REDIS_REST_* pair), or set CLIP_DISABLE_QUOTA=1 for local development.'
      )
    )
  }

  client = new Redis({ url, token })
  return client
}

/**
 * Atomically claim one call against this month's budget.
 *
 * Returns `allowed: false` when the claim would exceed the cap — the claim is
 * released again in that case, so a rejected request costs nothing.
 */
export async function reserve(now = new Date()): Promise<Reservation> {
  const limit = MAXIMUM_ALLOWED_MONTHLY_CALLS

  if (quotaDisabled()) {
    return { allowed: true, count: 0, limit }
  }

  const key = monthlyKey(now)
  let count: number

  try {
    count = await redis().incr(key)

    // First write of the month: give the key a TTL so old months self-clean.
    if (count === 1) {
      await redis().expire(key, COUNTER_TTL_SECONDS)
    }
  } catch (error) {
    if (error instanceof CounterUnavailableError) {
      throw error
    }
    throw new CounterUnavailableError(error)
  }

  if (count > limit) {
    await release(key)
    return { allowed: false, count: count - 1, limit }
  }

  return { allowed: true, count, limit }
}

/**
 * Hand a claimed call back. Used when the request is rejected at the cap, and
 * when the upstream provider fails — a provider outage shouldn't burn quota.
 * Best-effort: a failed refund must not mask the error that triggered it.
 */
export async function release(key = monthlyKey()): Promise<void> {
  if (quotaDisabled()) {
    return
  }
  try {
    await redis().decr(key)
  } catch (error) {
    console.error('Failed to release a reserved call against', key, error)
  }
}

/** Read the current count without claiming anything. Used by /healthcheck. */
export async function peek(now = new Date()): Promise<Reservation> {
  const limit = MAXIMUM_ALLOWED_MONTHLY_CALLS

  if (quotaDisabled()) {
    return { allowed: true, count: 0, limit }
  }

  try {
    const raw = await redis().get<number>(monthlyKey(now))
    const count = Number(raw ?? 0)
    return { allowed: count < limit, count, limit }
  } catch (error) {
    if (error instanceof CounterUnavailableError) {
      throw error
    }
    throw new CounterUnavailableError(error)
  }
}

/** Only used in tests. */
export function resetClientForTests(): void {
  client = null
}
