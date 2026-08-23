import {
  ORS_DEFAULT_PROFILE,
  ORS_DIRECTIONS_URL,
  ORS_GEOCODE_URL,
  ORS_TIMEOUT_MS,
} from '../utils/constants.js'
import { formatDistance, formatDuration, summarizeRoads } from './format.js'

/**
 * OpenRouteService client.
 *
 * Two mismatches with the Google-shaped contract are resolved here:
 *
 *   - ORS routing takes coordinates, not free text, so a direction lookup
 *     geocodes both endpoints first. One CLI request, three ORS calls.
 *   - ORS returns metres and seconds with no road-name summary, so
 *     `lib/format.ts` maps them onto the five pre-formatted strings that
 *     `print.direction()` expects.
 */

export class OrsError extends Error {
  readonly kind: 'NOT_FOUND' | 'PROVIDER_ERROR' | 'QUOTA_EXCEEDED'

  constructor(kind: OrsError['kind'], message: string) {
    super(message)
    this.name = 'OrsError'
    this.kind = kind
  }
}

export type Place = {
  label: string
  coordinates: [number, number] // [lon, lat], the order ORS uses
}

export type Direction = {
  start: string
  end: string
  summary: string
  distance: string
  duration: string
}

function apiKey(): string {
  const key = process.env.ORS_API_KEY
  if (!key) {
    throw new OrsError('PROVIDER_ERROR', 'ORS_API_KEY is not configured on this deployment.')
  }
  return key
}

/** ORS answers 429 when the shared free tier is exhausted; surface that distinctly. */
function assertOk(response: Response, what: string): void {
  if (response.ok) {
    return
  }
  if (response.status === 429) {
    throw new OrsError(
      'QUOTA_EXCEEDED',
      'The routing provider is rate-limiting this service. Try again shortly.'
    )
  }
  throw new OrsError('PROVIDER_ERROR', `The routing provider failed during ${what}.`)
}

/**
 * Forward geocode free text to a single best match.
 * The geocoder is a Pelias instance and authenticates by query param.
 */
export async function geocode(text: string): Promise<Place> {
  const url = new URL(ORS_GEOCODE_URL)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('text', text)
  url.searchParams.set('size', '1')

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(ORS_TIMEOUT_MS) })
  } catch (error) {
    console.error('ORS geocode is unreachable', error)
    throw new OrsError('PROVIDER_ERROR', 'Could not reach the geocoding provider.')
  }

  assertOk(response, 'geocoding')

  const body = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] }
      properties?: { label?: string }
    }>
  }

  const feature = body.features?.[0]
  const coordinates = feature?.geometry?.coordinates
  const label = feature?.properties?.label

  if (!feature || !coordinates || coordinates.length !== 2 || !label) {
    throw new OrsError('NOT_FOUND', `No place matched "${text}".`)
  }

  return { label, coordinates: [coordinates[0], coordinates[1]] }
}

/** Route between two geocoded places and map the result onto the CLI's shape. */
export async function route(
  origin: Place,
  destination: Place,
  profile: string = ORS_DEFAULT_PROFILE
): Promise<Direction> {
  let response: Response
  try {
    response = await fetch(`${ORS_DIRECTIONS_URL}/${profile}`, {
      method: 'POST',
      headers: {
        Authorization: apiKey(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        coordinates: [origin.coordinates, destination.coordinates],
        instructions: true,
        units: 'm',
      }),
      signal: AbortSignal.timeout(ORS_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('ORS directions is unreachable', error)
    throw new OrsError('PROVIDER_ERROR', 'Could not reach the routing provider.')
  }

  // "No route is possible" is a user-facing miss, not an outage — but ORS
  // signals it in two different ways, and only one of them is a 404.
  //
  // A 400 carrying one of the codes below means the request was well-formed
  // and the answer is simply that no route exists: 2004 the route would exceed
  // the server's 6000km ceiling, 2009 no route could be found, 2010 an endpoint
  // could not be snapped to the road network. Any other 400 means *we* sent
  // something malformed, which is a real fault on this side.
  const NO_ROUTE_CODES = new Set([2004, 2009, 2010])

  if (response.status === 404 || response.status === 400) {
    let code: number | undefined
    try {
      const problem = (await response.clone().json()) as { error?: { code?: number } }
      code = problem.error?.code
    } catch {
      // Body wasn't JSON; fall through on status alone.
    }

    if (response.status === 404 || (code !== undefined && NO_ROUTE_CODES.has(code))) {
      // Name both resolved places. The geocoder picks the single best match for
      // free text, and "eiffel" resolving to a Las Vegas replica is far easier
      // to spot when the message says so than when it reports a failure.
      throw new OrsError(
        'NOT_FOUND',
        `No ${profile} route exists between "${origin.label}" and "${destination.label}". ` +
          `Try more specific place names if those are not the places you meant.`
      )
    }

    console.error('ORS rejected the routing request with code', code)
  }

  assertOk(response, 'routing')

  const body = (await response.json()) as {
    routes?: Array<{
      summary?: { distance?: number; duration?: number }
      segments?: Array<{ steps?: Array<{ name?: string; distance?: number }> }>
    }>
  }

  const found = body.routes?.[0]
  if (!found) {
    throw new OrsError(
      'NOT_FOUND',
      `No ${profile} route exists between "${origin.label}" and "${destination.label}".`
    )
  }

  // ORS omits `summary` entirely when origin and destination resolve to the
  // same point; treat that as a zero-length route rather than an error.
  const distance = found.summary?.distance ?? 0
  const duration = found.summary?.duration ?? 0
  const steps = (found.segments ?? []).flatMap((segment) => segment.steps ?? [])

  return {
    start: origin.label,
    end: destination.label,
    summary: summarizeRoads(steps, profile.replace('-', ' ')),
    distance: formatDistance(distance),
    duration: formatDuration(duration),
  }
}

/** Geocode both endpoints and route between them. */
export async function direction(
  originQuery: string,
  destinationQuery: string,
  profile: string = ORS_DEFAULT_PROFILE
): Promise<Direction> {
  const [origin, destination] = await Promise.all([geocode(originQuery), geocode(destinationQuery)])
  return route(origin, destination, profile)
}
