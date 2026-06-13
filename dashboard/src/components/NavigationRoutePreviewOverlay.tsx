import {
  ChevronUp,
  ExternalLink,
  LocateFixed,
  Navigation,
  Route,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { type LocationStatus } from '../hooks/useUserLocation';
import { cn } from '../utils/cn';
import { formatDistance, type RouteStep } from '../utils/navigation';

interface NavigationRoutePreviewOverlayProps {
  isDarkTheme: boolean;
  destinationName: string;
  destinationArea: string;
  currentStep: RouteStep | null;
  routeSteps: RouteStep[];
  distanceLabel: string | null;
  durationLabel: string | null;
  statusCopy: string;
  locationStatus: LocationStatus;
  isRouteLoading: boolean;
  routeError: string | null;
  googleMapsUrl: string;
  locationHelpVisible?: boolean;
  onStart: () => void;
  onLocate: () => void;
  onFocusRoute: () => void;
  onCancel: () => void;
}

export function NavigationRoutePreviewOverlay({
  isDarkTheme,
  destinationName,
  destinationArea,
  routeSteps,
  distanceLabel,
  durationLabel,
  statusCopy,
  locationStatus,
  isRouteLoading,
  routeError,
  googleMapsUrl,
  locationHelpVisible = false,
  onStart,
  onLocate,
  onFocusRoute,
  onCancel,
}: NavigationRoutePreviewOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const routeCopyClassName = '[overflow-wrap:break-word] [word-break:normal] [text-wrap:pretty]';
  const headline = routeError
    ? 'No se pudo preparar la ruta'
    : isRouteLoading
      ? 'Preparando ruta'
      : 'Iniciar ruta';
  const summaryLabel = [durationLabel, distanceLabel].filter(Boolean).join(' | ') || 'Calculando recorrido a pie';
  const primaryActionLabel = isRouteLoading ? 'Preparando...' : 'Iniciar ruta';
  const isPrimaryDisabled = isRouteLoading || locationStatus === 'unsupported';
  const showMapsButton = googleMapsUrl !== '#';
  const visibleSteps = routeSteps
    .filter((step) => step.instruction.trim().length > 0 && step.distanceMeters > 0)
    .slice(0, 2);

  useEffect(() => {
    setIsMinimized(true);
  }, [destinationName]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[1080]">
      <div className={cn(
        'absolute inset-0 transition-opacity',
        isMinimized
          ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.03),rgba(15,23,42,0)_44%,rgba(15,23,42,0.08)_100%)]'
          : 'bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.02)_38%,rgba(15,23,42,0.16)_100%)]'
      )} />

      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={onLocate}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border shadow-[0_18px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-colors',
            isDarkTheme ? 'border-white/12 bg-slate-950/82 text-white hover:bg-slate-900/90' : 'border-white/80 bg-white/94 text-slate-700 hover:bg-white'
          )}
          aria-label="Centrar en mi posicion"
        >
          <LocateFixed className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border shadow-[0_18px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-colors',
            isDarkTheme ? 'border-white/12 bg-slate-950/82 text-white hover:bg-slate-900/90' : 'border-white/80 bg-white/94 text-slate-700 hover:bg-white'
          )}
          aria-label="Cancelar ruta"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+5.4rem)] sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
        {isMinimized ? (
          <div
            className={cn(
              'pointer-events-auto flex w-full max-w-[31rem] items-center gap-2 rounded-[1.25rem] border px-2.5 py-2 shadow-[0_20px_48px_rgba(15,23,42,0.22)] backdrop-blur-2xl',
              isDarkTheme ? 'border-white/12 bg-slate-950/90 text-white' : 'border-white/80 bg-white/96 text-slate-950'
            )}
          >
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] transition-colors',
                isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
              aria-label="Ampliar panel de ruta"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-brand">Ruta lista</p>
              <p className={cn('mt-0.5 truncate text-[12px] font-black', isDarkTheme ? 'text-white' : 'text-slate-950')}>
                {summaryLabel}
              </p>
            </button>

            <button
              type="button"
              onClick={onStart}
              disabled={isPrimaryDisabled}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[0.95rem] bg-brand px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_rgba(255,99,33,0.26)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Navigation className="h-3.5 w-3.5" />
              Iniciar
            </button>

            <button
              type="button"
              onClick={onCancel}
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] transition-colors',
                isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
              aria-label="Deshacer ruta"
              title="Deshacer ruta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
        <div
          className={cn(
            'pointer-events-auto flex max-h-[44vh] w-full max-w-[31rem] flex-col overflow-hidden rounded-[1.55rem] border px-3 py-3 shadow-[0_26px_62px_rgba(15,23,42,0.24)] backdrop-blur-2xl sm:max-h-[58vh] sm:rounded-[2rem] sm:px-5 sm:py-5',
            isDarkTheme ? 'border-white/12 bg-slate-950/90 text-white' : 'border-white/80 bg-white/96 text-slate-950'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {headline}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                  isDarkTheme ? 'bg-white/10 text-white/72' : 'bg-slate-100 text-slate-600'
                )}
              >
                {summaryLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
              aria-label="Minimizar panel de ruta"
            >
              <ChevronUp className="h-4 w-4 rotate-180" />
            </button>
          </div>

          <p className="mt-2 text-[1rem] font-black leading-tight sm:mt-3 sm:text-[1.55rem]">
            Iniciar ruta
          </p>
          <p className={cn('mt-1 line-clamp-2 text-[11.5px] font-bold leading-4 sm:text-sm sm:leading-6', isDarkTheme ? 'text-white/74' : 'text-slate-600')}>
            El mapa se convertira en modo guiado dentro de la app para llevarte hasta {destinationName}.
          </p>

          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden sm:mt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className={cn('col-span-2 rounded-[1rem] border px-2.5 py-2 sm:col-span-1 sm:rounded-[1.35rem] sm:px-3.5 sm:py-3', isDarkTheme ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-slate-50/80')}>
                <p className={cn('text-[9px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/46' : 'text-slate-400')}>
                  Destino
                </p>
                <p className="mt-1 line-clamp-1 text-[12px] font-black leading-4 sm:mt-1.5 sm:text-sm sm:leading-5">{destinationName}</p>
              </div>
              <div className={cn('rounded-[1rem] border px-2.5 py-2 sm:rounded-[1.35rem] sm:px-3.5 sm:py-3', isDarkTheme ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-slate-50/80')}>
                <p className={cn('text-[9px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/46' : 'text-slate-400')}>
                  Tiempo
                </p>
                <p className="mt-1 text-[12px] font-black leading-4 sm:mt-1.5 sm:text-sm sm:leading-5">{durationLabel || 'Calculando'}</p>
              </div>
              <div className={cn('rounded-[1rem] border px-2.5 py-2 sm:rounded-[1.35rem] sm:px-3.5 sm:py-3', isDarkTheme ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-slate-50/80')}>
                <p className={cn('text-[9px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/46' : 'text-slate-400')}>
                  Distancia
                </p>
                <p className="mt-1 text-[12px] font-black leading-4 sm:mt-1.5 sm:text-sm sm:leading-5">{distanceLabel || 'Calculando'}</p>
              </div>
            </div>

            <div className="mt-3 hidden min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar sm:mt-4 sm:block">
              {visibleSteps.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'text-white/42' : 'text-slate-400')}>
                      Siguientes pasos
                    </p>
                    <p className={cn('text-[10px] font-black uppercase tracking-[0.14em]', isDarkTheme ? 'text-white/36' : 'text-slate-400')}>
                      {visibleSteps.length} tramos
                    </p>
                  </div>

                  <div className="mt-2 space-y-2">
                    {visibleSteps.map((step, index) => (
                      <div
                        key={`${index}-${step.instruction}`}
                        className={cn(
                          'flex items-start gap-2.5 rounded-[1.1rem] border px-2.5 py-2.5 sm:gap-3 sm:rounded-[1.25rem] sm:px-3 sm:py-3',
                          isDarkTheme ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-slate-50/85'
                        )}
                      >
                        <span className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white sm:h-7 sm:w-7">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-[13px] font-black leading-[1.38] sm:text-sm', routeCopyClassName)}>{step.instruction}</p>
                          <p className={cn('mt-1 text-[10.5px] font-bold sm:text-[11px]', routeCopyClassName, isDarkTheme ? 'text-white/58' : 'text-slate-500')}>
                            {formatDistance(step.distanceMeters)}{step.streetName ? ` - ${step.streetName}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className={cn('mt-4 text-[13px] font-bold leading-5 sm:text-sm sm:leading-6', isDarkTheme ? 'text-white/70' : 'text-slate-600')}>
                {statusCopy}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={onFocusRoute}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-[0.95rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors sm:rounded-[1.15rem] sm:py-3',
                isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              <Route className="h-4 w-4" />
              Ver trazado
            </button>

            {showMapsButton ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[0.95rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors sm:rounded-[1.15rem] sm:py-3',
                  isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en Maps
              </a>
            ) : (
              <button
                type="button"
                onClick={onLocate}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[0.95rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors sm:rounded-[1.15rem] sm:py-3',
                  isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                <LocateFixed className="h-4 w-4" />
                Activar GPS
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={isPrimaryDisabled}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-brand px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_34px_rgba(255,99,33,0.28)] transition-colors hover:bg-[#f45518] disabled:cursor-not-allowed disabled:opacity-55 sm:mt-3 sm:rounded-[1.2rem] sm:py-3.5"
          >
            <Navigation className="h-4 w-4" />
            {primaryActionLabel}
          </button>

          {locationHelpVisible && (
            <div
              className={cn(
                'mt-3 rounded-[1.2rem] border px-3.5 py-3 text-sm font-bold leading-6',
                isDarkTheme ? 'border-orange-400/20 bg-orange-500/10 text-orange-100' : 'border-orange-200 bg-orange-50 text-orange-700'
              )}
            >
              {locationStatus === 'blocked'
                ? 'Para iniciar la ruta dentro de la app debes permitir la ubicacion en el navegador.'
                : 'Este navegador no puede usar geolocalizacion para la guia interna.'}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
