import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACCESSIBILITY_NEEDS, CURRENCIES, PREFERENCE_TAGS, TRANSPORT_MODES } from '../lib/options'
import { useSettingsStore } from '../store/settingsStore'
import type { AccessibilityNeed, TransportMode, TripInput } from '../types/itinerary'

interface TripFormProps {
  onSubmit: (input: TripInput) => void
  isGenerating: boolean
}

export default function TripForm({ onSubmit, isGenerating }: TripFormProps) {
  const { t } = useTranslation()
  const defaultCurrency = useSettingsStore((s) => s.currency)
  const setCurrency = useSettingsStore((s) => s.setCurrency)

  const [origin, setOrigin] = useState('')
  const [originRegion, setOriginRegion] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationRegion, setDestinationRegion] = useState('')
  const [budget, setBudget] = useState('200000')
  const [currency, setLocalCurrency] = useState(defaultCurrency)
  const [days, setDays] = useState('5')
  const [transportMode, setTransportMode] = useState<TransportMode>('flight')
  const [preferences, setPreferences] = useState<string[]>([])
  const [travelerCount, setTravelerCount] = useState('2')
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<AccessibilityNeed[]>([])

  function togglePreference(tag: string) {
    setPreferences((prev) =>
      prev.includes(tag) ? prev.filter((p) => p !== tag) : [...prev, tag],
    )
  }

  function toggleAccessibilityNeed(need: AccessibilityNeed) {
    setAccessibilityNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    )
  }

  // Strips a leading zero as soon as another digit follows it (e.g. typing "5"
  // after a lone "0" produced "05" otherwise) while still allowing the field
  // to be cleared entirely — an empty value means "let the AI decide".
  function handleNumberFieldChange(raw: string, setValue: (value: string) => void) {
    setValue(raw.replace(/^0+(?=\d)/, ''))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin.trim() || !destination.trim()) return
    setCurrency(currency)
    onSubmit({
      origin: origin.trim(),
      originRegion: originRegion.trim() || undefined,
      destination: destination.trim(),
      destinationRegion: destinationRegion.trim() || undefined,
      budget: budget.trim() === '' ? undefined : Number(budget),
      currency,
      days: days.trim() === '' ? undefined : Number(days),
      transportMode,
      preferences,
      travelerCount: travelerCount.trim() === '' ? 1 : Number(travelerCount),
      accessibilityNeeds,
    })
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="field-row">
        <label className="field">
          <span>{t('form.origin')}</span>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder={t('form.originPlaceholder') ?? ''}
            required
          />
        </label>
        <label className="field">
          <span>{t('form.destination')}</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t('form.destinationPlaceholder') ?? ''}
            required
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>{t('form.originRegion')}</span>
          <input
            value={originRegion}
            onChange={(e) => setOriginRegion(e.target.value)}
            placeholder={t('form.originRegionPlaceholder') ?? ''}
          />
        </label>
        <label className="field">
          <span>{t('form.destinationRegion')}</span>
          <input
            value={destinationRegion}
            onChange={(e) => setDestinationRegion(e.target.value)}
            placeholder={t('form.destinationRegionPlaceholder') ?? ''}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>{t('form.budget')}</span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => handleNumberFieldChange(e.target.value, setBudget)}
            placeholder={t('form.budgetPlaceholder') ?? ''}
          />
        </label>
        <label className="field">
          <span>{t('form.currency')}</span>
          <select value={currency} onChange={(e) => setLocalCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('form.days')}</span>
          <input
            type="number"
            min={1}
            max={60}
            value={days}
            onChange={(e) => handleNumberFieldChange(e.target.value, setDays)}
            placeholder={t('form.daysPlaceholder') ?? ''}
          />
        </label>
        <label className="field">
          <span>{t('form.travelerCount')}</span>
          <input
            type="number"
            min={1}
            max={20}
            value={travelerCount}
            onChange={(e) => handleNumberFieldChange(e.target.value, setTravelerCount)}
          />
        </label>
      </div>

      <div className="field">
        <span>{t('form.transportMode')}</span>
        <div className="chip-group">
          {TRANSPORT_MODES.map((mode) => (
            <button
              type="button"
              key={mode}
              className={`chip ${transportMode === mode ? 'chip-active' : ''}`}
              onClick={() => setTransportMode(mode)}
            >
              {t(`form.transport.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>{t('form.accessibilityNeeds')}</span>
        <div className="chip-group">
          {ACCESSIBILITY_NEEDS.map((need) => (
            <button
              type="button"
              key={need}
              className={`chip ${accessibilityNeeds.includes(need) ? 'chip-active' : ''}`}
              onClick={() => toggleAccessibilityNeed(need)}
            >
              {t(`form.accessibility.${need}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>{t('form.preferences')}</span>
        <div className="chip-group">
          {PREFERENCE_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`chip ${preferences.includes(tag) ? 'chip-active' : ''}`}
              onClick={() => togglePreference(tag)}
            >
              {t(`form.preferenceTags.${tag}`)}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="primary-btn" disabled={isGenerating}>
        {isGenerating ? t('form.generating') : t('form.submit')}
      </button>
    </form>
  )
}
