import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold text-gray-100">Something went wrong</h1>
            <p className="text-sm text-gray-400">
              An unexpected error occurred while rendering the app.
              This is likely a data issue for the selected institution.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400 bg-red-900/20 rounded-lg p-3 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
