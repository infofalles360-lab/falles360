import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CarFront,
  Navigation,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatDistance, formatDuration, type RouteProfile, type RouteStep } from '../utils/navigation';
import { type LocationStatus } from '../hooks/useUserLocation';
import { RouteProfileToggle } from './RouteProfileToggle';

interface NavigationDirectionsPanelProps {
  isDarkTheme: boolean;
  showDirections: boolean;
  onToggleDirections: () => void;
  currentStep: RouteStep | null;
  currentStepLabel: string | null;
  routeProfile: RouteProfile;
  routeError: string | null;
  locationStatus: LocationStatus;
  isRouteLoading: boolean;
  isRouteActive: boolean;
  isGuidanceActive: boolean;
  hasReachedDestination: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onStartGuidance: () => void;
  onStopGuidance: () => void;
  onChangeProfile: (value: RouteProfile) => void;
  onCancelRoute: () => void;
  onFocusRoute: () => void;
  onToggleVoice: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  googleMapsUrl: string;
  locationHelpVisible?: boolean;
}

export function NavigationDirectionsPanel({
  isDarkTheme,
  showDirections,
  onToggleDirections,
  currentStep,
  currentStepLabel,
  routeProfile,
  routeError,
  locationStatus,
  isRouteLoading,
  isRouteActive,
  isGuidanceActive,
  hasReachedDestination,
  voiceEnabled,
  voiceSupported,
  onStartGuidance,
  onStopGuidance,
  onChangeProfile,
  onCancelRoute,
  onFocusRoute,
  onToggleVoice,
  onPreviousStep,
  onNextStep,
  canGoPrevious,
  canGoNext,
  googleMapsUrl,
  locationHelpVisible = false,
}: NavigationDirectionsPanelProps) {
  const guidanceSummary = hasReachedDestination
    ? 'Has llegado. Puedes detener la navegacion.'
    : isGuidanceActive
      ? 'Modo guiado activo. La ruta ira marcando la siguiente maniobra.'
      : currentStep
        ? 'Vista previa lista. Pulsa iniciar navegacion para seguirla dentro de la app.'
        : 'Preparando indicaciones';

  const emptyCopy = routeError
    ? routeError
    : locationStatus === 'blocked'
      ? 'Necesitas activar la ubicacion para ver la guia paso a paso.'
      : locationStatus === 'unsupported'
        ? 'Este navegador no puede usar GPS para la guia interna.'
      : isRouteLoading
        ? 'Preparando el recorrido por calles...'
        : !isRouteActive
          ? 'La ruta aun no esta activa.'
          : 'No hay pasos disponibles todavia.';
  const primaryActionLabel = isRouteLoading
    ? 'Calculando...'
    : isGuidanceActive
      ? 'Detener navegacion'
      : locationStatus === 'loading'
        ? 'Buscando ubicacion...'
        : locationStatus === 'blocked'
          ? 'Activar ubicacion'
          : locationStatus === 'unsupported'
            ? 'Sin GPS'
          : 'Iniciar navegacion';
  const isPrimaryActionDisabled = isRouteLoading || locationStatus === 'unsupported';
  const shouldShowLocationHelp = locationHelpVisible && (locationStatus === 'blocked' || locationStatus === 'unsupported');

  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-4 grid items-end gap-3 sm:inset-x-5 lg:grid-cols-[minmax(0,1fr)_272px]">
      <div
        className={cn(
          'rounded-[2.15rem] border px-4 shadow-[0_30px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-all',
          showDirections ? 'py-4' : 'py-3',
          isDarkTheme ? 'border-white/10 bg-slate-950/82 text-white' : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,239,0.96))] text-slate-950'
        )}
      >
        <div className={cn('flex items-center justify-between gap-3', showDirections && 'mb-3')}>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-[1rem]',
                isDarkTheme ? 'bg-white/10 text-orange-200' : 'bg-brand/12 text-brand'
              )}
            >
              <Navigation className="h-5 w-5" />
            </span>
            <div>
              <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'text-white/52' : 'text-brand')}>
                Indicaciones
              </p>
              <p className={cn('text-sm font-bold', isDarkTheme ? 'text-white/76' : 'text-slate-600')}>
                {guidanceSummary}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RouteProfileToggle
              value={routeProfile}
              onChange={onChangeProfile}
              isDarkTheme={isDarkTheme}
            />
            <button
              type="button"
              onClick={onToggleDirections}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors',
                isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {showDirections ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {showDirections ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        {showDirections && (
          <div className="grid gap-3">
            {currentStep ? (
              <div
                className={cn(
                  'rounded-[1.7rem] border px-4 py-4',
                  isDarkTheme ? 'border-white/10 bg-white/8' : 'border-orange-100 bg-[#fff7ef]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'text-orange-200' : 'text-brand')}>
                        {isGuidanceActive ? 'Ahora' : 'Siguiente maniobra'}
                      </p>
                      {currentStepLabel ? (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
                            isDarkTheme ? 'bg-white/10 text-white/70' : 'bg-white text-slate-500'
                          )}
                        >
                          Paso {currentStepLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[1rem] font-black leading-[1.28] sm:text-[1.05rem]">
                      {currentStep.instruction}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                          isDarkTheme ? 'bg-white/10 text-white/80' : 'bg-white text-slate-700'
                        )}
                      >
                        {formatDistance(currentStep.distanceMeters)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                          isDarkTheme ? 'bg-white/10 text-white/80' : 'bg-white text-slate-700'
                        )}
                      >
                        {formatDuration(currentStep.durationSeconds)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                      isGuidanceActive
                        ? 'bg-emerald-500 text-white'
                        : isDarkTheme
                          ? 'bg-white/10 text-white/82'
                          : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {isGuidanceActive ? 'Modo guiado' : 'Vista previa'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]',
                      isDarkTheme ? 'bg-white/10 text-white/82' : 'bg-white text-slate-700'
                    )}
                  >
                    {routeProfile === 'driving' ? <CarFront className="h-3.5 w-3.5" /> : <Navigation className="h-3.5 w-3.5" />}
                    {routeProfile === 'driving' ? 'En coche' : 'A pie'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onPreviousStep}
                    disabled={!canGoPrevious}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={onNextStep}
                    disabled={!canGoNext}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Siguiente
                  </button>
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    disabled={!voiceSupported}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      voiceEnabled
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : isDarkTheme
                          ? 'bg-white/10 text-white hover:bg-white/14'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    {voiceSupported ? (voiceEnabled ? 'Voz activa' : 'Activar voz') : 'Voz no disponible'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'rounded-[1.35rem] border px-3.5 py-3 text-sm font-bold',
                  isDarkTheme ? 'border-white/10 bg-white/6 text-white/74' : 'border-slate-100 bg-[#fff8f1] text-slate-500'
                )}
              >
                {emptyCopy}
              </div>
            )}

            {shouldShowLocationHelp && (
              <div
                className={cn(
                  'rounded-[1.35rem] border px-3.5 py-3 text-sm font-bold leading-6',
                  isDarkTheme ? 'border-orange-400/20 bg-orange-500/10 text-orange-100' : 'border-orange-200 bg-orange-50 text-orange-700'
                )}
              >
                {locationStatus === 'blocked'
                  ? 'Para guiar dentro de la app debes permitir la ubicacion en el navegador. Pulsa el icono de ubicacion o el candado de la barra del navegador, permite el acceso y vuelve a pulsar el boton.'
                  : 'La guia interna necesita un navegador con geolocalizacion disponible.'}
              </div>
            )}

          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <button
          type="button"
          onClick={isGuidanceActive ? onStopGuidance : onStartGuidance}
          disabled={isPrimaryActionDisabled}
          className={cn(
            'col-span-2 inline-flex items-center justify-center gap-2 rounded-[1.55rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-1',
            isGuidanceActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand hover:bg-[#f45518]'
          )}
        >
          {isGuidanceActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {primaryActionLabel}
        </button>

        <button
          type="button"
          onClick={onToggleVoice}
          disabled={!voiceSupported}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-[1.55rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            voiceEnabled
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : isDarkTheme
                ? 'bg-white/10 text-white hover:bg-white/14'
                : 'bg-white/92 text-slate-700 hover:bg-white'
          )}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {voiceSupported ? 'Voz guiada' : 'Sin voz'}
        </button>

        <button
          type="button"
          onClick={onFocusRoute}
          className={cn(
            'rounded-[1.55rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors',
            isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-white/92 text-slate-700 hover:bg-white'
          )}
        >
          Ver ruta
        </button>

        <button
          type="button"
          onClick={onCancelRoute}
          className={cn(
            'col-span-2 rounded-[1.55rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors lg:col-span-1',
            isDarkTheme ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
          )}
        >
          Cancelar ruta
        </button>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'col-span-2 inline-flex items-center justify-center gap-2 rounded-[1.55rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors lg:col-span-1',
            isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-sky-600 text-white hover:bg-sky-700'
          )}
        >
          <ExternalLink className="h-4 w-4" />
          Abrir en Google Maps
        </a>
      </div>
    </div>
  );
}
