import { lazy, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isBudgetOverThreshold, sumBudgetBreakdown } from '../lib/budgetCheck'
import { exportElementToPdf } from '../lib/pdfExport'
import type { Itinerary, TripInput } from '../types/itinerary'

const MapView = lazy(() => import('./MapView'))

interface ItineraryViewProps {
  itinerary: Itinerary
  input: TripInput
  onTweak: (instruction: string) => void
  onAutoTrimBudget: () => void
  isTweaking: boolean
  tweakRetryStatus: string | null
  tweakError: string | null
  tweakLog: string[]
}

export default function ItineraryView({
  itinerary,
  input,
  onTweak,
  onAutoTrimBudget,
  isTweaking,
  tweakRetryStatus,
  tweakError,
  tweakLog,
}: ItineraryViewProps) {
  const { t } = useTranslation()
  const exportRef = useRef<HTMLDivElement>(null)
  const [tweakInput, setTweakInput] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    if (!exportRef.current || isExporting) return
    setIsExporting(true)
    try {
      await exportElementToPdf(exportRef.current, `${itinerary.destination}-itinerary.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  function handleTweakSubmit(e: React.FormEvent) {
    e.preventDefault()
    const instruction = tweakInput.trim()
    if (!instruction) return
    onTweak(instruction)
    setTweakInput('')
  }

  const highlightsHaveDetails = itinerary.highlights.some(
    (h) => h.openingHours || h.closedDays || h.ticketPrice || h.officialNote,
  )

  return (
    <div className="itinerary-view">
      <div className="itinerary-actions">
        <button type="button" className="secondary-btn" onClick={handleExport} disabled={isExporting}>
          {isExporting && <span className="spinner" aria-hidden="true" />}
          {isExporting ? t('itinerary.exporting') : t('itinerary.exportPdf')}
        </button>
      </div>

      <div ref={exportRef} className="itinerary-export" id="itinerary-export">
        <h2>{itinerary.destination}</h2>
        <p className="itinerary-summary">{itinerary.summary}</p>

        {itinerary.highlights.length > 0 && (
          <section>
            <h3>{t('itinerary.highlights')}</h3>
            {highlightsHaveDetails && (
              <p className="info-disclaimer">{t('itinerary.highlightInfoDisclaimer')}</p>
            )}
            <div className="equipment-grid">
              {itinerary.highlights.map((h, i) => (
                <div className="equipment-card" key={i}>
                  <h4>{h.name}</h4>
                  {h.openingHours && (
                    <p className="highlight-detail">
                      <strong>{t('itinerary.openingHours')}: </strong>
                      {h.openingHours}
                    </p>
                  )}
                  {h.closedDays && (
                    <p className="highlight-detail">
                      <strong>{t('itinerary.closedDays')}: </strong>
                      {h.closedDays}
                    </p>
                  )}
                  {h.ticketPrice && (
                    <p className="highlight-detail">
                      <strong>{t('itinerary.ticketPrice')}: </strong>
                      {h.ticketPrice}
                    </p>
                  )}
                  {h.officialNote && <p className="highlight-detail">{h.officialNote}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(itinerary.route.length > 0 || itinerary.highlights.length > 0) && (
          <section data-pdf-exclude="true">
            <h3>{t('itinerary.map')}</h3>
            <Suspense fallback={null}>
              <MapView route={itinerary.route} highlights={itinerary.highlights} />
            </Suspense>
          </section>
        )}

        {(itinerary.transportPlan ?? []).length > 0 && (
          <section>
            <h3>{t('itinerary.transportPlan')}</h3>
            <ul className="transport-leg-list">
              {(itinerary.transportPlan ?? []).map((leg, i) => (
                <li key={i}>
                  <strong>
                    {leg.from} → {leg.to}
                  </strong>{' '}
                  <span className="transport-leg-mode">({leg.mode}{leg.duration ? `, ${leg.duration}` : ''})</span>
                  {leg.note && <p>{leg.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="tweak-box" data-pdf-exclude="true">
          <h3>{t('itinerary.tweakTitle')}</h3>
          {tweakLog.length > 0 && (
            <ul className="tweak-log">
              {tweakLog.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          )}
          <form className="tweak-form" onSubmit={handleTweakSubmit}>
            <input
              value={tweakInput}
              onChange={(e) => setTweakInput(e.target.value)}
              placeholder={t('itinerary.tweakPlaceholder') ?? ''}
              disabled={isTweaking}
            />
            <button type="submit" className="secondary-btn" disabled={isTweaking || !tweakInput.trim()}>
              {t('itinerary.tweakSubmit')}
            </button>
          </form>
          {isTweaking && (
            <p className="tweak-status">
              <span className="spinner" aria-hidden="true" />
              {tweakRetryStatus ?? t('itinerary.tweaking')}
            </p>
          )}
          {tweakError && <p className="error-banner">{tweakError}</p>}
        </div>

        <section>
          <h3>{t('itinerary.dailyPlan')}</h3>
          {itinerary.dailyPlans.map((plan) => (
            <div className="day-card" key={plan.day}>
              <h4>
                {t('itinerary.day', { n: plan.day })} · {plan.title}
              </h4>
              <ul className="activity-list">
                {plan.activities.map((a, i) => (
                  <li key={i}>
                    <span className="activity-time">{a.time}</span>
                    <div>
                      <strong>{a.title}</strong>
                      <p>{a.description}</p>
                      {a.location?.name && <span className="activity-loc">📍 {a.location.name}</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {plan.meals && (
                <p className="day-meta">
                  <strong>{t('itinerary.meals')}: </strong>
                  {plan.meals}
                </p>
              )}
              {plan.transportNote && (
                <p className="day-meta">
                  <strong>{t('itinerary.transportNote')}: </strong>
                  {plan.transportNote}
                </p>
              )}
            </div>
          ))}
        </section>

        {itinerary.budgetBreakdown.length > 0 && (
          <section>
            <h3>{t('itinerary.budgetBreakdown')}</h3>
            {typeof input.budget === 'number' &&
              isBudgetOverThreshold(itinerary.budgetBreakdown, input.budget) && (
                <div className="budget-warning">
                  <p>
                    {t('itinerary.budgetOverWarning', {
                      total: sumBudgetBreakdown(itinerary.budgetBreakdown).toLocaleString(),
                      budget: input.budget.toLocaleString(),
                      currency: input.currency,
                    })}
                  </p>
                  {isTweaking ? (
                    <span className="tweak-status" data-pdf-exclude="true">
                      <span className="spinner" aria-hidden="true" />
                      {tweakRetryStatus ?? t('itinerary.tweaking')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="secondary-btn"
                      data-pdf-exclude="true"
                      onClick={onAutoTrimBudget}
                    >
                      {t('itinerary.autoTrimBudget')}
                    </button>
                  )}
                </div>
              )}
            <div className="table-scroll">
              <table className="budget-table">
                <tbody>
                  {itinerary.budgetBreakdown.map((b, i) => (
                    <tr key={i}>
                      <td>{b.category}</td>
                      <td>
                        {b.amount.toLocaleString()} {input.currency}
                      </td>
                      <td className="budget-note">{b.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(itinerary.mustEatFood ?? []).length > 0 && (
          <section>
            <h3>{t('itinerary.mustEatFood')}</h3>
            <div className="equipment-grid">
              {(itinerary.mustEatFood ?? []).map((food, i) => (
                <div className="equipment-card" key={i}>
                  <h4>{food.name}</h4>
                  <p>{food.description}</p>
                  {food.location?.name && <span className="activity-loc">📍 {food.location.name}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(itinerary.pitfallWarnings ?? []).length > 0 && (
          <section>
            <h3>{t('itinerary.pitfallWarnings')}</h3>
            <ul>
              {(itinerary.pitfallWarnings ?? []).map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        {itinerary.equipment.length > 0 && (
          <section>
            <h3>{t('itinerary.equipment')}</h3>
            <div className="equipment-grid">
              {itinerary.equipment.map((cat, i) => (
                <div className="equipment-card" key={i}>
                  <h4>{cat.category}</h4>
                  <ul>
                    {cat.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {itinerary.tips && itinerary.tips.length > 0 && (
          <section>
            <h3>{t('itinerary.tips')}</h3>
            <ul>
              {itinerary.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
