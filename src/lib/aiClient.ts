import type { ApiFlavor } from '../store/settingsStore'

export interface AiCallParams {
  baseUrl: string
  apiKey: string
  model: string
  flavor: ApiFlavor
  systemPrompt: string
  userPrompt: string
}

export class AiCallError extends Error {}

export async function callAi({
  baseUrl,
  apiKey,
  model,
  flavor,
  systemPrompt,
  userPrompt,
}: AiCallParams): Promise<string> {
  if (!apiKey) {
    throw new AiCallError('MISSING_API_KEY')
  }

  if (flavor === 'anthropic') {
    return callAnthropic({ baseUrl, apiKey, model, systemPrompt, userPrompt })
  }
  return callOpenAiCompatible({ baseUrl, apiKey, model, systemPrompt, userPrompt })
}

async function callOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: Omit<AiCallParams, 'flavor'>): Promise<string> {
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
}: Omit<AiCallParams, 'flavor'>): Promise<string> {
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
