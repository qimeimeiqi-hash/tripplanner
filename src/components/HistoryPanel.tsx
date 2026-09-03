import { useTranslation } from 'react-i18next'
import { useTripStore } from '../store/tripStore'
import type { TripRecord } from '../types/itinerary'

interface HistoryPanelProps {
  onView: (trip: TripRecord) => void
}

export default function HistoryPanel({ onView }: HistoryPanelProps) {
  const { t, i18n } = useTranslation()
  const history = useTripStore((s) => s.history)
  const removeTrip = useTripStore((s) => s.removeTrip)
  const clearHistory = useTripStore((s) => s.clearHistory)

  if (history.length === 0) {
    return <p className="empty-state">{t('history.empty')}</p>
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <button type="button" className="secondary-btn" onClick={clearHistory}>
          {t('history.clearAll')}
        </button>
      </div>
      <ul className="history-list">
        {history.map((trip) => (
          <li key={trip.id} className="history-item">
            <div>
              <strong>
                {trip.input.origin} → {trip.input.destination}
              </strong>
              <p className="history-meta">
                {t('history.createdAt')}: {new Date(trip.createdAt).toLocaleString(i18n.language)}
              </p>
            </div>
            <div className="history-item-actions">
              <button type="button" className="secondary-btn" onClick={() => onView(trip)}>
                {t('history.view')}
              </button>
              <button type="button" className="secondary-btn" onClick={() => removeTrip(trip.id)}>
                {t('history.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
