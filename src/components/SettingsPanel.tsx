import { useTranslation } from 'react-i18next'
import { PROVIDER_PRESETS, useSettingsStore } from '../store/settingsStore'

export default function SettingsPanel() {
  const { t } = useTranslation()
  const providerId = useSettingsStore((s) => s.providerId)
  const baseUrl = useSettingsStore((s) => s.baseUrl)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const model = useSettingsStore((s) => s.model)
  const setProvider = useSettingsStore((s) => s.setProvider)
  const setBaseUrl = useSettingsStore((s) => s.setBaseUrl)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const setModel = useSettingsStore((s) => s.setModel)

  return (
    <div className="settings-panel">
      <label className="field">
        <span>{t('settings.provider')}</span>
        <select value={providerId} onChange={(e) => setProvider(e.target.value)}>
          {PROVIDER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('settings.baseUrl')}</span>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
      </label>

      <label className="field">
        <span>{t('settings.model')}</span>
        <input value={model} onChange={(e) => setModel(e.target.value)} />
      </label>

      <label className="field">
        <span>{t('settings.apiKey')}</span>
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>
      <p className="hint">{t('settings.apiKeyHint')}</p>
    </div>
  )
}
