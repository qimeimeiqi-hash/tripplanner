import type { SupportedLanguage } from '../store/settingsStore'
import type { AccessibilityNeed, BudgetItem, Itinerary, TripInput } from '../types/itinerary'

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  zh: 'Simplified Chinese (简体中文)',
  ja: 'Japanese (日本語)',
  en: 'English',
}

const ACCESSIBILITY_DESCRIPTIONS: Record<AccessibilityNeed, string> = {
  elderly: 'traveling with elderly member(s) — avoid excessive walking/stairs, prefer accessible transport and a relaxed pace',
  children: 'traveling with children — favor family-friendly activities and pacing, avoid overly long or late outings',
  wheelchair: 'wheelchair accessibility required — only include venues, transport, and routes that are wheelchair-accessible',
}

/**
 * The 4 core modules every generated itinerary must include. Keys match the
 * corresponding field name on `Itinerary`. Enforced both in the prompt sent
 * to the model and by `parseItineraryResponse`'s post-parse validation.
 */
export const CORE_SECTION_KEYS = [
  'transportPlan',
  'budgetBreakdown',
  'mustEatFood',
  'pitfallWarnings',
] as const

export type CoreSectionKey = (typeof CORE_SECTION_KEYS)[number]

const JSON_SCHEMA_HINT = `{
  "destination": string,
  "summary": string,               // 2-4 sentence trip overview
  "highlights": [{"name": string, "lat": number, "lng": number, "openingHours": string, "closedDays": string, "ticketPrice": string, "officialNote": string}],  // 4-8 must-see spots; the last 4 fields are best-effort estimates and may be omitted if genuinely unknown — never invented with false confidence
  "route": [{"name": string, "lat": number, "lng": number}],       // ordered waypoints for the whole trip, including origin and destination
  "transportPlan": [{"from": string, "to": string, "mode": string, "duration": string, "note": string}],  // REQUIRED, non-empty: every transport leg of the trip (origin -> destination, and between cities/regions visited), e.g. flight numbers/routes, train lines, transfer instructions
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
  "budgetBreakdown": [{"category": string, "amount": number, "note": string}],  // REQUIRED, non-empty
  "mustEatFood": [{"name": string, "description": string, "location": {"name": string, "lat": number, "lng": number}}],  // REQUIRED, non-empty: local specialties/dishes/restaurants the traveler must try at this destination
  "pitfallWarnings": [string],      // REQUIRED, non-empty: common scams, tourist traps, safety hazards, or mistakes travelers should specifically avoid at this destination
  "equipment": [{"category": string, "items": [string]}],
  "tips": [string]
}`

export function buildPrompt(input: TripInput, language: SupportedLanguage) {
  const langName = LANGUAGE_NAMES[language]

  const originLine = input.originRegion ? `${input.origin} (${input.originRegion})` : input.origin
  const destinationLine = input.destinationRegion
    ? `${input.destination} (${input.destinationRegion})`
    : input.destination

  const tripLengthLine = input.days
    ? `${input.days} days (fixed)`
    : 'not specified by the traveler — choose a sensible number of days for this destination and trip style (typically 3-10 days)'

  const budgetLine = input.budget
    ? `${input.budget} ${input.currency} (total, for the whole trip). If this is unrealistically low for a safe, reasonable version of this trip, do not distort the itinerary to artificially fit it — plan the most cost-effective realistic trip instead, even if its true cost exceeds this budget; any shortfall will be flagged separately to the traveler.`
    : `not specified by the traveler — choose and clearly itemize a reasonable, realistic total budget for this kind of trip in ${input.currency}, based on the destination, trip length, and transport mode.`

  const dailyPlansRequirement = input.days
    ? `Cover exactly ${input.days} day(s) in "dailyPlans"`
    : 'Cover a sensible number of days (typically 3-10, chosen based on the destination and trip style) in "dailyPlans"'

  const accessibilityLine =
    input.accessibilityNeeds.length > 0
      ? input.accessibilityNeeds.map((need) => ACCESSIBILITY_DESCRIPTIONS[need]).join('; ')
      : 'none specified'

  const systemPrompt = `You are an expert global travel planner. You produce detailed, practical, and geographically accurate travel itineraries. You always respond with a single valid JSON object matching the requested schema, with no markdown fences, no commentary, and no trailing text before or after the JSON. All latitude/longitude coordinates must be real and accurate for the named place. All narrative text fields (summary, titles, descriptions, notes, tips, equipment item names) must be written in ${langName}.`

  const userPrompt = `Plan a trip with the following constraints:
- Origin: ${originLine}
- Destination: ${destinationLine}
- Trip length: ${tripLengthLine}
- Budget: ${budgetLine}
- Primary transport mode: ${input.transportMode}
- Traveler count: ${input.travelerCount} traveler(s)
- Accessibility considerations: ${accessibilityLine}
- Traveler preferences / interests: ${input.preferences.join(', ') || 'no strong preference, general sightseeing'}

Requirements:
1. ${dailyPlansRequirement}, each with a realistic schedule (morning/afternoon/evening) that respects travel time between locations.
2. Place names are not always unique worldwide — many cities/places share the same name across different countries or regions. When a country/region is given above, or the name itself is ambiguous, use it to identify the correct real-world location, and make sure every coordinate and geographic detail reflects that specific place.
3. "highlights" must be real, well-known points of interest at the destination relevant to the stated preferences. Where genuinely known, include typical opening hours, closed day(s), a reference ticket price, and any useful official note for each — leave those fields out rather than guessing when unsure.
4. "route" should be an ordered list of waypoints representing the overall trip geography (can reuse highlight coordinates), suitable for drawing a line on a map.
5. "budgetBreakdown" categories should sum to a realistic total for this trip for all ${input.travelerCount} traveler(s) combined (transport, lodging, food, activities, misc.) in ${input.currency} — see the budget note above for unrealistic or unspecified budgets.
6. "equipment" should be a practical packing checklist grouped by category (clothing, electronics, documents, health, destination-specific gear), tailored to the destination's climate/season and the trip's activities.
7. If any accessibility considerations were given above, respect them throughout — pacing, activity choice, and transport must accommodate them, and call out anything the traveler should specifically know (e.g. a venue that is not accessible) in "pitfallWarnings" or "tips".
8. The response MUST include all 4 of these core sections, each a non-empty array — a response missing any of them, or with any of them empty, is invalid and will be rejected:
   - "transportPlan": concrete transport legs covering the whole trip (how to get from ${originLine} to ${destinationLine} and between any cities/regions visited), using the "${input.transportMode}" mode where applicable.
   - "budgetBreakdown": itemized budget covering the trip.
   - "mustEatFood": specific local specialties/dishes/restaurants worth trying at the destination.
   - "pitfallWarnings": specific common scams, tourist traps, or mistakes to avoid at this destination — not generic safety advice.
9. Respond with ONLY the JSON object, matching this shape:

${JSON_SCHEMA_HINT}`

  return { systemPrompt, userPrompt }
}

/**
 * Builds a follow-up prompt asking the model to apply one natural-language change to an
 * already-generated itinerary (e.g. "swap day 2's museum for something outdoors", or a canned
 * instruction to trim the budget) rather than starting over. Reuses the same schema and core
 * section requirements as `buildPrompt` so the response can go through the same
 * `parseItineraryResponse` validation.
 */
export function buildTweakPrompt(
  itinerary: Itinerary,
  input: TripInput,
  instruction: string,
  language: SupportedLanguage,
) {
  const langName = LANGUAGE_NAMES[language]

  const systemPrompt = `You are an expert global travel planner helping a traveler refine an itinerary you already produced. You always respond with a single valid JSON object matching the requested schema, with no markdown fences, no commentary, and no trailing text before or after the JSON. All narrative text fields must be written in ${langName}.`

  const userPrompt = `Here is the current itinerary as JSON:

${JSON.stringify(itinerary)}

The traveler has this request: "${instruction}"

Apply only this requested change. Keep every other part of the itinerary (wording, activities, order, coordinates, budget items, etc.) as close to the original as reasonably possible — do not regenerate the whole plan from scratch. If the request concerns one specific day, only touch that day's content unless the change naturally affects others (e.g. removing a day shifts later day numbers). Currency for any budget figures is ${input.currency}.

The response MUST still include all 4 of these core sections, each a non-empty array: "transportPlan", "budgetBreakdown", "mustEatFood", "pitfallWarnings".

Respond with ONLY the complete, updated JSON object, matching this shape:

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

  const obj = unwrapSingleKeyWrapper(parsed) as Partial<Itinerary>
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.dailyPlans)) {
    throw new Error('AI_RESPONSE_SHAPE_INVALID')
  }

  const missingCoreSections = CORE_SECTION_KEYS.filter((key) => {
    const value = obj[key]
    return !Array.isArray(value) || value.length === 0
  })
  if (missingCoreSections.length > 0) {
    throw new Error(`AI_RESPONSE_MISSING_CORE_SECTIONS:${missingCoreSections.join(',')}`)
  }

  return {
    destination: obj.destination || fallbackDestination,
    summary: obj.summary || '',
    highlights: Array.isArray(obj.highlights) ? obj.highlights : [],
    route: Array.isArray(obj.route) ? obj.route : [],
    transportPlan: obj.transportPlan!,
    dailyPlans: obj.dailyPlans,
    budgetBreakdown: normalizeBudgetBreakdown(obj.budgetBreakdown!),
    mustEatFood: obj.mustEatFood!,
    pitfallWarnings: obj.pitfallWarnings!,
    equipment: Array.isArray(obj.equipment) ? obj.equipment : [],
    tips: Array.isArray(obj.tips) ? obj.tips : [],
  }
}

/**
 * Canned instruction text for the "auto-trim to budget" button, in the app's active language —
 * fed into `buildTweakPrompt` the same way a freeform user instruction would be.
 */
export function buildBudgetTrimInstruction(
  budget: number,
  currency: string,
  language: SupportedLanguage,
): string {
  if (language === 'zh') {
    return `请把这份行程的总花费严格控制在 ${budget} ${currency} 预算以内，可以更换更便宜的住宿、餐饮或活动，但尽量保留行程的整体主题和主要亮点。`
  }
  if (language === 'ja') {
    return `この旅行プランの総費用を予算${budget}${currency}以内に厳密に収めてください。宿泊・食事・アクティビティをより安価なものに変更してもかまいませんが、全体のテーマと主要な見どころはできるだけ維持してください。`
  }
  return `Please adjust this itinerary so its total cost strictly fits within a budget of ${budget} ${currency}, by swapping in cheaper lodging, dining, or activities as needed, while keeping the overall theme and main highlights as intact as possible.`
}

/**
 * Some providers nest the itinerary under a single wrapper key (e.g.
 * `{"itinerary": {...}}`) instead of returning it at the top level, despite
 * the prompt asking for a top-level object. Unwrap that case so it doesn't
 * get rejected as AI_RESPONSE_SHAPE_INVALID.
 */
function unwrapSingleKeyWrapper(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
  const keys = Object.keys(value as Record<string, unknown>)
  if (keys.length !== 1) return value
  const inner = (value as Record<string, unknown>)[keys[0]]
  if (
    inner !== null &&
    typeof inner === 'object' &&
    !Array.isArray(inner) &&
    Array.isArray((inner as Record<string, unknown>).dailyPlans)
  ) {
    return inner
  }
  return value
}

/**
 * Some providers emit budgetBreakdown amounts as numeric strings (e.g.
 * `"100000"`) instead of numbers. Coerce them so downstream sums/comparisons
 * (e.g. the budget-overage check) work correctly; an unparseable amount
 * falls back to 0 rather than propagating NaN.
 */
function normalizeBudgetBreakdown(items: BudgetItem[]): BudgetItem[] {
  return items.map((item) => {
    const amount = typeof item.amount === 'number' ? item.amount : Number(item.amount)
    return { ...item, amount: Number.isFinite(amount) ? amount : 0 }
  })
}

function extractJson(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return stripTrailingCommas(fenced[1].trim())

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return stripTrailingCommas(trimmed.slice(firstBrace, lastBrace + 1))
  }
  return stripTrailingCommas(trimmed)
}

/**
 * Some providers (smaller/local models especially) emit a trailing comma
 * before a closing `}`/`]`, which is invalid per the JSON spec but a common
 * real-world quirk. Strip it so JSON.parse doesn't reject an otherwise-valid
 * response over it.
 */
function stripTrailingCommas(jsonText: string): string {
  return jsonText.replace(/,(\s*[}\]])/g, '$1')
}
