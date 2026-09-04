import { describe, expect, it } from 'vitest'
import type { TripInput } from '../types/itinerary'
import { buildPrompt, CORE_SECTION_KEYS, parseItineraryResponse } from './prompt'

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
  transportPlan: [
    { from: '东京', to: '巴黎', mode: 'flight', duration: '13h', note: 'Direct flight from Haneda' },
  ],
  dailyPlans: [
    {
      day: 1,
      title: 'Arrival',
      activities: [{ time: '09:00', title: 'Land', description: 'Arrive at CDG' }],
    },
  ],
  budgetBreakdown: [{ category: 'Flights', amount: 100000, note: 'Round trip' }],
  mustEatFood: [{ name: 'Croissant', description: 'Buttery pastry from a local bakery' }],
  pitfallWarnings: ['Beware of petition-signing scams near the Eiffel Tower'],
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
    expect(result.transportPlan).toEqual(validItineraryJson.transportPlan)
    expect(result.dailyPlans).toEqual(validItineraryJson.dailyPlans)
    expect(result.budgetBreakdown).toEqual(validItineraryJson.budgetBreakdown)
    expect(result.mustEatFood).toEqual(validItineraryJson.mustEatFood)
    expect(result.pitfallWarnings).toEqual(validItineraryJson.pitfallWarnings)
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
    const { destination: _destination, ...withoutDestination } = validItineraryJson
    const result = parseItineraryResponse(JSON.stringify(withoutDestination), 'Fallback City')
    expect(result.destination).toBe('Fallback City')
  })

  it('defaults non-core optional array fields to [] when absent from the response', () => {
    const minimal = {
      dailyPlans: [{ day: 1, title: 'Day one', activities: [] }],
      transportPlan: validItineraryJson.transportPlan,
      budgetBreakdown: validItineraryJson.budgetBreakdown,
      mustEatFood: validItineraryJson.mustEatFood,
      pitfallWarnings: validItineraryJson.pitfallWarnings,
    }
    const result = parseItineraryResponse(JSON.stringify(minimal), 'Somewhere')
    expect(result.highlights).toEqual([])
    expect(result.route).toEqual([])
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

  describe('the 4 mandatory core sections (transportPlan, budgetBreakdown, mustEatFood, pitfallWarnings)', () => {
    it('accepts a response that includes all 4 core sections as non-empty arrays', () => {
      expect(() => parseItineraryResponse(JSON.stringify(validItineraryJson), '巴黎')).not.toThrow()
    })

    it.each(CORE_SECTION_KEYS)('throws AI_RESPONSE_MISSING_CORE_SECTIONS naming "%s" when that section is absent', (key) => {
      const { [key]: _omitted, ...withoutSection } = validItineraryJson
      expect(() => parseItineraryResponse(JSON.stringify(withoutSection), '巴黎')).toThrow(
        `AI_RESPONSE_MISSING_CORE_SECTIONS:${key}`,
      )
    })

    it.each(CORE_SECTION_KEYS)('throws AI_RESPONSE_MISSING_CORE_SECTIONS naming "%s" when that section is an empty array', (key) => {
      const withEmptySection = { ...validItineraryJson, [key]: [] }
      expect(() => parseItineraryResponse(JSON.stringify(withEmptySection), '巴黎')).toThrow(
        `AI_RESPONSE_MISSING_CORE_SECTIONS:${key}`,
      )
    })

    it('lists every missing core section, comma-separated, when multiple are absent', () => {
      const { transportPlan: _tp, pitfallWarnings: _pw, ...withTwoMissing } = validItineraryJson
      expect(() => parseItineraryResponse(JSON.stringify(withTwoMissing), '巴黎')).toThrow(
        'AI_RESPONSE_MISSING_CORE_SECTIONS:transportPlan,pitfallWarnings',
      )
    })
  })

  describe('known LLM JSON output quirks (not real captured samples — modeled on documented, common failure patterns)', () => {
    it('parses a response containing trailing commas before closing braces and brackets', () => {
      const raw = `{
        "destination": "巴黎",
        "transportPlan": [{"from": "东京", "to": "巴黎", "mode": "flight"},],
        "dailyPlans": [{"day": 1, "title": "Arrival", "activities": [],},],
        "budgetBreakdown": [{"category": "Flights", "amount": 100000},],
        "mustEatFood": [{"name": "Croissant", "description": "x"},],
        "pitfallWarnings": ["Beware of scams",],
      }`
      const result = parseItineraryResponse(raw, 'Fallback')
      expect(result.destination).toBe('巴黎')
      expect(result.dailyPlans).toHaveLength(1)
      expect(result.transportPlan).toHaveLength(1)
    })

    it('unwraps a response nested under a single wrapper key, e.g. {"itinerary": {...}}', () => {
      const wrapped = { itinerary: validItineraryJson }
      const result = parseItineraryResponse(JSON.stringify(wrapped), 'Fallback')
      expect(result.destination).toBe('巴黎')
      expect(result.dailyPlans).toHaveLength(1)
      expect(result.budgetBreakdown).toEqual(validItineraryJson.budgetBreakdown)
    })

    it('does not unwrap a single-key object whose inner value is not itinerary-shaped', () => {
      const raw = JSON.stringify({ data: { foo: 'bar' } })
      expect(() => parseItineraryResponse(raw, 'Paris')).toThrow('AI_RESPONSE_SHAPE_INVALID')
    })

    it('coerces a budgetBreakdown amount returned as a numeric string into a number', () => {
      const withStringAmount = {
        ...validItineraryJson,
        budgetBreakdown: [{ category: 'Flights', amount: '100000', note: 'Round trip' }],
      }
      const result = parseItineraryResponse(JSON.stringify(withStringAmount), '巴黎')
      expect(result.budgetBreakdown[0].amount).toBe(100000)
      expect(typeof result.budgetBreakdown[0].amount).toBe('number')
    })

    it('falls back to 0 for a budgetBreakdown amount that cannot be parsed as a number', () => {
      const withBadAmount = {
        ...validItineraryJson,
        budgetBreakdown: [{ category: 'Misc', amount: 'unknown', note: '' }],
      }
      const result = parseItineraryResponse(JSON.stringify(withBadAmount), '巴黎')
      expect(result.budgetBreakdown[0].amount).toBe(0)
    })
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

  it('explicitly requires all 4 core sections as non-empty, by name, in the user prompt', () => {
    const { userPrompt } = buildPrompt(baseInput, 'en')
    for (const key of CORE_SECTION_KEYS) {
      expect(userPrompt).toContain(`"${key}"`)
    }
    expect(userPrompt).toMatch(/MUST include all 4 of these core sections/)
  })

  describe('optional budget and days', () => {
    it('lets the model choose a sensible number of days when days is omitted', () => {
      const { days: _days, ...withoutDays } = baseInput
      const { userPrompt } = buildPrompt(withoutDays, 'en')
      expect(userPrompt).not.toContain('undefined')
      expect(userPrompt).toMatch(/choose a sensible.*number of days/i)
    })

    it('lets the model choose a reasonable budget when budget is omitted', () => {
      const { budget: _budget, ...withoutBudget } = baseInput
      const { userPrompt } = buildPrompt(withoutBudget, 'en')
      expect(userPrompt).not.toContain('undefined')
      expect(userPrompt).toMatch(/choose.*(reasonable|realistic).*budget/i)
    })

    it('instructs the model not to distort the itinerary to artificially fit an unrealistically low budget', () => {
      const { userPrompt } = buildPrompt(baseInput, 'en')
      expect(userPrompt).toMatch(/do not distort the (itinerary|plan)/i)
    })
  })

  describe('origin/destination region disambiguation', () => {
    it('interpolates the given origin and destination regions into the prompt', () => {
      const { userPrompt } = buildPrompt(
        { ...baseInput, originRegion: '日本 东京都', destinationRegion: 'France, Île-de-France' },
        'en',
      )
      expect(userPrompt).toContain('日本 东京都')
      expect(userPrompt).toContain('France, Île-de-France')
    })

    it('omits region qualifiers cleanly when no region is given', () => {
      const { userPrompt } = buildPrompt(baseInput, 'en')
      expect(userPrompt).not.toContain('undefined')
    })

    it('always instructs the model that place names are not globally unique and to disambiguate using region context', () => {
      const { userPrompt } = buildPrompt(baseInput, 'en')
      expect(userPrompt).toMatch(/not always unique|share the same name/i)
    })
  })
})
