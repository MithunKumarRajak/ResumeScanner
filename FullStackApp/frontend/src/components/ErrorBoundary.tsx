import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-6">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
          <p className="text-slate-400 mb-8 max-w-md">
            We encountered an unexpected error while trying to load this page. 
            Our team has been notified.
          </p>
          
          {this.state.error && (
            <div className="mb-8 p-4 bg-slate-900 rounded-lg border border-slate-800 text-left w-full max-w-2xl overflow-auto">
              <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error.message}
              </p>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
