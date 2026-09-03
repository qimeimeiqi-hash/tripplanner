import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CURRENCIES, PREFERENCE_TAGS, TRANSPORT_MODES } from '../lib/options'
import { useSettingsStore } from '../store/settingsStore'
import type { TransportMode, TripInput } from '../types/itinerary'

interface TripFormProps {
  onSubmit: (input: TripInput) => void
  isGenerating: boolean
}

export default function TripForm({ onSubmit, isGenerating }: TripFormProps) {
  const { t } = useTranslation()
  const defaultCurrency = useSettingsStore((s) => s.currency)
  const setCurrency = useSettingsStore((s) => s.setCurrency)

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [budget, setBudget] = useState(200000)
  const [currency, setLocalCurrency] = useState(defaultCurrency)
  const [days, setDays] = useState(5)
  const [transportMode, setTransportMode] = useState<TransportMode>('flight')
  const [preferences, setPreferences] = useState<string[]>([])

  function togglePreference(tag: string) {
    setPreferences((prev) =>
      prev.includes(tag) ? prev.filter((p) => p !== tag) : [...prev, tag],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin.trim() || !destination.trim()) return
    setCurrency(currency)
    onSubmit({
      origin: origin.trim(),
      destination: destination.trim(),
      budget,
      currency,
      days,
      transportMode,
      preferences,
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
          <span>{t('form.budget')}</span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
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
            onChange={(e) => setDays(Number(e.target.value))}
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
