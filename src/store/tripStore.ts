import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TripRecord } from '../types/itinerary'

interface TripState {
  history: TripRecord[]
  addTrip: (trip: TripRecord) => void
  removeTrip: (id: string) => void
  clearHistory: () => void
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      history: [],
      addTrip: (trip) =>
        set((state) => ({ history: [trip, ...state.history].slice(0, 50) })),
      removeTrip: (id) =>
        set((state) => ({ history: state.history.filter((t) => t.id !== id) })),
      clearHistory: () => set({ history: [] }),
    }),
    { name: 'tripplanner-history' },
  ),
)
