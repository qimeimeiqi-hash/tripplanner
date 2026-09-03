export type TransportMode =
  | 'flight'
  | 'train'
  | 'car'
  | 'bus'
  | 'ship'
  | 'mixed'

export interface TripInput {
  origin: string
  destination: string
  budget: number
  currency: string
  days: number
  transportMode: TransportMode
  preferences: string[]
}

export interface GeoPoint {
  name: string
  lat: number
  lng: number
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

export interface Itinerary {
  destination: string
  summary: string
  highlights: GeoPoint[]
  route: GeoPoint[]
  dailyPlans: DailyPlan[]
  budgetBreakdown: BudgetItem[]
  equipment: EquipmentCategory[]
  tips?: string[]
}

export interface TripRecord {
  id: string
  createdAt: number
  input: TripInput
  itinerary: Itinerary
}
