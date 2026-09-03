import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ApiFlavor = 'openai-compatible' | 'anthropic'

export interface ProviderPreset {
  id: string
  label: string
  baseUrl: string
  flavor: ApiFlavor
  defaultModel: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    flavor: 'openai-compatible',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    flavor: 'openai-compatible',
    defaultModel: 'openai/gpt-4o-mini',
  },
  {
    id: 'gemini',
    label: 'Google Gemini (OpenAI-compatible)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    flavor: 'openai-compatible',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    flavor: 'openai-compatible',
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    flavor: 'anthropic',
    defaultModel: 'claude-opus-5',
  },
  {
    id: 'custom',
    label: 'Custom',
    baseUrl: '',
    flavor: 'openai-compatible',
    defaultModel: '',
  },
]

export type SupportedLanguage = 'zh' | 'ja' | 'en'

interface SettingsState {
  providerId: string
  baseUrl: string
  apiKey: string
  model: string
  flavor: ApiFlavor
  language: SupportedLanguage
  currency: string
  setProvider: (providerId: string) => void
  setBaseUrl: (baseUrl: string) => void
  setApiKey: (apiKey: string) => void
  setModel: (model: string) => void
  setLanguage: (language: SupportedLanguage) => void
  setCurrency: (currency: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerId: 'openai',
      baseUrl: PROVIDER_PRESETS[0].baseUrl,
      apiKey: '',
      model: PROVIDER_PRESETS[0].defaultModel,
      flavor: PROVIDER_PRESETS[0].flavor,
      language: 'zh',
      currency: 'JPY',
      setProvider: (providerId) =>
        set(() => {
          const preset = PROVIDER_PRESETS.find((p) => p.id === providerId)
          if (!preset) return {}
          return {
            providerId,
            baseUrl: preset.baseUrl,
            model: preset.defaultModel,
            flavor: preset.flavor,
          }
        }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'tripplanner-settings' },
  ),
)
