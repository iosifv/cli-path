import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The counter is the piece the archived stack got wrong twice over, so these
 * tests pin down exactly the two behaviours ARCHIVED.md calls out: the check
 * must be atomic, and the store must never fail open.
 */

const incr = vi.fn()
const decr = vi.fn()
const expire = vi.fn()
const get = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    incr = incr
    decr = decr
    expire = expire
    get = get
  },
}))

let counter: typeof import('../lib/counter.js')

beforeEach(async () => {
  vi.resetModules()
  incr.mockReset()
  decr.mockReset()
  expire.mockReset()
  get.mockReset()

  process.env.KV_REST_API_URL = 'https://example.upstash.io'
  process.env.KV_REST_API_TOKEN = 'test-token'
  process.env.CLIP_MAX_MONTHLY_CALLS = '3'
  delete process.env.CLIP_DISABLE_QUOTA

  counter = await import('../lib/counter.js')
  counter.resetClientForTests()
})

afterEach(() => {
  delete process.env.CLIP_MAX_MONTHLY_CALLS
  delete process.env.CLIP_DISABLE_QUOTA
})

describe('monthlyKey', () => {
  it('is a zero-padded UTC year-month', () => {
    expect(counter.monthlyKey(new Date('2026-08-21T00:00:00Z'))).toBe('calls:2026-08')
    expect(counter.monthlyKey(new Date('2026-12-31T23:59:59Z'))).toBe('calls:2026-12')
  })
})

describe('reserve', () => {
  it('claims a call and reports the new count', async () => {
    incr.mockResolvedValue(2)

    const reservation = await counter.reserve()

    expect(reservation).toEqual({ allowed: true, count: 2, limit: 3 })
    expect(incr).toHaveBeenCalledWith(counter.monthlyKey())
    expect(expire).not.toHaveBeenCalled()
  })

  it('sets a TTL on the first write of the month only', async () => {
    incr.mockResolvedValue(1)

    await counter.reserve()

    expect(expire).toHaveBeenCalledOnce()
  })

  it('rejects and refunds once the increment crosses the cap', async () => {
    incr.mockResolvedValue(4)
    decr.mockResolvedValue(3)

    const reservation = await counter.reserve()

    expect(reservation).toEqual({ allowed: false, count: 3, limit: 3 })
    expect(decr).toHaveBeenCalledOnce()
  })

  it('admits exactly one caller at the boundary', async () => {
    // Two concurrent callers at count 2 of 3. INCR is atomic, so they observe
    // 3 and 4 — never the same value, which is the archived bug.
    incr.mockResolvedValueOnce(3).mockResolvedValueOnce(4)
    decr.mockResolvedValue(3)

    const [first, second] = await Promise.all([counter.reserve(), counter.reserve()])

    expect([first.allowed, second.allowed].filter(Boolean)).toHaveLength(1)
  })

  it('fails closed when the store is unreachable', async () => {
    incr.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(counter.reserve()).rejects.toBeInstanceOf(counter.CounterUnavailableError)
  })

  it('fails closed when the store is not configured at all', async () => {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    vi.resetModules()
    const fresh = await import('../lib/counter.js')
    fresh.resetClientForTests()

    await expect(fresh.reserve()).rejects.toBeInstanceOf(fresh.CounterUnavailableError)
  })

  it('is bypassed only by the explicit local-development opt-out', async () => {
    process.env.CLIP_DISABLE_QUOTA = '1'
    vi.resetModules()
    const fresh = await import('../lib/counter.js')

    await expect(fresh.reserve()).resolves.toEqual({ allowed: true, count: 0, limit: 3 })
    expect(incr).not.toHaveBeenCalled()
  })
})

describe('peek', () => {
  it('reads without claiming', async () => {
    get.mockResolvedValue(2)

    await expect(counter.peek()).resolves.toEqual({ allowed: true, count: 2, limit: 3 })
    expect(incr).not.toHaveBeenCalled()
  })

  it('treats an absent key as zero', async () => {
    get.mockResolvedValue(null)

    await expect(counter.peek()).resolves.toEqual({ allowed: true, count: 0, limit: 3 })
  })
})

describe('release', () => {
  it('swallows failures so a refund cannot mask the original error', async () => {
    decr.mockRejectedValue(new Error('down'))

    await expect(counter.release('calls:2026-08')).resolves.toBeUndefined()
  })
})
