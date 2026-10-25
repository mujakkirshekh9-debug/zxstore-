import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error) {
        readable = `${parsed.error} (${parsed.operationType || 'db'} on ${parsed.path || 'unknown'})`;
      }
    } catch {
      // Plain error string
    }
    return { hasError: true, errorMessage: readable };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ZX STORE ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaExceeded = this.state.errorMessage.includes('Quota exceeded');
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-2">
              {isQuotaExceeded ? 'Daily Database Quota Reached' : 'Something interrupted ZX STORE'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-5 break-words">
              {isQuotaExceeded
                ? 'Firestore daily free-tier quota has been reached and will reset tomorrow.'
                : this.state.errorMessage}
            </p>
            <button
              onClick={this.handleReload}
              className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
