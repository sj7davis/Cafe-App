import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary — wraps the app to catch unhandled React render errors.
 * Without this, any component crash produces a completely blank page with
 * no message. Wrap at the App level and optionally at key sub-trees.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          background: '#F8F6F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, -apple-system, sans-serif',
          padding: 24,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #E4E4E7',
            padding: '40px 36px',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#09090B', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: '#71717A', margin: '0 0 24px', lineHeight: 1.6 }}>
              An unexpected error occurred. Refreshing the page usually fixes it.
            </p>
            <div style={{ background: '#F8F6F2', borderRadius: 8, padding: '12px 14px', marginBottom: 24, textAlign: 'left' }}>
              <code style={{ fontSize: 12, color: '#DC2626', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {this.state.error.message}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#09090B', color: '#fff', border: 'none',
                borderRadius: 9, padding: '12px 28px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
