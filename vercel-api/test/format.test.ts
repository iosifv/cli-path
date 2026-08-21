import { describe, expect, it } from 'vitest'
import { formatDistance, formatDuration, summarizeRoads } from '../lib/format.js'

describe('formatDistance', () => {
  it('uses metres below a kilometre', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(850)).toBe('850 m')
    expect(formatDistance(999.4)).toBe('999 m')
  })

  it('uses one decimal for short kilometre distances', () => {
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(12345)).toBe('12.3 km')
  })

  it('drops the decimal past 100 km, as Google does', () => {
    expect(formatDistance(123456)).toBe('123 km')
  })

  it('degrades rather than throwing on nonsense', () => {
    expect(formatDistance(NaN)).toBe('unknown')
    expect(formatDistance(-5)).toBe('unknown')
  })
})

describe('formatDuration', () => {
  it('renders minutes', () => {
    expect(formatDuration(60)).toBe('1 min')
    expect(formatDuration(300)).toBe('5 mins')
  })

  it('never rounds a real journey down to zero', () => {
    expect(formatDuration(1)).toBe('1 min')
    expect(formatDuration(29)).toBe('1 min')
  })

  it('renders hours and minutes like Google', () => {
    expect(formatDuration(4980)).toBe('1 hr 23 min')
    expect(formatDuration(7200)).toBe('2 hr')
  })

  it('renders multi-day journeys', () => {
    expect(formatDuration(183600)).toBe('2 days 3 hr')
    expect(formatDuration(86400)).toBe('1 day')
  })

  it('degrades rather than throwing on nonsense', () => {
    expect(formatDuration(NaN)).toBe('unknown')
    expect(formatDuration(-5)).toBe('unknown')
  })
})

describe('summarizeRoads', () => {
  it('reproduces the "A10 and A2" shape from step road names', () => {
    const steps = [
      { name: 'Local Street', distance: 300 },
      { name: 'A10', distance: 40000 },
      { name: 'A2', distance: 25000 },
      { name: 'A10', distance: 5000 },
    ]
    expect(summarizeRoads(steps, 'driving car')).toBe('A10 and A2')
  })

  it('ignores ORS unnamed ways', () => {
    const steps = [
      { name: '-', distance: 90000 },
      { name: 'B5', distance: 100 },
    ]
    expect(summarizeRoads(steps, 'driving car')).toBe('B5')
  })

  it('prefers the route designation when a step carries a street name too', () => {
    // ORS labels motorway steps with both names: "Nieuwe Haagseweg, A4".
    const steps = [
      { name: 'A4', distance: 26131 },
      { name: 'Nieuwe Haagseweg, A4', distance: 18172 },
      { name: 'A13', distance: 12804 },
      { name: 'A13', distance: 5339 },
      { name: 'A4', distance: 2352 },
    ]
    // Taken verbatim from a live Amsterdam -> Rotterdam route. Without the
    // split, "Nieuwe Haagseweg, A4" counts as its own road, outranks A13 and
    // yields "A4 and Nieuwe Haagseweg, A4" — naming the same motorway twice.
    expect(summarizeRoads(steps, 'driving car')).toBe('A4 and A13')
  })

  it('keeps street names when no step carries a designation', () => {
    const steps = [
      { name: 'Damstraat, Kalverstraat', distance: 400 },
      { name: 'Kalverstraat', distance: 300 },
    ]
    expect(summarizeRoads(steps, 'foot walking')).toBe('Kalverstraat and Damstraat')
  })

  it('falls back when nothing is named', () => {
    expect(summarizeRoads([{ name: '-', distance: 10 }], 'driving car')).toBe('driving car')
    expect(summarizeRoads([], 'foot walking')).toBe('foot walking')
  })
})
