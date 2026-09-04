import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Itinerary, TripRecord } from '../types/itinerary'

interface TripState {
  history: TripRecord[]
  addTrip: (trip: TripRecord) => void
  removeTrip: (id: string) => void
  clearHistory: () => void
  renameTrip: (id: string, name: string) => void
  updateTripItinerary: (id: string, itinerary: Itinerary) => void
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
      renameTrip: (id, name) =>
        set((state) => ({
          history: state.history.map((t) =>
            t.id === id ? { ...t, name: name.trim() === '' ? undefined : name.trim() } : t,
          ),
        })),
      updateTripItinerary: (id, itinerary) =>
        set((state) => ({
          history: state.history.map((t) => (t.id === id ? { ...t, itinerary } : t)),
        })),
    }),
    { name: 'tripplanner-history' },
  ),
)
