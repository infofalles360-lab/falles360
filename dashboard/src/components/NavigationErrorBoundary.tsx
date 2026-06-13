// @ts-nocheck
import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface NavigationErrorBoundaryProps {
  children: ReactNode;
  isDarkMode: boolean;
  onReset: () => void;
}

interface NavigationErrorBoundaryState {
  hasError: boolean;
}

export class NavigationErrorBoundary extends Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(): NavigationErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Navigation render failed:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className={cn(
          'pointer-events-auto rounded-[2.5rem] border p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]',
          this.props.isDarkMode ? 'border-white/10 bg-[#0d0f12] text-white' : 'border-white/70 bg-white text-slate-950'
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-brand/12 text-brand">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-brand">Navegacion</p>
            <h3 className="mt-2 text-[1.35rem] font-black leading-tight">
              La vista de ruta ha fallado al abrirse.
            </h3>
            <p className={cn('mt-3 max-w-[36rem] text-sm font-bold leading-6', this.props.isDarkMode ? 'text-white/68' : 'text-slate-600')}>
              He bloqueado ese error para que la app no se quede en blanco. Puedes reintentar abrir la ruta o cerrar este panel.
            </p>
          </div>

          <button
            type="button"
            onClick={this.props.onReset}
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] border transition-colors',
              this.props.isDarkMode ? 'border-white/10 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 rounded-[1.2rem] bg-brand px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_34px_rgba(255,99,33,0.22)] transition-colors hover:bg-[#f45518]"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <button
            type="button"
            onClick={this.props.onReset}
            className={cn(
              'inline-flex items-center gap-2 rounded-[1.2rem] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-colors',
              this.props.isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            Cerrar ruta
          </button>
        </div>
      </div>
    );
  }
}
