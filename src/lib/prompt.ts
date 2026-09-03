import type { SupportedLanguage } from '../store/settingsStore'
import type { Itinerary, TripInput } from '../types/itinerary'

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  zh: 'Simplified Chinese (简体中文)',
  ja: 'Japanese (日本語)',
  en: 'English',
}

const JSON_SCHEMA_HINT = `{
  "destination": string,
  "summary": string,               // 2-4 sentence trip overview
  "highlights": [{"name": string, "lat": number, "lng": number}],  // 4-8 must-see spots
  "route": [{"name": string, "lat": number, "lng": number}],       // ordered waypoints for the whole trip, including origin and destination
  "dailyPlans": [
    {
      "day": number,
      "title": string,
      "activities": [
        {
          "time": string,          // e.g. "09:00"
          "title": string,
          "description": string,
          "location": {"name": string, "lat": number, "lng": number}
        }
      ],
      "meals": string,
      "transportNote": string
    }
  ],
  "budgetBreakdown": [{"category": string, "amount": number, "note": string}],
  "equipment": [{"category": string, "items": [string]}],
  "tips": [string]
}`

export function buildPrompt(input: TripInput, language: SupportedLanguage) {
  const langName = LANGUAGE_NAMES[language]

  const systemPrompt = `You are an expert global travel planner. You produce detailed, practical, and geographically accurate travel itineraries. You always respond with a single valid JSON object matching the requested schema, with no markdown fences, no commentary, and no trailing text before or after the JSON. All latitude/longitude coordinates must be real and accurate for the named place. All narrative text fields (summary, titles, descriptions, notes, tips, equipment item names) must be written in ${langName}.`

  const userPrompt = `Plan a trip with the following constraints:
- Origin: ${input.origin}
- Destination: ${input.destination}
- Trip length: ${input.days} days
- Budget: ${input.budget} ${input.currency} (total, for the whole trip)
- Primary transport mode: ${input.transportMode}
- Traveler preferences / interests: ${input.preferences.join(', ') || 'no strong preference, general sightseeing'}

Requirements:
1. Cover exactly ${input.days} day(s) in "dailyPlans", each with a realistic schedule (morning/afternoon/evening) that respects travel time between locations.
2. "highlights" must be real, well-known points of interest at the destination relevant to the stated preferences.
3. "route" should be an ordered list of waypoints representing the overall trip geography (can reuse highlight coordinates), suitable for drawing a line on a map.
4. "budgetBreakdown" categories should sum to approximately the given budget (transport, lodging, food, activities, misc.) in ${input.currency}.
5. "equipment" should be a practical packing checklist grouped by category (clothing, electronics, documents, health, destination-specific gear), tailored to the destination's climate/season and the trip's activities.
6. Respond with ONLY the JSON object, matching this shape:

${JSON_SCHEMA_HINT}`

  return { systemPrompt, userPrompt }
}

export function parseItineraryResponse(raw: string, fallbackDestination: string): Itinerary {
  const jsonText = extractJson(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('AI_RESPONSE_NOT_JSON')
  }

  const obj = parsed as Partial<Itinerary>
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.dailyPlans)) {
    throw new Error('AI_RESPONSE_SHAPE_INVALID')
  }

  return {
    destination: obj.destination || fallbackDestination,
    summary: obj.summary || '',
    highlights: Array.isArray(obj.highlights) ? obj.highlights : [],
    route: Array.isArray(obj.route) ? obj.route : [],
    dailyPlans: obj.dailyPlans,
    budgetBreakdown: Array.isArray(obj.budgetBreakdown) ? obj.budgetBreakdown : [],
    equipment: Array.isArray(obj.equipment) ? obj.equipment : [],
    tips: Array.isArray(obj.tips) ? obj.tips : [],
  }
}

function extractJson(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}
