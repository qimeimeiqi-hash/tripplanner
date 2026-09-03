import { describe, expect, it } from 'vitest'
import type { TripInput } from '../types/itinerary'
import { buildPrompt, parseItineraryResponse } from './prompt'

const baseInput: TripInput = {
  origin: '东京',
  destination: '巴黎',
  budget: 200000,
  currency: 'JPY',
  days: 5,
  transportMode: 'flight',
  preferences: ['history', 'food'],
}

const validItineraryJson = {
  destination: '巴黎',
  summary: 'A wonderful trip.',
  highlights: [{ name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945 }],
  route: [{ name: 'Tokyo', lat: 35.6762, lng: 139.6503 }],
  dailyPlans: [
    {
      day: 1,
      title: 'Arrival',
      activities: [{ time: '09:00', title: 'Land', description: 'Arrive at CDG' }],
    },
  ],
  budgetBreakdown: [{ category: 'Flights', amount: 100000, note: 'Round trip' }],
  equipment: [{ category: 'Clothing', items: ['Jacket'] }],
  tips: ['Bring an umbrella'],
}

describe('parseItineraryResponse', () => {
  it('parses a plain JSON object and preserves all provided fields', () => {
    const result = parseItineraryResponse(JSON.stringify(validItineraryJson), '巴黎')
    expect(result.destination).toBe('巴黎')
    expect(result.summary).toBe('A wonderful trip.')
    expect(result.highlights).toEqual(validItineraryJson.highlights)
    expect(result.route).toEqual(validItineraryJson.route)
    expect(result.dailyPlans).toEqual(validItineraryJson.dailyPlans)
    expect(result.budgetBreakdown).toEqual(validItineraryJson.budgetBreakdown)
    expect(result.equipment).toEqual(validItineraryJson.equipment)
    expect(result.tips).toEqual(['Bring an umbrella'])
  })

  it('extracts JSON from inside a ```json fenced code block', () => {
    const raw = ['Here is your itinerary:', '```json', JSON.stringify(validItineraryJson), '```'].join('\n')
    const result = parseItineraryResponse(raw, '巴黎')
    expect(result.destination).toBe('巴黎')
    expect(result.dailyPlans).toHaveLength(1)
  })

  it('extracts JSON from inside an unlabeled ``` fenced code block', () => {
    const raw = ['```', JSON.stringify(validItineraryJson), '```'].join('\n')
    const result = parseItineraryResponse(raw, '巴黎')
    expect(result.destination).toBe('巴黎')
  })

  it('extracts the JSON object when surrounded by leading/trailing prose text', () => {
    const raw = `Sure! Here's the plan:\n${JSON.stringify(validItineraryJson)}\nHope that helps!`
    const result = parseItineraryResponse(raw, '巴黎')
    expect(result.destination).toBe('巴黎')
    expect(result.dailyPlans).toHaveLength(1)
  })

  it('falls back to the given destination when the response omits it', () => {
    const { destination, ...withoutDestination } = validItineraryJson
    const result = parseItineraryResponse(JSON.stringify(withoutDestination), 'Fallback City')
    expect(result.destination).toBe('Fallback City')
  })

  it('defaults every optional array field to [] when absent from the response', () => {
    const minimal = { dailyPlans: [{ day: 1, title: 'Day one', activities: [] }] }
    const result = parseItineraryResponse(JSON.stringify(minimal), 'Somewhere')
    expect(result.highlights).toEqual([])
    expect(result.route).toEqual([])
    expect(result.budgetBreakdown).toEqual([])
    expect(result.equipment).toEqual([])
    expect(result.tips).toEqual([])
    expect(result.summary).toBe('')
  })

  it('throws AI_RESPONSE_NOT_JSON when the response is not parseable as JSON', () => {
    expect(() => parseItineraryResponse('this is not json at all', 'Paris')).toThrow(
      'AI_RESPONSE_NOT_JSON',
    )
  })

  it('throws AI_RESPONSE_SHAPE_INVALID when dailyPlans is missing', () => {
    const withoutDailyPlans = { destination: 'Paris', summary: 'x' }
    expect(() => parseItineraryResponse(JSON.stringify(withoutDailyPlans), 'Paris')).toThrow(
      'AI_RESPONSE_SHAPE_INVALID',
    )
  })

  it('throws AI_RESPONSE_SHAPE_INVALID when dailyPlans is present but not an array', () => {
    const withWrongType = { destination: 'Paris', dailyPlans: 'day one, day two' }
    expect(() => parseItineraryResponse(JSON.stringify(withWrongType), 'Paris')).toThrow(
      'AI_RESPONSE_SHAPE_INVALID',
    )
  })

  it('throws AI_RESPONSE_SHAPE_INVALID when the response is a JSON array, not an object', () => {
    expect(() => parseItineraryResponse('[1, 2, 3]', 'Paris')).toThrow('AI_RESPONSE_SHAPE_INVALID')
  })
})

describe('buildPrompt', () => {
  it('interpolates every trip input field into the user prompt', () => {
    const { userPrompt } = buildPrompt(baseInput, 'en')
    expect(userPrompt).toContain('东京')
    expect(userPrompt).toContain('巴黎')
    expect(userPrompt).toContain('5 day(s)')
    expect(userPrompt).toContain('200000 JPY')
    expect(userPrompt).toContain('flight')
    expect(userPrompt).toContain('history, food')
  })

  it('falls back to a generic preference note when the preferences list is empty', () => {
    const { userPrompt } = buildPrompt({ ...baseInput, preferences: [] }, 'en')
    expect(userPrompt).toContain('no strong preference, general sightseeing')
  })

  it('instructs the model to write narrative content in the selected language', () => {
    expect(buildPrompt(baseInput, 'zh').systemPrompt).toContain('Simplified Chinese')
    expect(buildPrompt(baseInput, 'ja').systemPrompt).toContain('Japanese')
    expect(buildPrompt(baseInput, 'en').systemPrompt).toContain('English')
  })

  it('requires exactly the requested number of days to be covered', () => {
    const { userPrompt } = buildPrompt({ ...baseInput, days: 9 }, 'en')
    expect(userPrompt).toContain('exactly 9 day(s)')
  })
})
