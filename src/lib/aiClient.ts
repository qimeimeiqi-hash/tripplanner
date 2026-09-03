import type { ApiFlavor } from '../store/settingsStore'

export interface AiCallParams {
  baseUrl: string
  apiKey: string
  model: string
  flavor: ApiFlavor
  systemPrompt: string
  userPrompt: string
  onRetry?: (attempt: number, maxAttempts: number, delayMs: number) => void
}

export class AiCallError extends Error {}

const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504, 529])
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 2000

export async function callAi({
  baseUrl,
  apiKey,
  model,
  flavor,
  systemPrompt,
  userPrompt,
  onRetry,
}: AiCallParams): Promise<string> {
  if (!apiKey) {
    throw new AiCallError('MISSING_API_KEY')
  }

  const doCall = () =>
    flavor === 'anthropic'
      ? callAnthropic({ baseUrl, apiKey, model, systemPrompt, userPrompt })
      : callOpenAiCompatible({ baseUrl, apiKey, model, systemPrompt, userPrompt })

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await doCall()
    } catch (err) {
      lastError = err
      const status = extractStatus(err)
      const isLastAttempt = attempt === MAX_ATTEMPTS
      if (!status || !TRANSIENT_STATUS_CODES.has(status) || isLastAttempt) {
        throw err
      }
      const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1)
      onRetry?.(attempt, MAX_ATTEMPTS, delayMs)
      await sleep(delayMs)
    }
  }
  throw lastError
}

function extractStatus(err: unknown): number | null {
  if (err instanceof AiCallError) {
    const match = err.message.match(/^HTTP_(\d+):/)
    if (match) return Number(match[1])
  }
  return null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: Omit<AiCallParams, 'flavor' | 'onRetry'>): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AiCallError(`HTTP_${res.status}: ${text.slice(0, 500)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new AiCallError('EMPTY_RESPONSE')
  }
  return content
}

async function callAnthropic({
  baseUrl,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: Omit<AiCallParams, 'flavor' | 'onRetry'>): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AiCallError(`HTTP_${res.status}: ${text.slice(0, 500)}`)
  }

  const data = await res.json()
  const content = data?.content?.[0]?.text
  if (typeof content !== 'string') {
    throw new AiCallError('EMPTY_RESPONSE')
  }
  return content
}
