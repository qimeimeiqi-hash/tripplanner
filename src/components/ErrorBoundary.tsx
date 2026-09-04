import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackMessage: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches rendering errors from AI-generated content that slips past parseItineraryResponse's
 * validation in some unanticipated shape (e.g. a field that should be a string but isn't).
 * Without this, an uncaught render error blanks the entire page with no explanation, since
 * React unmounts the whole tree by default and this app has no other error boundary.
 *
 * A caught error is only cleared by remounting this component — render a new instance (e.g. by
 * passing a `key` that changes with the result being shown) rather than trying to reset it in
 * place, since a class component has no lifecycle hook for "clear this error" that doesn't also
 * risk looping.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Itinerary render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return <p className="error-banner">{this.props.fallbackMessage}</p>
    }
    return this.props.children
  }
}
