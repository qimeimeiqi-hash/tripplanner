/**
 * Maps AI request failures to user-facing, translatable messages instead of showing the
 * provider's raw HTTP response body (see `AiCallError` in `aiClient.ts`, whose message for an
 * HTTP failure always has the form `HTTP_<status>: <raw response body>`).
 */

export interface HttpErrorPresentation {
  /** i18n key for the short, plain-language explanation of what went wrong. */
  messageKey: string
  /** i18n key for the suggested next action the user can take. */
  actionKey: string
}

/**
 * Extracts the numeric HTTP status code from an `AiCallError` message, if it carries one.
 * Returns null for non-HTTP failures (e.g. `EMPTY_RESPONSE`, `MISSING_API_KEY`) or any other
 * error message that doesn't match the `HTTP_<status>: ...` shape.
 */
export function extractHttpStatus(message: string): number | null {
  const match = message.match(/^HTTP_(\d+):/)
  return match ? Number(match[1]) : null
}

/**
 * Maps an HTTP status code (or null, for a non-HTTP failure) to the i18n keys for a
 * user-facing message and a suggested next action. Unrecognized status codes — and null —
 * fall back to a generic "unknown error" message rather than surfacing raw provider output.
 */
export function getHttpErrorMessage(status: number | null): HttpErrorPresentation {
  if (status === 401) {
    return {
      messageKey: 'errors.http.unauthorized.message',
      actionKey: 'errors.http.unauthorized.action',
    }
  }
  if (status === 403) {
    return {
      messageKey: 'errors.http.forbidden.message',
      actionKey: 'errors.http.forbidden.action',
    }
  }
  if (status === 404) {
    return {
      messageKey: 'errors.http.notFound.message',
      actionKey: 'errors.http.notFound.action',
    }
  }
  if (status === 429) {
    return {
      messageKey: 'errors.http.rateLimited.message',
      actionKey: 'errors.http.rateLimited.action',
    }
  }
  if (status !== null && status >= 500 && status < 600) {
    return {
      messageKey: 'errors.http.server.message',
      actionKey: 'errors.http.server.action',
    }
  }
  return {
    messageKey: 'errors.http.unknown.message',
    actionKey: 'errors.http.unknown.action',
  }
}
