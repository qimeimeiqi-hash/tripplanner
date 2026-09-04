import { beforeEach, describe, expect, it } from 'vitest'
import type { TripRecord } from '../types/itinerary'
import { useTripStore } from './tripStore'

function makeTrip(id: string, createdAt = Date.now()): TripRecord {
  return {
    id,
    createdAt,
    input: {
      origin: '东京',
      destination: '巴黎',
      budget: 100000,
      currency: 'JPY',
      days: 3,
      transportMode: 'flight',
      preferences: [],
      travelerCount: 1,
      accessibilityNeeds: [],
    },
    itinerary: {
      destination: '巴黎',
      summary: '',
      highlights: [],
      route: [],
      transportPlan: [],
      dailyPlans: [],
      budgetBreakdown: [],
      mustEatFood: [],
      pitfallWarnings: [],
      equipment: [],
      tips: [],
    },
  }
}

describe('useTripStore', () => {
  beforeEach(() => {
    useTripStore.setState({ history: [] }, false)
    window.localStorage.clear()
  })

  it('starts with an empty history', () => {
    expect(useTripStore.getState().history).toEqual([])
  })

  it('addTrip prepends the new trip so the newest entry is first', () => {
    useTripStore.getState().addTrip(makeTrip('first'))
    useTripStore.getState().addTrip(makeTrip('second'))

    const { history } = useTripStore.getState()
    expect(history.map((t) => t.id)).toEqual(['second', 'first'])
  })

  it('caps history at 50 entries, dropping the oldest ones', () => {
    for (let i = 0; i < 55; i++) {
      useTripStore.getState().addTrip(makeTrip(`trip-${i}`))
    }

    const { history } = useTripStore.getState()
    expect(history).toHaveLength(50)
    // Most recently added (trip-54) must be kept; the oldest five (trip-0..trip-4) must be dropped.
    expect(history[0].id).toBe('trip-54')
    expect(history.map((t) => t.id)).not.toContain('trip-0')
    expect(history.map((t) => t.id)).not.toContain('trip-4')
    expect(history.map((t) => t.id)).toContain('trip-5')
  })

  it('removeTrip deletes only the matching trip and leaves the rest untouched', () => {
    useTripStore.getState().addTrip(makeTrip('keep-1'))
    useTripStore.getState().addTrip(makeTrip('remove-me'))
    useTripStore.getState().addTrip(makeTrip('keep-2'))

    useTripStore.getState().removeTrip('remove-me')

    const ids = useTripStore.getState().history.map((t) => t.id)
    expect(ids).toEqual(['keep-2', 'keep-1'])
  })

  it('removeTrip with a non-existent id leaves history unchanged', () => {
    useTripStore.getState().addTrip(makeTrip('only-trip'))
    useTripStore.getState().removeTrip('does-not-exist')
    expect(useTripStore.getState().history.map((t) => t.id)).toEqual(['only-trip'])
  })

  it('clearHistory empties the history array', () => {
    useTripStore.getState().addTrip(makeTrip('a'))
    useTripStore.getState().addTrip(makeTrip('b'))

    useTripStore.getState().clearHistory()

    expect(useTripStore.getState().history).toEqual([])
  })

  it('renameTrip sets the name on only the matching trip', () => {
    useTripStore.getState().addTrip(makeTrip('a'))
    useTripStore.getState().addTrip(makeTrip('b'))

    useTripStore.getState().renameTrip('a', '巴黎散心之旅')

    const { history } = useTripStore.getState()
    expect(history.find((t) => t.id === 'a')?.name).toBe('巴黎散心之旅')
    expect(history.find((t) => t.id === 'b')?.name).toBeUndefined()
  })

  it('renameTrip with an empty/whitespace-only name clears the custom name', () => {
    useTripStore.getState().addTrip(makeTrip('a'))
    useTripStore.getState().renameTrip('a', 'My Trip')

    useTripStore.getState().renameTrip('a', '   ')

    expect(useTripStore.getState().history.find((t) => t.id === 'a')?.name).toBeUndefined()
  })

  it('renameTrip with a non-existent id leaves history unchanged', () => {
    useTripStore.getState().addTrip(makeTrip('only-trip'))
    useTripStore.getState().renameTrip('does-not-exist', 'New Name')
    expect(useTripStore.getState().history.find((t) => t.id === 'only-trip')?.name).toBeUndefined()
  })

  it('updateTripItinerary replaces only the matching trip\'s itinerary, leaving input/id/createdAt untouched', () => {
    const original = makeTrip('a')
    useTripStore.getState().addTrip(original)
    const updatedItinerary = { ...original.itinerary, summary: 'Updated after a tweak' }

    useTripStore.getState().updateTripItinerary('a', updatedItinerary)

    const trip = useTripStore.getState().history.find((t) => t.id === 'a')
    expect(trip?.itinerary.summary).toBe('Updated after a tweak')
    expect(trip?.input).toEqual(original.input)
    expect(trip?.createdAt).toBe(original.createdAt)
  })

  it('updateTripItinerary with a non-existent id leaves history unchanged', () => {
    const original = makeTrip('only-trip')
    useTripStore.getState().addTrip(original)

    useTripStore.getState().updateTripItinerary('does-not-exist', { ...original.itinerary, summary: 'x' })

    expect(useTripStore.getState().history.find((t) => t.id === 'only-trip')?.itinerary.summary).toBe('')
  })
})
