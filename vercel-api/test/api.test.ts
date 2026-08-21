import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * End-to-end through the real guard: validation, Auth0, quota, ORS, response.
 * Only the two network edges (fetch) and Redis are stubbed.
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

type Captured = { status: number; body: any }

function mockRes(): { res: VercelResponse; captured: Captured } {
  const captured: Captured = { status: 0, body: undefined }
  const res = {
    status(code: number) {
      captured.status = code
      return this
    },
    json(payload: unknown) {
      captured.body = payload
      return this
    },
  } as unknown as VercelResponse
  return { res, captured }
}

function mockReq(body: unknown, overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body,
    ...overrides,
  } as VercelRequest
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const USERINFO = { sub: 'auth0|123', name: 'Iosif', nickname: 'iosifv' }

const PLACE = (label: string, coords: [number, number]) => ({
  features: [{ geometry: { coordinates: coords }, properties: { label } }],
})

const ROUTE = {
  routes: [
    {
      summary: { distance: 45200, duration: 2100 },
      segments: [
        {
          steps: [
            { name: 'A2', distance: 30000 },
            { name: 'A10', distance: 12000 },
          ],
        },
      ],
    },
  ],
}

let direction: typeof import('../api/direction.js').default
let location: typeof import('../api/location.js').default
let healthcheck: typeof import('../api/healthcheck.js').default

beforeEach(async () => {
  vi.resetModules()
  incr.mockReset().mockResolvedValue(5)
  decr.mockReset().mockResolvedValue(4)
  expire.mockReset()
  get.mockReset().mockResolvedValue(5)

  process.env.ORS_API_KEY = 'test-key'
  process.env.KV_REST_API_URL = 'https://example.upstash.io'
  process.env.KV_REST_API_TOKEN = 'test-token'
  process.env.CLIP_MAX_MONTHLY_CALLS = '1000'
  delete process.env.CLIP_DISABLE_QUOTA

  vi.stubGlobal('fetch', vi.fn())
  ;({ default: direction } = await import('../api/direction.js'))
  ;({ default: location } = await import('../api/location.js'))
  ;({ default: healthcheck } = await import('../api/healthcheck.js'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CLIP_MAX_MONTHLY_CALLS
})

describe('POST /direction', () => {
  it('answers with the exact five fields print.direction() renders', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(USERINFO))
      .mockResolvedValueOnce(jsonResponse(PLACE('Amsterdam, Netherlands', [4.9, 52.36])))
      .mockResolvedValueOnce(jsonResponse(PLACE('Utrecht, Netherlands', [5.12, 52.09])))
      .mockResolvedValueOnce(jsonResponse(ROUTE))

    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'amsterdam', destination: 'utrecht' }), res)

    expect(captured.status).toBe(200)
    expect(Object.keys(captured.body.direction).sort()).toEqual([
      'distance',
      'duration',
      'end',
      'start',
      'summary',
    ])
    expect(captured.body.direction).toEqual({
      start: 'Amsterdam, Netherlands',
      end: 'Utrecht, Netherlands',
      summary: 'A2 and A10',
      distance: '45.2 km',
      duration: '35 mins',
    })
    expect(captured.body.status_code).toBe('OK')
    expect(captured.body.monthly_call_count).toBe(5)
  })

  it('rejects a body missing a required field before spending quota', async () => {
    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'amsterdam' }), res)

    expect(captured.status).toBe(400)
    expect(captured.body.status_code).toBe('INVALID_REQUEST')
    expect(incr).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated caller before spending quota', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 401))

    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'a', destination: 'b' }), res)

    expect(captured.status).toBe(401)
    expect(incr).not.toHaveBeenCalled()
  })

  it('treats a token with no identity as unauthenticated', async () => {
    // The missing-`scope` gotcha: Auth0 answers 200 with an empty object.
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}))

    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'a', destination: 'b' }), res)

    expect(captured.status).toBe(401)
    expect(incr).not.toHaveBeenCalled()
  })

  it('answers 429 with real HTTP status once the cap is reached', async () => {
    incr.mockResolvedValue(1001)
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(USERINFO))

    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'a', destination: 'b' }), res)

    expect(captured.status).toBe(429)
    expect(captured.body.status_code).toBe('QUOTA_EXCEEDED')
    expect(decr).toHaveBeenCalled()
  })

  it('refunds the reserved call when the provider fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(USERINFO))
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({}, 500))

    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'a', destination: 'b' }), res)

    expect(captured.status).toBe(502)
    expect(decr).toHaveBeenCalled()
  })

  it('never fails open when the counter is unreachable', async () => {
    incr.mockRejectedValue(new Error('ECONNREFUSED'))
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(USERINFO))

    const { res, captured } = mockRes()
    await direction(mockReq({ origin: 'a', destination: 'b' }), res)

    expect(captured.status).toBe(503)
    expect(captured.body.status_code).toBe('STORE_UNAVAILABLE')
  })

  it('refuses a non-POST method', async () => {
    const { res, captured } = mockRes()
    await direction(mockReq({}, { method: 'GET' }), res)

    expect(captured.status).toBe(405)
  })

  it('parses a raw string body', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(USERINFO))
      .mockResolvedValueOnce(jsonResponse(PLACE('A', [1, 2])))
      .mockResolvedValueOnce(jsonResponse(PLACE('B', [3, 4])))
      .mockResolvedValueOnce(jsonResponse(ROUTE))

    const { res, captured } = mockRes()
    await direction(mockReq(JSON.stringify({ origin: 'a', destination: 'b' })), res)

    expect(captured.status).toBe(200)
  })
})

describe('POST /location', () => {
  it('answers with formatted_address', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(USERINFO))
      .mockResolvedValueOnce(jsonResponse(PLACE('Amsterdam, Netherlands', [4.9, 52.36])))

    const { res, captured } = mockRes()
    await location(mockReq({ query: 'amsterdam' }), res)

    expect(captured.status).toBe(200)
    expect(captured.body.formatted_address).toBe('Amsterdam, Netherlands')
  })

  it('answers 404 for an unmatched place and refunds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(USERINFO))
      .mockResolvedValueOnce(jsonResponse({ features: [] }))

    const { res, captured } = mockRes()
    await location(mockReq({ query: 'nowhere at all' }), res)

    expect(captured.status).toBe(404)
    expect(decr).toHaveBeenCalled()
  })

  it('rejects unknown properties', async () => {
    const { res, captured } = mockRes()
    await location(mockReq({ query: 'a', sneaky: true }), res)

    expect(captured.status).toBe(400)
  })
})

describe('/healthcheck', () => {
  it('reports config and quota without authentication or metering', async () => {
    const { res, captured } = mockRes()
    await healthcheck(mockReq(undefined, { method: 'GET', headers: {} }), res)

    expect(captured.status).toBe(200)
    expect(captured.body.configured).toEqual({
      routing_provider: true,
      usage_counter: true,
      quota_enforced: true,
    })
    expect(captured.body.monthly_call_count).toBe(5)
    expect(incr).not.toHaveBeenCalled()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
