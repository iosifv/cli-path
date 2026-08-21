/**
 * Auth0 stays exactly as the archived stack had it — the CLI's device flow
 * (cli-app/commands/authenticate.js) is provider-agnostic and unchanged.
 */
export const AUTH0_URL = 'https://iosifv.eu.auth0.com/'
export const AUTH0_URL_USERINFO = AUTH0_URL + 'userinfo'

/**
 * OpenRouteService. Geocoding is a Pelias instance and authenticates with an
 * `api_key` query param; the v2 routing endpoints authenticate with an
 * `Authorization` header holding the bare key (no `Bearer ` prefix).
 */
export const ORS_BASE_URL = 'https://api.openrouteservice.org'
export const ORS_GEOCODE_URL = ORS_BASE_URL + '/geocode/search'
export const ORS_DIRECTIONS_URL = ORS_BASE_URL + '/v2/directions'
export const ORS_DEFAULT_PROFILE = 'driving-car'
export const ORS_PROFILES = [
  'driving-car',
  'driving-hgv',
  'cycling-regular',
  'cycling-road',
  'cycling-mountain',
  'cycling-electric',
  'foot-walking',
  'foot-hiking',
  'wheelchair',
] as const

/** ORS answers slowly on cold cache; the archived 1000ms Google timeout is far too tight here. */
export const ORS_TIMEOUT_MS = Number(process.env.CLIP_ORS_TIMEOUT_MS ?? 8000)
export const AUTH0_TIMEOUT_MS = Number(process.env.CLIP_AUTH0_TIMEOUT_MS ?? 5000)

/**
 * The global cap. Counts *client* requests, not upstream ORS calls — one
 * `/direction` fans out to three ORS calls (two geocodes + one route) but
 * costs one unit of this budget.
 */
export const MAXIMUM_ALLOWED_MONTHLY_CALLS = Number(process.env.CLIP_MAX_MONTHLY_CALLS ?? 1000)

export const COUNTER_KEY_PREFIX = 'calls:'
/** ~70 days: long enough that a month's key outlives the month, short enough to self-clean. */
export const COUNTER_TTL_SECONDS = 70 * 24 * 60 * 60
