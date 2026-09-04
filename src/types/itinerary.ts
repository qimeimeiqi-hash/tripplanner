export type TransportMode =
  | 'flight'
  | 'train'
  | 'car'
  | 'bus'
  | 'ship'
  | 'mixed'

export type AccessibilityNeed = 'elderly' | 'children' | 'wheelchair'

export interface TripInput {
  origin: string
  originRegion?: string
  destination: string
  destinationRegion?: string
  /** Omitted when the traveler leaves it blank — the AI then chooses a reasonable budget itself. */
  budget?: number
  currency: string
  /** Omitted when the traveler leaves it blank — the AI then chooses a sensible trip length itself. */
  days?: number
  transportMode: TransportMode
  preferences: string[]
  travelerCount: number
  accessibilityNeeds: AccessibilityNeed[]
}

export interface GeoPoint {
  name: string
  lat: number
  lng: number
}

/**
 * A must-see spot, with AI-estimated visitor details (opening hours, closed days, ticket price,
 * official notes) that are best-effort and not sourced from a live/official database — always
 * displayed with a disclaimer to verify against the venue's own information.
 */
export interface Highlight extends GeoPoint {
  openingHours?: string
  closedDays?: string
  ticketPrice?: string
  officialNote?: string
}

export interface Activity {
  time: string
  title: string
  description: string
  location?: GeoPoint
}

export interface DailyPlan {
  day: number
  title: string
  activities: Activity[]
  meals?: string
  transportNote?: string
}

export interface BudgetItem {
  category: string
  amount: number
  note?: string
}

export interface EquipmentCategory {
  category: string
  items: string[]
}

export interface TransportLeg {
  from: string
  to: string
  mode: string
  duration?: string
  note?: string
}

export interface FoodRecommendation {
  name: string
  description: string
  location?: GeoPoint
}

/**
 * The 4 core modules every generated itinerary must include, enforced by
 * `buildPrompt`'s instructions and validated by `parseItineraryResponse`:
 * transportPlan, budgetBreakdown, mustEatFood, pitfallWarnings.
 */
export interface Itinerary {
  destination: string
  summary: string
  highlights: Highlight[]
  route: GeoPoint[]
  transportPlan: TransportLeg[]
  dailyPlans: DailyPlan[]
  budgetBreakdown: BudgetItem[]
  mustEatFood: FoodRecommendation[]
  pitfallWarnings: string[]
  equipment: EquipmentCategory[]
  tips?: string[]
}

export interface TripRecord {
  id: string
  createdAt: number
  input: TripInput
  itinerary: Itinerary
  /** User-given custom name; falls back to "origin → destination" in the UI when absent. */
  name?: string
}
