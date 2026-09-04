import { useTranslation } from 'react-i18next'

interface LoadingSkeletonProps {
  /** When set, a retry is in progress and this is the already-translated status text to show. */
  retryStatus: string | null
}

/**
 * Shown in place of the itinerary while a generation request is in flight. Displays a clearly
 * distinguishable banner for the plain "generating" state vs. an active retry, plus a shimmering
 * skeleton outline of the itinerary layout so the page never looks stuck on bare text.
 */
export default function LoadingSkeleton({ retryStatus }: LoadingSkeletonProps) {
  const { t } = useTranslation()
  const isRetrying = retryStatus !== null

  return (
    <div className="generation-status" role="status" aria-live="polite">
      <div className={`generation-banner${isRetrying ? ' generation-banner-retry' : ''}`}>
        <span className="spinner" aria-hidden="true" />
        <span>{retryStatus ?? t('form.generating')}</span>
      </div>
      <div className="skeleton-itinerary" aria-hidden="true">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-text" />
        <div className="skeleton-line skeleton-text skeleton-text-short" />
        <div className="skeleton-day-grid">
          <div className="skeleton-day-card" />
          <div className="skeleton-day-card" />
          <div className="skeleton-day-card" />
        </div>
      </div>
    </div>
  )
}
