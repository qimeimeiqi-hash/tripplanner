import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import HistoryPanel from './components/HistoryPanel'
import ItineraryView from './components/ItineraryView'
import LanguageSwitcher from './components/LanguageSwitcher'
import LoadingSkeleton from './components/LoadingSkeleton'
import SettingsPanel from './components/SettingsPanel'
import TripForm from './components/TripForm'
import { AiCallError, callAi } from './lib/aiClient'
import { extractHttpStatus, getHttpErrorMessage } from './lib/errorMessages'
import { buildPrompt, parseItineraryResponse, type CoreSectionKey } from './lib/prompt'
import { useSettingsStore } from './store/settingsStore'
import { useTripStore } from './store/tripStore'
import type { Itinerary, TripInput, TripRecord } from './types/itinerary'

type Tab = 'plan' | 'history' | 'settings'

function App() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('plan')
  const [isGenerating, setIsGenerating] = useState(false)
  const [retryStatus, setRetryStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ itinerary: Itinerary; input: TripInput } | null>(null)

  const language = useSettingsStore((s) => s.language)
  const settings = useSettingsStore()
  const addTrip = useTripStore((s) => s.addTrip)

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language, i18n])

  async function handleGenerate(input: TripInput) {
    setError(null)
    if (!settings.apiKey) {
      setError(t('errors.missingApiKey'))
      return
    }

    setIsGenerating(true)
    setRetryStatus(null)
    try {
      const { systemPrompt, userPrompt } = buildPrompt(input, language)
      const raw = await callAi({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        flavor: settings.flavor,
        systemPrompt,
        userPrompt,
        onRetry: (attempt, maxAttempts, delayMs) => {
          setRetryStatus(
            t('errors.retrying', { attempt, maxAttempts, seconds: Math.round(delayMs / 1000) }),
          )
        },
      })
      const itinerary = parseItineraryResponse(raw, input.destination)
      setResult({ itinerary, input })

      const record: TripRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        input,
        itinerary,
      }
      addTrip(record)
    } catch (err) {
      if (err instanceof AiCallError && err.message === 'MISSING_API_KEY') {
        setError(t('errors.missingApiKey'))
      } else if (
        err instanceof Error &&
        (err.message === 'AI_RESPONSE_NOT_JSON' || err.message === 'AI_RESPONSE_SHAPE_INVALID')
      ) {
        setError(t('errors.invalidResponse'))
      } else if (
        err instanceof Error &&
        err.message.startsWith('AI_RESPONSE_MISSING_CORE_SECTIONS:')
      ) {
        const missingKeys = err.message.split(':')[1].split(',') as CoreSectionKey[]
        const sections = missingKeys.map((key) => t(`itinerary.${key}`)).join(', ')
        setError(t('errors.missingCoreSections', { sections }))
      } else if (err instanceof AiCallError) {
        // Never show the provider's raw HTTP response body — map it to a readable,
        // localized explanation plus a suggested next action instead.
        const status = extractHttpStatus(err.message)
        const { messageKey, actionKey } = getHttpErrorMessage(status)
        setError(`${t(messageKey)} ${t(actionKey)}`)
      } else {
        const message = err instanceof Error ? err.message : String(err)
        setError(t('errors.requestFailed', { message }))
      }
    } finally {
      setIsGenerating(false)
      setRetryStatus(null)
    }
  }

  function handleViewHistory(trip: TripRecord) {
    setResult({ itinerary: trip.itinerary, input: trip.input })
    setTab('plan')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>
            <svg
              className="title-icon"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 21c-4-3-7-6.5-7-10.5A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 7 4.5C19 14.5 16 18 12 21Z"
                fill="currentColor"
              />
              <path d="M12 21V10" stroke="var(--surface)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {t('app.title')}
          </h1>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <nav className="tab-nav">
        <button
          type="button"
          className={tab === 'plan' ? 'tab-active' : ''}
          onClick={() => setTab('plan')}
        >
          {t('nav.plan')}
        </button>
        <button
          type="button"
          className={tab === 'history' ? 'tab-active' : ''}
          onClick={() => setTab('history')}
        >
          {t('nav.history')}
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'tab-active' : ''}
          onClick={() => setTab('settings')}
        >
          {t('nav.settings')}
        </button>
      </nav>

      <main className="app-main">
        {tab === 'plan' && (
          <>
            <TripForm onSubmit={handleGenerate} isGenerating={isGenerating} />
            {isGenerating && <LoadingSkeleton retryStatus={retryStatus} />}
            {error && <p className="error-banner">{error}</p>}
            {result && <ItineraryView itinerary={result.itinerary} input={result.input} />}
          </>
        )}
        {tab === 'history' && <HistoryPanel onView={handleViewHistory} />}
        {tab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  )
}

export default App
