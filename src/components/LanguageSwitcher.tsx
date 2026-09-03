import { useSettingsStore, type SupportedLanguage } from '../store/settingsStore'

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
]

export default function LanguageSwitcher() {
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)

  return (
    <div className="language-switcher">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn ${language === l.code ? 'lang-active' : ''}`}
          onClick={() => setLanguage(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
