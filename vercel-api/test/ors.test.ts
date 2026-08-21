import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { direction, geocode, OrsError, route } from '../lib/ors.js'

/**
 * Covers the mapping layer — the place bugs hide, because ORS and the CLI
 * contract disagree about units, coordinate order, and what a "summary" is.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const AMSTERDAM = {
  features: [
    {
      geometry: { coordinates: [4.9041, 52.3676] },
      properties: { label: 'Amsterdam, North Holland, Netherlands' },
    },
  ],
}

const UTRECHT = {
  features: [
    {
      geometry: { coordinates: [5.1214, 52.0907] },
      properties: { label: 'Utrecht, Netherlands' },
    },
  ],
}

const ROUTE = {
  routes: [
    {
      summary: { distance: 45200, duration: 2100 },
      segments: [
        {
          steps: [
            { name: 'Stadhouderskade', distance: 400 },
            { name: 'A10', distance: 12000 },
            { name: 'A2', distance: 30000 },
          ],
        },
      ],
    },
  ],
}

beforeEach(() => {
  process.env.ORS_API_KEY = 'test-key'
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ORS_API_KEY
})

describe('geocode', () => {
  it('returns the Pelias label and [lon, lat] coordinates', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(AMSTERDAM))

    await expect(geocode('amsterdam')).resolves.toEqual({
      label: 'Amsterdam, North Holland, Netherlands',
      coordinates: [4.9041, 52.3676],
    })
  })

  it('authenticates the geocoder by query param', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(AMSTERDAM))

    await geocode('amsterdam')

    const url = vi.mocked(fetch).mock.calls[0]![0] as URL
    expect(url.searchParams.get('api_key')).toBe('test-key')
    expect(url.searchParams.get('text')).toBe('amsterdam')
  })

  it('raises NOT_FOUND when nothing matches', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ features: [] }))

    await expect(geocode('nowhere at all')).rejects.toMatchObject({ kind: 'NOT_FOUND' })
  })

  it('distinguishes provider rate-limiting from other failures', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 429))

    await expect(geocode('amsterdam')).rejects.toMatchObject({ kind: 'QUOTA_EXCEEDED' })
  })

  it('reports a missing deployment key as a provider error', async () => {
    delete process.env.ORS_API_KEY

    await expect(geocode('amsterdam')).rejects.toBeInstanceOf(OrsError)
  })
})

describe('route', () => {
  const origin = { label: 'Amsterdam', coordinates: [4.9041, 52.3676] as [number, number] }
  const destination = { label: 'Utrecht', coordinates: [5.1214, 52.0907] as [number, number] }

  it('maps ORS metres and seconds onto the five contract fields', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROUTE))

    await expect(route(origin, destination)).resolves.toEqual({
      start: 'Amsterdam',
      end: 'Utrecht',
      summary: 'A2 and A10',
      distance: '45.2 km',
      duration: '35 mins',
    })
  })

  it('sends coordinates in ORS [lon, lat] order and authenticates by header', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROUTE))

    await route(origin, destination)

    const [url, init] = vi.mocked(fetch).mock.calls[0]! as [string, RequestInit]
    expect(url).toContain('/v2/directions/driving-car')
    expect((init.headers as Record<string, string>).Authorization).toBe('test-key')
    expect(JSON.parse(init.body as string).coordinates).toEqual([
      [4.9041, 52.3676],
      [5.1214, 52.0907],
    ])
  })

  it('honours a non-default profile', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROUTE))

    await route(origin, destination, 'cycling-regular')

    expect(vi.mocked(fetch).mock.calls[0]![0]).toContain('/v2/directions/cycling-regular')
  })

  it('treats an unroutable pair as NOT_FOUND, not an outage', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'no route' }, 404))

    await expect(route(origin, destination)).rejects.toMatchObject({ kind: 'NOT_FOUND' })
  })

  it('tolerates the empty summary ORS returns for coincident points', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ routes: [{ segments: [] }] }))

    await expect(route(origin, destination)).resolves.toMatchObject({
      distance: '0 m',
      duration: '1 min',
      summary: 'driving car',
    })
  })
})

describe('direction', () => {
  it('geocodes both endpoints then routes between them', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(AMSTERDAM))
      .mockResolvedValueOnce(jsonResponse(UTRECHT))
      .mockResolvedValueOnce(jsonResponse(ROUTE))

    const result = await direction('amsterdam', 'utrecht')

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
    expect(result.start).toBe('Amsterdam, North Holland, Netherlands')
    expect(result.end).toBe('Utrecht, Netherlands')
  })

  it('surfaces a geocoding miss without attempting to route', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(AMSTERDAM))
      .mockResolvedValueOnce(jsonResponse({ features: [] }))

    await expect(direction('amsterdam', 'nowhere')).rejects.toMatchObject({ kind: 'NOT_FOUND' })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })
})
