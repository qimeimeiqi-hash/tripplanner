import type { AccessibilityNeed, TransportMode } from '../types/itinerary'

export const CURRENCIES = [
  'JPY',
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'KRW',
  'TWD',
  'HKD',
  'AUD',
  'CAD',
  'THB',
  'SGD',
]

export const TRANSPORT_MODES: TransportMode[] = [
  'flight',
  'train',
  'car',
  'bus',
  'ship',
  'mixed',
]

export const PREFERENCE_TAGS = [
  'nature',
  'history',
  'food',
  'shopping',
  'art',
  'nightlife',
  'family',
  'adventure',
  'relaxation',
  'photography',
]

export const ACCESSIBILITY_NEEDS: AccessibilityNeed[] = ['elderly', 'children', 'wheelchair']
