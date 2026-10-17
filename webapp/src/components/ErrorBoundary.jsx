import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center font-mono select-none">
          <div className="w-12 h-12 rounded-xs bg-red-950/40 border border-red-500/40 flex items-center justify-center mb-4 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h2 className="text-sm font-bold tracking-wider uppercase mb-1">
            ПРОИЗОШЕЛ СБОЙ ИНТЕРФЕЙСА
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mb-4">
            Произошла непредвиденная ошибка в компоненте. Данные сохранены.
          </p>

          {this.state.error?.message && (
            <div className="p-2.5 bg-black/60 border border-white/10 text-zinc-500 text-[10px] text-left max-w-sm w-full mb-4 font-mono truncate">
              ERR: {this.state.error.message}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors rounded-xs active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ПЕРЕЗАГРУЗИТЬ ПРИЛОЖЕНИЕ</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
