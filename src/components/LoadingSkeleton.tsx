import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LoadingSkeletonProps {
  /** When set, a retry is in progress and this is the already-translated status text to show. */
  retryStatus: string | null
}

const STAGE_INTERVAL_MS = 3200
const FACT_INTERVAL_MS = 5600

/**
 * Shown in place of the itinerary while a generation request is in flight. Displays a clearly
 * distinguishable banner for the plain "generating" state vs. an active retry, a rotating set of
 * stage messages and travel facts to make the wait feel purposeful rather than stalled, plus a
 * shimmering skeleton outline of the itinerary layout so the page never looks stuck on bare text.
 */
export default function LoadingSkeleton({ retryStatus }: LoadingSkeletonProps) {
  const { t } = useTranslation()
  const isRetrying = retryStatus !== null
  const stages = t('loading.stages', { returnObjects: true }) as string[]
  const facts = t('loading.facts', { returnObjects: true }) as string[]

  const [stageIndex, setStageIndex] = useState(0)
  const [factIndex, setFactIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStageIndex((i) => (i + 1) % stages.length)
    }, STAGE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [stages.length])

  useEffect(() => {
    const id = setInterval(() => {
      setFactIndex((i) => (i + 1) % facts.length)
    }, FACT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [facts.length])

  return (
    <div className="generation-status" role="status" aria-live="polite">
      <div className={`generation-banner${isRetrying ? ' generation-banner-retry' : ''}`}>
        <span className="spinner" aria-hidden="true" />
        <span>{retryStatus ?? stages[stageIndex]}</span>
      </div>
      {!isRetrying && (
        <svg
          className="loading-leaf"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="var(--accent)"
            d="M12 21c-4-3-7-6.5-7-10.5A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 7 4.5C19 14.5 16 18 12 21Z"
          />
        </svg>
      )}
      {!isRetrying && <p className="loading-fact">{facts[factIndex]}</p>}
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
