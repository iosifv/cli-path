/**
 * ORS reports raw metres and seconds. `cli-app/utils/style.js`'s
 * `print.direction()` prints `distance` and `duration` verbatim, and the Google
 * engine (cli-app/lib/clients/GoogleApi.js) hands it pre-formatted strings like
 * "1 hr 23 min". Both engines have to look identical on screen, so the
 * formatting happens here rather than in the CLI.
 */

/** Metres → "850 m" / "12.3 km" / "123 km", mirroring Google's `distance.text`. */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) {
    return 'unknown'
  }
  if (metres < 1000) {
    return `${Math.round(metres)} m`
  }
  const km = metres / 1000
  return km < 100 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

/** Seconds → "5 mins" / "1 hr 23 min" / "2 days 3 hr", mirroring Google's `duration.text`. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 'unknown'
  }

  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 1) {
    return '1 min'
  }

  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    const dayPart = `${days} ${days === 1 ? 'day' : 'days'}`
    return hours > 0 ? `${dayPart} ${hours} hr` : dayPart
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`
  }
  return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`
}

type NamedStep = { name?: string; distance?: number }

/** A route designation such as "A4", "S106", "N44" — as opposed to a street name. */
const ROUTE_DESIGNATION = /^[A-Z]{1,3}\s?\d{1,4}$/

/**
 * The road names carried by one step.
 *
 * ORS packs several designations into a single `name` — a step on the A4 near
 * Amsterdam comes back as "Nieuwe Haagseweg, A4", the local street name and the
 * motorway number together. Treating that whole string as one road splits the
 * A4's distance across two entries and lets a mostly-duplicate name outrank a
 * genuinely distinct motorway: an Amsterdam→Rotterdam route summarised as
 * "A4 and Nieuwe Haagseweg, A4" instead of "A4 and A13".
 *
 * So split the parts, and when a step carries a route designation alongside a
 * street name, keep only the designation — that is how a route is described
 * out loud, and it matches what the Google engine puts in the same field.
 */
function roadNames(name: string | undefined): string[] {
  const parts = (name ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '-')

  if (parts.length === 0) {
    return []
  }

  const designations = parts.filter((part) => ROUTE_DESIGNATION.test(part))
  return designations.length > 0 ? designations : parts
}

/**
 * Google's `routes[0].summary` is a road-name string such as "A10 and A2".
 * ORS has no equivalent field, but every routing step carries the road `name`,
 * so the two roads the route spends the most distance on reproduce that shape.
 *
 * ORS uses "-" for unnamed ways; those are skipped.
 */
export function summarizeRoads(steps: NamedStep[], fallback: string): string {
  const distanceByRoad = new Map<string, number>()

  for (const step of steps) {
    for (const name of roadNames(step.name)) {
      distanceByRoad.set(name, (distanceByRoad.get(name) ?? 0) + (step.distance ?? 0))
    }
  }

  const topRoads = [...distanceByRoad.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name)

  if (topRoads.length === 0) {
    return fallback
  }
  return topRoads.join(' and ')
}
