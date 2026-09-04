import { lazy, Suspense, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isBudgetOverThreshold, sumBudgetBreakdown } from '../lib/budgetCheck'
import { exportElementToPdf } from '../lib/pdfExport'
import type { Itinerary, TripInput } from '../types/itinerary'

const MapView = lazy(() => import('./MapView'))

interface ItineraryViewProps {
  itinerary: Itinerary
  input: TripInput
}

export default function ItineraryView({ itinerary, input }: ItineraryViewProps) {
  const { t } = useTranslation()
  const exportRef = useRef<HTMLDivElement>(null)

  async function handleExport() {
    if (!exportRef.current) return
    await exportElementToPdf(exportRef.current, `${itinerary.destination}-itinerary.pdf`)
  }

  return (
    <div className="itinerary-view">
      <div className="itinerary-actions">
        <button type="button" className="secondary-btn" onClick={handleExport}>
          {t('itinerary.exportPdf')}
        </button>
      </div>

      <div ref={exportRef} className="itinerary-export" id="itinerary-export">
        <h2>{itinerary.destination}</h2>
        <p className="itinerary-summary">{itinerary.summary}</p>

        {itinerary.highlights.length > 0 && (
          <section>
            <h3>{t('itinerary.highlights')}</h3>
            <ul className="highlight-list">
              {itinerary.highlights.map((h, i) => (
                <li key={i}>{h.name}</li>
              ))}
            </ul>
          </section>
        )}

        {(itinerary.route.length > 0 || itinerary.highlights.length > 0) && (
          <section>
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
                <p className="budget-warning">
                  {t('itinerary.budgetOverWarning', {
                    total: sumBudgetBreakdown(itinerary.budgetBreakdown).toLocaleString(),
                    budget: input.budget.toLocaleString(),
                    currency: input.currency,
                  })}
                </p>
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
