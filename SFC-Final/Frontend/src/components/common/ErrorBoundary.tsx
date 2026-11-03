import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-slate-800 shadow-sm max-w-2xl mx-auto">
          <div className="flex items-center gap-3 text-rose-700 mb-4">
            <AlertTriangle className="w-8 h-8 flex-shrink-0 animate-bounce" />
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {this.props.fallbackTitle || 'Red Flag View Encountered an Issue'}
              </h2>
              <p className="text-xs text-rose-600 font-mono">
                The component encountered an unexpected error while rendering.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-xl border border-rose-100 font-mono text-xs text-slate-700 mb-4 overflow-auto max-h-48">
            <div className="font-bold text-rose-800 mb-1">
              {this.state.error?.name}: {this.state.error?.message}
            </div>
            {this.state.errorInfo?.componentStack && (
              <pre className="text-[10px] text-slate-500 whitespace-pre-wrap leading-tight mt-2">
                {this.state.errorInfo.componentStack.trim()}
              </pre>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

