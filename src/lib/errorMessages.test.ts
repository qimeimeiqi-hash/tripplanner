import { describe, expect, it } from 'vitest'
import { extractHttpStatus, getHttpErrorMessage } from './errorMessages'

describe('extractHttpStatus', () => {
  it('extracts the numeric status from an HTTP_<status>: prefixed message', () => {
    expect(extractHttpStatus('HTTP_401: {"error":"invalid api key"}')).toBe(401)
  })

  it('extracts a 3-digit 5xx status', () => {
    expect(extractHttpStatus('HTTP_503: {"error":"model overloaded"}')).toBe(503)
  })

  it('returns null for a non-HTTP AiCallError message', () => {
    expect(extractHttpStatus('EMPTY_RESPONSE')).toBeNull()
  })

  it('returns null for an unrelated error message with no HTTP_ prefix', () => {
    expect(extractHttpStatus('Failed to fetch')).toBeNull()
  })
})

describe('getHttpErrorMessage', () => {
  it('maps 401 to the unauthorized message and action keys', () => {
    expect(getHttpErrorMessage(401)).toEqual({
      messageKey: 'errors.http.unauthorized.message',
      actionKey: 'errors.http.unauthorized.action',
    })
  })

  it('maps 403 to the forbidden message and action keys', () => {
    expect(getHttpErrorMessage(403)).toEqual({
      messageKey: 'errors.http.forbidden.message',
      actionKey: 'errors.http.forbidden.action',
    })
  })

  it('maps 404 to the notFound message and action keys', () => {
    expect(getHttpErrorMessage(404)).toEqual({
      messageKey: 'errors.http.notFound.message',
      actionKey: 'errors.http.notFound.action',
    })
  })

  it('maps 429 to the rateLimited message and action keys', () => {
    expect(getHttpErrorMessage(429)).toEqual({
      messageKey: 'errors.http.rateLimited.message',
      actionKey: 'errors.http.rateLimited.action',
    })
  })

  it.each([500, 502, 503, 504, 529])(
    'maps 5xx status %i to the server message and action keys',
    (status) => {
      expect(getHttpErrorMessage(status)).toEqual({
        messageKey: 'errors.http.server.message',
        actionKey: 'errors.http.server.action',
      })
    },
  )

  it('falls back to the unknown message and action keys for an unrecognized status code', () => {
    expect(getHttpErrorMessage(418)).toEqual({
      messageKey: 'errors.http.unknown.message',
      actionKey: 'errors.http.unknown.action',
    })
  })

  it('falls back to the unknown message and action keys when status is null (non-HTTP failure)', () => {
    expect(getHttpErrorMessage(null)).toEqual({
      messageKey: 'errors.http.unknown.message',
      actionKey: 'errors.http.unknown.action',
    })
  })

  it('does not treat 400 (a real but unmapped client error) as a 5xx server error', () => {
    expect(getHttpErrorMessage(400)).toEqual({
      messageKey: 'errors.http.unknown.message',
      actionKey: 'errors.http.unknown.action',
    })
  })
})
