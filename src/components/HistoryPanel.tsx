import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTripStore } from '../store/tripStore'
import type { TripRecord } from '../types/itinerary'

interface HistoryPanelProps {
  onView: (trip: TripRecord) => void
  onRename: (id: string, name: string) => void
}

export default function HistoryPanel({ onView, onRename }: HistoryPanelProps) {
  const { t, i18n } = useTranslation()
  const history = useTripStore((s) => s.history)
  const removeTrip = useTripStore((s) => s.removeTrip)
  const clearHistory = useTripStore((s) => s.clearHistory)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (history.length === 0) {
    return <p className="empty-state">{t('history.empty')}</p>
  }

  function startEditing(trip: TripRecord) {
    setEditingId(trip.id)
    setEditValue(trip.name ?? `${trip.input.origin} → ${trip.input.destination}`)
  }

  function confirmEditing(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) onRename(editingId, editValue)
    setEditingId(null)
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
            <div className="history-item-main">
              {editingId === trip.id ? (
                <form className="history-rename-form" onSubmit={confirmEditing}>
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="secondary-btn">
                    {t('history.save')}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setEditingId(null)}>
                    {t('history.cancel')}
                  </button>
                </form>
              ) : (
                <strong>{trip.name ?? `${trip.input.origin} → ${trip.input.destination}`}</strong>
              )}
              <p className="history-meta">
                {t('history.createdAt')}: {new Date(trip.createdAt).toLocaleString(i18n.language)}
              </p>
            </div>
            <div className="history-item-actions">
              <button type="button" className="secondary-btn" onClick={() => onView(trip)}>
                {t('history.view')}
              </button>
              <button type="button" className="secondary-btn" onClick={() => startEditing(trip)}>
                {t('history.rename')}
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
