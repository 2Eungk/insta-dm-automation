import { Component, type ErrorInfo, type ReactNode } from "react"

type AppErrorBoundaryProps = {
  readonly children: ReactNode
}

type AppErrorBoundaryState = {
  readonly hasError: boolean
  readonly detail: string | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false,
    detail: null,
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, detail: error.message }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Dashboard render failed", { error, componentStack: errorInfo.componentStack })
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="appShell">
        <section className="appErrorFallback" role="alert" aria-labelledby="app-error-title">
          <p className="eyebrow">Local demo recovery</p>
          <h1 id="app-error-title">Dashboard could not render this state.</h1>
          <p>
            The demo did not send data anywhere. Refresh to rebuild the dashboard from bundled mock data and local
            browser state.
          </p>
          {this.state.detail === null ? null : <code>{this.state.detail}</code>}
          <button type="button" onClick={() => window.location.reload()}>
            Refresh demo
          </button>
        </section>
      </main>
    )
  }
}
