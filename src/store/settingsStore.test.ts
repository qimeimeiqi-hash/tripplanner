import { beforeEach, describe, expect, it } from 'vitest'
import { PROVIDER_PRESETS, useSettingsStore } from './settingsStore'

const initialState = useSettingsStore.getState()

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState(initialState, true)
    window.localStorage.clear()
  })

  it('initializes with the OpenAI preset as the default provider', () => {
    const state = useSettingsStore.getState()
    expect(state.providerId).toBe('openai')
    expect(state.baseUrl).toBe('https://api.openai.com/v1')
    expect(state.model).toBe('gpt-4o-mini')
    expect(state.flavor).toBe('openai-compatible')
  })

  it('switching provider updates baseUrl, model, and flavor to match that preset', () => {
    useSettingsStore.getState().setProvider('anthropic')
    const state = useSettingsStore.getState()
    const anthropicPreset = PROVIDER_PRESETS.find((p) => p.id === 'anthropic')!
    expect(state.providerId).toBe('anthropic')
    expect(state.baseUrl).toBe(anthropicPreset.baseUrl)
    expect(state.model).toBe(anthropicPreset.defaultModel)
    expect(state.flavor).toBe('anthropic')
  })

  it('switching to every preset yields that preset\'s exact baseUrl/model/flavor', () => {
    for (const preset of PROVIDER_PRESETS) {
      useSettingsStore.getState().setProvider(preset.id)
      const state = useSettingsStore.getState()
      expect(state.baseUrl).toBe(preset.baseUrl)
      expect(state.model).toBe(preset.defaultModel)
      expect(state.flavor).toBe(preset.flavor)
    }
  })

  it('ignores an unknown provider id and leaves the current settings untouched', () => {
    useSettingsStore.getState().setProvider('deepseek')
    const before = useSettingsStore.getState()

    useSettingsStore.getState().setProvider('not-a-real-provider')
    const after = useSettingsStore.getState()

    expect(after.providerId).toBe(before.providerId)
    expect(after.baseUrl).toBe(before.baseUrl)
    expect(after.model).toBe(before.model)
    expect(after.flavor).toBe(before.flavor)
  })

  it('setApiKey updates only the apiKey field', () => {
    useSettingsStore.getState().setApiKey('sk-my-secret')
    const state = useSettingsStore.getState()
    expect(state.apiKey).toBe('sk-my-secret')
    expect(state.providerId).toBe(initialState.providerId)
    expect(state.baseUrl).toBe(initialState.baseUrl)
  })

  it('setBaseUrl and setModel update independently without touching provider or apiKey', () => {
    useSettingsStore.getState().setApiKey('sk-my-secret')
    useSettingsStore.getState().setBaseUrl('https://custom.example.com/v1')
    useSettingsStore.getState().setModel('custom-model-x')

    const state = useSettingsStore.getState()
    expect(state.baseUrl).toBe('https://custom.example.com/v1')
    expect(state.model).toBe('custom-model-x')
    expect(state.apiKey).toBe('sk-my-secret')
    expect(state.providerId).toBe('openai')
  })

  it('setLanguage and setCurrency update independently of each other', () => {
    useSettingsStore.getState().setLanguage('ja')
    expect(useSettingsStore.getState().currency).toBe(initialState.currency)

    useSettingsStore.getState().setCurrency('USD')
    const state = useSettingsStore.getState()
    expect(state.language).toBe('ja')
    expect(state.currency).toBe('USD')
  })
})
