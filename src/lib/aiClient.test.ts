import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiCallError, callAi } from './aiClient'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as Response
}

const baseParams = {
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-test-key',
  model: 'test-model',
  systemPrompt: 'system',
  userPrompt: 'user',
} as const

describe('callAi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('throws MISSING_API_KEY without making any network request when apiKey is empty', async () => {
    await expect(
      callAi({ ...baseParams, apiKey: '', flavor: 'openai-compatible' }),
    ).rejects.toThrow('MISSING_API_KEY')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends an OpenAI-compatible chat completions request and returns the message content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { choices: [{ message: { content: 'Bonjour!' } }] }),
    )

    const result = await callAi({ ...baseParams, flavor: 'openai-compatible' })

    expect(result).toBe('Bonjour!')
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.example.com/v1/chat/completions')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer sk-test-key' })
    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe('test-model')
    expect(body.messages).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'user' },
    ])
  })

  it('sends an Anthropic-flavored request with the browser-access header and parses content[0].text', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { content: [{ text: 'Bonjour!' }] }))

    const result = await callAi({ ...baseParams, flavor: 'anthropic' })

    expect(result).toBe('Bonjour!')
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.example.com/v1/messages')
    expect(init?.headers).toMatchObject({
      'x-api-key': 'sk-test-key',
      'anthropic-dangerous-direct-browser-access': 'true',
    })
  })

  it('throws EMPTY_RESPONSE when the OpenAI-compatible response has no message content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { choices: [{ message: {} }] }))

    await expect(callAi({ ...baseParams, flavor: 'openai-compatible' })).rejects.toThrow(
      'EMPTY_RESPONSE',
    )
  })

  it('fails immediately on a non-transient HTTP error (401) without retrying', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { error: 'invalid key' }))

    const promise = callAi({ ...baseParams, flavor: 'openai-compatible' })
    await expect(promise).rejects.toThrow(/^HTTP_401:/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries a transient 503 with exponential backoff and succeeds once the server recovers', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(503, { error: 'overloaded' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'overloaded' }))
      .mockResolvedValueOnce(jsonResponse(200, { choices: [{ message: { content: 'done' } }] }))

    const onRetry = vi.fn()
    const promise = callAi({ ...baseParams, flavor: 'openai-compatible', onRetry })

    // Let the first attempt run, then fast-forward through both backoff delays.
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    await expect(promise).resolves.toBe('done')
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 3, 2000)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 3, 4000)
  })

  it('gives up after exhausting all retry attempts on persistent 503s', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(503, { error: 'overloaded' }))

    const promise = callAi({ ...baseParams, flavor: 'openai-compatible' })
    // Swallow the eventual rejection so it doesn't register as an unhandled rejection
    // while we advance fake timers past both retry delays below.
    promise.catch(() => {})

    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    await expect(promise).rejects.toThrow(/^HTTP_503:/)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('does not retry AiCallError instances that carry no HTTP status (e.g. EMPTY_RESPONSE)', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { choices: [{ message: {} }] }))

    await expect(callAi({ ...baseParams, flavor: 'openai-compatible' })).rejects.toBeInstanceOf(
      AiCallError,
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
