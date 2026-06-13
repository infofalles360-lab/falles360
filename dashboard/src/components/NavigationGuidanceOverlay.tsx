import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  CornerUpLeft,
  CornerUpRight,
  LocateFixed,
  MapPinned,
  Navigation,
  Pause,
  RotateCw,
  Route,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RouteProfileToggle } from './RouteProfileToggle';
import { cn } from '../utils/cn';
import { formatDistance, type RouteProfile, type RouteStep } from '../utils/navigation';

const COMPACT_OVERLAY_BREAKPOINT = 1100;

function shouldUseCompactOverlay() {
  return typeof window !== 'undefined' && window.innerWidth <= COMPACT_OVERLAY_BREAKPOINT;
}

function formatArrivalTime(durationSeconds: number | null) {
  if (!durationSeconds) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(Date.now() + durationSeconds * 1000));
}

function resolveStreetLabel(step: RouteStep | null, destinationName: string) {
  if (!step) {
    return `Ruta hacia ${destinationName}`;
  }

  const normalizedStreet = step.streetName.trim();
  if (normalizedStreet.length > 0 && normalizedStreet !== 'la via indicada') {
    return normalizedStreet;
  }

  return step.instruction;
}

function resolveManeuverVisual(step: RouteStep | null, hasReachedDestination: boolean): {
  Icon: LucideIcon;
  badge: string;
  iconWrapClassName: string;
  badgeClassName: string;
} {
  if (hasReachedDestination) {
    return {
      Icon: MapPinned,
      badge: 'Destino',
      iconWrapClassName: 'bg-emerald-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.28)]',
      badgeClassName: 'bg-emerald-500/16 text-emerald-300',
    };
  }

  const instruction = step?.instruction.toLowerCase() ?? '';

  if (instruction.includes('izquierda')) {
    return {
      Icon: CornerUpLeft,
      badge: 'Gira a la izquierda',
      iconWrapClassName: 'bg-emerald-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.28)]',
      badgeClassName: 'bg-emerald-500/16 text-emerald-300',
    };
  }

  if (instruction.includes('derecha')) {
    return {
      Icon: CornerUpRight,
      badge: 'Gira a la derecha',
      iconWrapClassName: 'bg-emerald-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.28)]',
      badgeClassName: 'bg-emerald-500/16 text-emerald-300',
    };
  }

  if (instruction.includes('rotonda') || instruction.includes('cambio de sentido')) {
    return {
      Icon: RotateCw,
      badge: 'Sigue la rotonda',
      iconWrapClassName: 'bg-sky-500 text-white shadow-[0_16px_36px_rgba(14,165,233,0.26)]',
      badgeClassName: 'bg-sky-500/16 text-sky-300',
    };
  }

  return {
    Icon: ArrowUp,
    badge: 'Sigue recto',
    iconWrapClassName: 'bg-emerald-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.28)]',
    badgeClassName: 'bg-emerald-500/16 text-emerald-300',
  };
}

interface NavigationGuidanceOverlayProps {
  currentStep: RouteStep | null;
  currentStepLabel: string | null;
  distanceLabel: string | null;
  durationLabel: string | null;
  durationSeconds: number | null;
  destinationName: string;
  destinationArea: string;
  destinationLogoUrl?: string;
  routeProfile: RouteProfile;
  hasReachedDestination: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onLocate: () => void;
  onFocusRoute: () => void;
  onChangeProfile: (value: RouteProfile) => void;
  onToggleVoice: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onStopGuidance: () => void;
  onClose: () => void;
}

export function NavigationGuidanceOverlay({
  currentStep,
  currentStepLabel,
  distanceLabel,
  durationLabel,
  durationSeconds,
  destinationName,
  destinationArea,
  routeProfile,
  hasReachedDestination,
  voiceEnabled,
  voiceSupported,
  canGoPrevious,
  canGoNext,
  onLocate,
  onFocusRoute,
  onChangeProfile,
  onToggleVoice,
  onPreviousStep,
  onNextStep,
  onStopGuidance,
  onClose,
}: NavigationGuidanceOverlayProps) {
  const arrivalTimeLabel = formatArrivalTime(durationSeconds);
  const streetLabel = resolveStreetLabel(currentStep, destinationName);
  const instructionCopy = hasReachedDestination
    ? `Has llegado a ${destinationName}.`
    : currentStep?.instruction ?? `Sigue la ruta destacada hasta ${destinationName}.`;
  const topDistanceLabel = currentStep ? formatDistance(currentStep.distanceMeters) : distanceLabel || 'Ruta';
  const statsLabel = [
    distanceLabel,
    arrivalTimeLabel !== '--:--' ? `Llegada ${arrivalTimeLabel}` : null,
  ].filter(Boolean).join(' | ') || 'Calculando recorrido';
  const routeStatusLabel = hasReachedDestination ? 'Destino alcanzado' : 'Ruta en marcha';
  const routeModeLabel = routeProfile === 'walking' ? 'A pie' : 'Coche';
  const minimizedSummary = `${topDistanceLabel} | ${instructionCopy}`;
  const maneuverVisual = resolveManeuverVisual(currentStep, hasReachedDestination);
  const ManeuverIcon = maneuverVisual.Icon;
  const [isCompactViewport, setIsCompactViewport] = useState(shouldUseCompactOverlay);
  const [hasManualToggle, setHasManualToggle] = useState(false);
  const [isMinimized, setIsMinimized] = useState(shouldUseCompactOverlay);

  useEffect(() => {
    const handleResize = () => {
      setIsCompactViewport(shouldUseCompactOverlay());
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!hasManualToggle) {
      setIsMinimized(isCompactViewport);
    }
  }, [hasManualToggle, isCompactViewport]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[1100]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.06)_34%,rgba(2,6,23,0.42)_100%)]" />

      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={onLocate}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/16 bg-slate-950/82 text-white shadow-[0_18px_36px_rgba(2,6,23,0.28)] backdrop-blur-xl transition-colors hover:bg-slate-900/92"
          aria-label="Centrar en mi posicion"
        >
          <LocateFixed className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/75 bg-white/92 text-slate-700 shadow-[0_18px_36px_rgba(2,6,23,0.22)] backdrop-blur-xl transition-colors hover:bg-white"
          aria-label="Cerrar guiado"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]">
        <div className={cn(
          'pointer-events-auto w-full border border-white/80 bg-white/96 text-slate-950 shadow-[0_30px_70px_rgba(2,6,23,0.24)] backdrop-blur-2xl',
          isMinimized
            ? 'max-w-[30rem] rounded-[1.6rem] px-3 py-2.5'
            : 'max-w-[34rem] rounded-[2rem] px-3.5 py-3.5 sm:px-4 sm:py-4'
        )}>
          {isMinimized ? (
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]', maneuverVisual.iconWrapClassName)}>
                <ManeuverIcon className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {routeStatusLabel}
                  </p>
                  {currentStepLabel ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">
                      Paso {currentStepLabel}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">
                    {routeModeLabel}
                  </span>
                </div>
                <p className="mt-1 text-[1.45rem] font-black leading-none tracking-tight">
                  {durationLabel || '--'}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">
                  {minimizedSummary}
                </p>
                <p className="mt-0.5 text-[10px] font-black uppercase leading-4 tracking-[0.13em] text-brand">
                  {streetLabel}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setHasManualToggle(true);
                    setIsMinimized(false);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[1rem] bg-slate-100 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-200"
                  aria-label="Expandir guiado"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={onStopGuidance}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-slate-950 text-white transition-colors hover:bg-slate-800"
                  aria-label="Salir del guiado"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2.5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-slate-100 text-slate-700">
                  <Navigation className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {routeStatusLabel}
                  </p>
                  <p className="mt-1.5 text-[1.95rem] font-black leading-none tracking-tight sm:text-[2.35rem]">
                    {durationLabel || '--'}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-500 sm:text-sm">
                    {statsLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
                    {destinationArea} | {destinationName}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-emerald-50 text-emerald-600">
                    <MapPinned className="h-4.5 w-4.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHasManualToggle(true);
                      setIsMinimized(true);
                    }}
                    className={cn(
                      'inline-flex h-10 items-center justify-center rounded-[1rem] bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200',
                      isCompactViewport ? 'gap-1.5 px-3 text-[9px] font-black uppercase tracking-[0.14em]' : 'w-10'
                    )}
                    aria-label="Minimizar guiado"
                  >
                    <ChevronDown className="h-4.5 w-4.5" />
                    {isCompactViewport ? <span>Minimizar</span> : null}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {currentStepLabel ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
                    Paso {currentStepLabel}
                  </span>
                ) : null}

                <RouteProfileToggle
                  value={routeProfile}
                  onChange={onChangeProfile}
                  isDarkTheme={false}
                  compact
                />

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
                  {voiceSupported ? (voiceEnabled ? 'Voz activa' : 'Voz guiada') : 'Sin voz'}
                </span>
              </div>

              <div className="mt-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3.5 py-3 text-left">
                <div className="flex items-start gap-2.5">
                  <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem]', maneuverVisual.iconWrapClassName)}>
                    <ManeuverIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Proxima indicacion
                    </p>
                    <p className="mt-1 text-sm font-black leading-5 text-slate-950">
                      {instructionCopy}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                      {streetLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={onToggleVoice}
                  disabled={!voiceSupported}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-[1rem] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    voiceEnabled ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  {voiceSupported ? (voiceEnabled ? 'Silenciar' : 'Activar voz') : 'Sin voz'}
                </button>

                <button
                  type="button"
                  onClick={onFocusRoute}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[1rem] bg-slate-100 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <Route className="h-3.5 w-3.5" />
                  Ver ruta
                </button>

                <button
                  type="button"
                  onClick={onPreviousStep}
                  disabled={!canGoPrevious}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[1rem] bg-slate-100 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={onNextStep}
                  disabled={!canGoNext}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[1rem] bg-slate-100 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Siguiente
                </button>
              </div>

              <button
                type="button"
                onClick={onStopGuidance}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-[1.05rem] bg-slate-950 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-slate-800"
              >
                <Pause className="h-3.5 w-3.5" />
                Salir del guiado
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
