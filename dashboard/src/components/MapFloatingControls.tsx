import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Layers3, LocateFixed, Navigation, SlidersHorizontal, X, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface MapFloatingThemeOption {
  id: string;
  label: string;
  shortLabel: string;
}

export interface MapFloatingLayerOption {
  checked: boolean;
  description: string;
  disabled?: boolean;
  key: string;
  label: string;
}

export interface MapFloatingInfoItem {
  id: string;
  label: string;
  tone?: 'brand' | 'danger' | 'neutral' | 'success';
  value: string;
}

interface MapFloatingControlsProps {
  activeMapThemeId: string;
  activePanel: ControlPanel;
  fallasLiveEnabled: boolean;
  incidentItems: MapFloatingInfoItem[];
  isAdmin: boolean;
  isBottomSheetOpen: boolean;
  isDetailCardOpen: boolean;
  isIncidentsVisible: boolean;
  isMapControlsExpanded: boolean;
  isMapInteracting: boolean;
  isMapLayersPanelOpen: boolean;
  isModalOpen?: boolean;
  isNavigationActive: boolean;
  isAgendaPreviewOpen?: boolean;
  isRoutePlannerOpen: boolean;
  isTrafficLayerActive: boolean;
  isUserLocationActive: boolean;
  isDarkTheme: boolean;
  layerOptions: MapFloatingLayerOption[];
  mapSearchQuery: string;
  onCenterUserLocation: () => void;
  onClosePanel: () => void;
  onMapSearchQueryChange: (value: string) => void;
  onOpenMapLayers: () => void;
  onToggleRoutePlanner: () => void;
  onSelectMapTheme: (id: string) => void;
  onSetMapControlsExpanded: (value: boolean) => void;
  onToggleFallasLive: () => void;
  onToggleIncidents: () => void;
  onToggleLayer: (key: string) => void;
  onToggleTrafficLayer: () => void;
  themeOptions: MapFloatingThemeOption[];
  trafficItems: MapFloatingInfoItem[];
}

type ControlAction = 'incidents' | 'layers' | 'location' | 'live' | 'routes' | 'traffic';
type ControlPanel = 'incidents' | 'layers' | 'traffic' | null;

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function vibrateFeedback() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function toneClasses(tone: MapFloatingInfoItem['tone'], isDarkTheme: boolean) {
  switch (tone) {
    case 'brand':
      return isDarkTheme ? 'bg-brand/20 text-brand' : 'bg-[#fff1e8] text-brand';
    case 'danger':
      return isDarkTheme ? 'bg-red-500/18 text-red-200' : 'bg-red-50 text-red-700';
    case 'success':
      return isDarkTheme ? 'bg-emerald-500/18 text-emerald-200' : 'bg-emerald-50 text-emerald-700';
    default:
      return isDarkTheme ? 'bg-white/8 text-white/70' : 'bg-slate-100 text-slate-600';
  }
}

function ControlIconButton({
  active,
  compact,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  compact: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-200',
        active
          ? 'border-brand/20 bg-brand text-white shadow-[0_16px_34px_rgba(255,99,33,0.34)]'
          : 'border-white/75 bg-white/88 text-slate-600 shadow-[0_12px_26px_rgba(15,23,42,0.12)] hover:bg-white',
        compact && 'h-10 w-10'
      )}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <Icon className={cn(compact ? 'h-4.5 w-4.5' : 'h-5 w-5')} />
    </motion.button>
  );
}

function DesktopPanel({
  children,
  isDarkTheme,
  title,
  onClose,
  positionClassName,
}: {
  children: React.ReactNode;
  isDarkTheme: boolean;
  onClose: () => void;
  positionClassName: string;
  title: string;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 18, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'pointer-events-auto absolute max-h-[calc(100dvh-7rem)] w-[min(22rem,calc(100vw-6rem))] overflow-y-auto rounded-[1.55rem] border p-4 shadow-[0_26px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl',
        isDarkTheme ? 'border-white/12 bg-slate-950/92 text-white' : 'border-white/80 bg-white/96 text-slate-950',
        positionClassName
      )}
      role="dialog"
      aria-modal="false"
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Mapa rapido</p>
          <h3 className="mt-1 text-sm font-black">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            isDarkTheme ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          )}
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </motion.aside>
  );
}

function InfoList({
  isDarkTheme,
  items,
}: {
  isDarkTheme: boolean;
  items: MapFloatingInfoItem[];
}) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'rounded-[1rem] border px-3.5 py-3',
            isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/90'
          )}
        >
          <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]', toneClasses(item.tone, isDarkTheme))}>
            {item.label}
          </span>
          <p className="mt-2 text-sm font-black leading-5">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function LayersPanelContent({
  activeMapThemeId,
  isDarkTheme,
  layerOptions,
  mapSearchQuery,
  onMapSearchQueryChange,
  onSelectMapTheme,
  onToggleLayer,
  themeOptions,
}: {
  activeMapThemeId: string;
  isDarkTheme: boolean;
  layerOptions: MapFloatingLayerOption[];
  mapSearchQuery: string;
  onMapSearchQueryChange: (value: string) => void;
  onSelectMapTheme: (id: string) => void;
  onToggleLayer: (key: string) => void;
  themeOptions: MapFloatingThemeOption[];
}) {
  void activeMapThemeId;
  void onSelectMapTheme;
  void themeOptions;

  return (
    <div className="space-y-4 pb-1">
      <div className={cn('rounded-[1.1rem] border px-3 py-3', isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/90')}>
        <label className="block">
          <span className={cn('mb-2 block text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/48' : 'text-slate-400')}>
            Buscar en el mapa
          </span>
          <input
            type="search"
            value={mapSearchQuery}
            onChange={(event) => onMapSearchQueryChange(event.target.value)}
            placeholder="Falla, barrio o seccion"
            className={cn(
              'w-full rounded-[0.95rem] border px-3 py-3 text-sm font-bold outline-none transition-colors',
              isDarkTheme ? 'border-white/10 bg-white/[0.05] text-white placeholder:text-white/28' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
            )}
          />
        </label>
      </div>

      <div className={cn('rounded-[1.1rem] border px-3 py-3', isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/90')}>
        <span className={cn('mb-2 block text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/48' : 'text-slate-400')}>
          Capas visibles
        </span>
        <div className="space-y-2">
          {layerOptions.map((option) => (
            <label
              key={option.key}
              className={cn(
                'flex items-center gap-3 rounded-[1rem] px-3 py-3',
                option.disabled
                  ? isDarkTheme
                    ? 'bg-white/[0.03] opacity-60'
                    : 'bg-slate-100/70 opacity-70'
                  : isDarkTheme
                    ? 'bg-white/[0.05]'
                    : 'bg-white'
              )}
            >
              <input
                type="checkbox"
                checked={option.checked}
                disabled={option.disabled}
                onChange={() => onToggleLayer(option.key)}
                className="h-4 w-4 accent-[#ff6321]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-5">{option.label}</span>
                <span className={cn('mt-0.5 block text-[11px] font-semibold leading-4', isDarkTheme ? 'text-white/52' : 'text-slate-500')}>
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MapFloatingControls({
  activeMapThemeId,
  activePanel,
  fallasLiveEnabled,
  incidentItems,
  isAdmin,
  isBottomSheetOpen,
  isDetailCardOpen,
  isIncidentsVisible,
  isMapControlsExpanded,
  isMapInteracting,
  isMapLayersPanelOpen,
  isModalOpen = false,
  isNavigationActive,
  isAgendaPreviewOpen = false,
  isRoutePlannerOpen,
  isTrafficLayerActive,
  isUserLocationActive,
  isDarkTheme,
  layerOptions,
  mapSearchQuery,
  onCenterUserLocation,
  onClosePanel,
  onMapSearchQueryChange,
  onOpenMapLayers,
  onToggleRoutePlanner,
  onSelectMapTheme,
  onSetMapControlsExpanded,
  onToggleFallasLive,
  onToggleIncidents,
  onToggleLayer,
  onToggleTrafficLayer,
  themeOptions,
  trafficItems,
}: MapFloatingControlsProps) {
  const autoCompactTimerRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = React.useState(() => (typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA_QUERY).matches : true));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (autoCompactTimerRef.current !== null) {
      window.clearTimeout(autoCompactTimerRef.current);
      autoCompactTimerRef.current = null;
    }

    if (isModalOpen) {
      onSetMapControlsExpanded(false);
      return;
    }

    if ((isMobile || isNavigationActive) && isMapControlsExpanded) {
      autoCompactTimerRef.current = window.setTimeout(() => {
        onSetMapControlsExpanded(false);
      }, 5000);
    }

    return () => {
      if (autoCompactTimerRef.current !== null) {
        window.clearTimeout(autoCompactTimerRef.current);
        autoCompactTimerRef.current = null;
      }
    };
  }, [isMapControlsExpanded, isMapInteracting, isMobile, isModalOpen, isNavigationActive, onSetMapControlsExpanded]);

  useEffect(() => {
    if (isNavigationActive || (isMobile && isDetailCardOpen)) {
      onSetMapControlsExpanded(false);
    }
  }, [isDetailCardOpen, isMobile, isNavigationActive, onSetMapControlsExpanded]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClosePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClosePanel]);

  if (isModalOpen) {
    return null;
  }

  const shouldForceCompact = isMobile || isNavigationActive || (isDetailCardOpen && isMobile);
  const controlsExpanded = shouldForceCompact ? isMapControlsExpanded && !isDetailCardOpen && !isNavigationActive : isMapControlsExpanded;
  const stackOpacity = isNavigationActive ? 0.55 : isMapInteracting ? 0.68 : 1;
  const shouldHideStackWhileMobilePanelOpen = isMobile && activePanel !== null;
  const positionClassName = isMobile
    ? isDetailCardOpen
      ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+12.5rem)] right-3 top-auto translate-y-0'
      : isAgendaPreviewOpen
        ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+15.05rem)] right-3 top-auto translate-y-0'
        : 'bottom-[calc(env(safe-area-inset-bottom,0px)+5.8rem)] right-3 top-auto translate-y-0'
    : 'right-3 top-1/2 -translate-y-1/2 sm:right-4';
  const panelPositionClassName = isMobile
    ? 'hidden'
    : 'right-[4.5rem] top-1/2 -translate-y-1/2';

  const controlButtons: Array<{
    action: ControlAction;
    active: boolean;
    icon: LucideIcon;
    label: string;
  }> = [
    { action: 'routes', active: isRoutePlannerOpen, icon: Navigation, label: 'Abrir planificador de ruta' },
    { action: 'layers', active: isMapLayersPanelOpen, icon: SlidersHorizontal, label: 'Abrir capas del mapa' },
    { action: 'location', active: isUserLocationActive, icon: LocateFixed, label: 'Centrar mi ubicacion' },
  ];

  const handleAction = (action: ControlAction) => {
    if (shouldForceCompact) {
      onSetMapControlsExpanded(true);
    }

    vibrateFeedback();

    switch (action) {
      case 'traffic':
        onToggleTrafficLayer();
        break;
      case 'live':
        onToggleFallasLive();
        break;
      case 'layers':
        onOpenMapLayers();
        break;
      case 'routes':
        onToggleRoutePlanner();
        break;
      case 'incidents':
        onToggleIncidents();
        break;
      case 'location':
        onCenterUserLocation();
        break;
      default:
        break;
    }
  };

  return (
    <>
      <AnimatePresence>
        {activePanel && isMobile ? (
          <motion.button
            type="button"
            aria-label="Cerrar panel del mapa"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-[1038] bg-transparent"
            onClick={onClosePanel}
          />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'pointer-events-none absolute z-[1040] transition-opacity duration-200',
          positionClassName,
          shouldHideStackWhileMobilePanelOpen && 'opacity-0'
        )}
        style={{ opacity: shouldHideStackWhileMobilePanelOpen ? 0 : stackOpacity }}
        aria-hidden={shouldHideStackWhileMobilePanelOpen}
      >
        <div className="flex flex-col items-end gap-2">
          <AnimatePresence initial={false}>
            {controlsExpanded ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none flex flex-col gap-2"
              >
                {controlButtons.map((button, index) => (
                  <motion.div
                    key={button.action}
                    initial={{ opacity: 0, scale: 0.92, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 4 }}
                    transition={{ duration: 0.18, delay: index * 0.02 }}
                  >
                    <ControlIconButton
                      active={button.action === 'live' ? fallasLiveEnabled && button.active : button.active}
                      compact={isMobile}
                      icon={button.icon}
                      label={button.label}
                      onClick={() => handleAction(button.action)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => {
              vibrateFeedback();
              onSetMapControlsExpanded(!controlsExpanded);
              if (controlsExpanded) {
                onClosePanel();
              }
            }}
            className={cn(
              'pointer-events-auto relative inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_16px_34px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200',
              controlsExpanded
                ? 'border-brand/20 bg-brand text-white'
                : 'border-white/80 bg-white/92 text-slate-700 hover:bg-white'
            )}
            aria-label={controlsExpanded ? 'Ocultar controles y rutas del mapa' : 'Mostrar controles y rutas del mapa'}
            aria-expanded={controlsExpanded}
          >
            <Layers3 className="h-5 w-5" />
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 text-white shadow-[0_10px_18px_rgba(255,99,33,0.28)]',
                controlsExpanded ? 'border-brand bg-slate-950' : 'border-white bg-brand'
              )}
              aria-hidden="true"
            >
              <Navigation className="h-2.5 w-2.5" />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {activePanel && !isMobile ? (
          <DesktopPanel
            isDarkTheme={isDarkTheme}
            onClose={onClosePanel}
            positionClassName={panelPositionClassName}
            title={
              activePanel === 'layers'
                ? 'Capas del mapa'
                : activePanel === 'traffic'
                  ? 'Accesos y trafico'
                  : 'Incidencias activas'
            }
          >
            {activePanel === 'layers' ? (
              <LayersPanelContent
                activeMapThemeId={activeMapThemeId}
                isDarkTheme={isDarkTheme}
                layerOptions={layerOptions}
                mapSearchQuery={mapSearchQuery}
                onMapSearchQueryChange={onMapSearchQueryChange}
                onSelectMapTheme={onSelectMapTheme}
                onToggleLayer={onToggleLayer}
                themeOptions={themeOptions}
              />
            ) : activePanel === 'traffic' ? (
              <InfoList isDarkTheme={isDarkTheme} items={trafficItems} />
            ) : (
              <InfoList isDarkTheme={isDarkTheme} items={incidentItems} />
            )}
          </DesktopPanel>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activePanel && isMobile ? (
          <motion.section
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22 }}
            className={cn(
              'pointer-events-auto absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] top-[max(5.5rem,env(safe-area-inset-top,0px)+4.5rem)] z-[1042] overflow-hidden rounded-[1.55rem] border shadow-[0_28px_72px_rgba(15,23,42,0.22)] backdrop-blur-2xl',
              isDarkTheme ? 'border-white/12 bg-slate-950/95 text-white' : 'border-white/80 bg-white/97 text-slate-950'
            )}
            role="dialog"
            aria-modal="false"
            aria-label={
              activePanel === 'layers'
                ? 'Capas del mapa'
                : activePanel === 'traffic'
                  ? 'Accesos y trafico'
                  : 'Incidencias activas'
            }
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Mapa rapido</p>
                <h3 className="mt-1 text-sm font-black">
                  {activePanel === 'layers' ? 'Capas del mapa' : activePanel === 'traffic' ? 'Accesos y trafico' : 'Incidencias activas'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClosePanel}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                  isDarkTheme ? 'bg-white/8 text-white/72 hover:bg-white/12' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}
                aria-label="Cerrar panel"
              >
                <ChevronDown className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="max-h-[calc(100dvh-max(5.5rem,env(safe-area-inset-top,0px)+4.5rem)-5rem-env(safe-area-inset-bottom,0px)-4.5rem)] overflow-y-auto px-4 pb-5">
              {activePanel === 'layers' ? (
                <LayersPanelContent
                  activeMapThemeId={activeMapThemeId}
                  isDarkTheme={isDarkTheme}
                  layerOptions={layerOptions}
                  mapSearchQuery={mapSearchQuery}
                  onMapSearchQueryChange={onMapSearchQueryChange}
                  onSelectMapTheme={onSelectMapTheme}
                  onToggleLayer={onToggleLayer}
                  themeOptions={themeOptions}
                />
              ) : activePanel === 'traffic' ? (
                <InfoList isDarkTheme={isDarkTheme} items={trafficItems} />
              ) : (
                <InfoList isDarkTheme={isDarkTheme} items={incidentItems} />
              )}
              <p className={cn('mt-3 text-[11px] font-bold leading-5', isDarkTheme ? 'text-white/45' : 'text-slate-400')}>
                {activePanel === 'layers'
                  ? 'Las capas sin datos en esta vista quedan preparadas para conectar API y no afectan al mapa actual.'
                  : activePanel === 'traffic'
                    ? 'Resumen discreto sobre el mapa para no tapar la cartografia.'
                    : isAdmin
                      ? 'Fallas Live sigue controlado globalmente desde el panel admin.'
                      : 'Puedes ocultar estos avisos en tu mapa sin desactivar Fallas Live globalmente.'}
              </p>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}
