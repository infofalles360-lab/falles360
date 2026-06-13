import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  CarFront,
  Clock3,
  ExternalLink,
  Footprints,
  Layers3,
  LocateFixed,
  MapPinned,
  Navigation,
  Route,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { type Falla } from '../data';
import { useNavigationGuidance } from '../hooks/useNavigationGuidance';
import { type LocationStatus } from '../hooks/useUserLocation';
import { useRouteData } from '../hooks/useRouteData';
import { safeFitBounds, safeFlyTo, safeInvalidate, safeSetView } from '../utils/mapSafe';
import { getFitBoundsOptions, getGuidanceViewport } from '../utils/mapViewport';
import { MAP_THEMES, getMapTheme, type MapStyleId } from '../utils/mapThemes';
import { buildGoogleMapsDirectionsUrl, formatDistance, formatDuration, type MapPoint, type RouteProfile } from '../utils/navigation';
import { NavigationGuidanceOverlay } from './NavigationGuidanceOverlay';
import { RouteProfileToggle } from './RouteProfileToggle';
import { RoutePolylineLayer } from './RoutePolylineLayer';

const defaultCenter: MapPoint = [39.4699, -0.3763];

const createFallaIcon = () => new L.DivIcon({
  className: 'navigation-falla-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute -top-9 rounded-full bg-white/96 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ff6321] shadow-[0_12px_30px_rgba(15,23,42,0.14)]">Meta</div>
      <div class="absolute h-12 w-12 rounded-full bg-[#ff6321]/16 blur-[1px]"></div>
      <div class="relative flex h-11 w-11 items-center justify-center rounded-[1.25rem] border-2 border-white bg-[#ff6321] text-white shadow-[0_18px_38px_rgba(255,99,33,0.42)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a2.5 2.5 0 0 1-5 0c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054-2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a2.5 2.5 0 0 1-5 0z"/></svg>
      </div>
    </div>
  `,
  iconSize: [52, 62],
  iconAnchor: [26, 38],
});

const createUserIcon = () => new L.DivIcon({
  className: 'navigation-user-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-16 w-16 rounded-full bg-cyan-500/16 animate-ping"></div>
      <div class="absolute -top-8 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)]">Tu</div>
      <div class="relative flex h-9 w-9 items-center justify-center rounded-[1.05rem] border-[4px] border-white bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 text-[18px] shadow-[0_0_0_10px_rgba(14,165,233,0.18),0_16px_34px_rgba(29,78,216,0.32)]">🔥</div>
    </div>
  `,
  iconSize: [58, 68],
  iconAnchor: [29, 37],
});
const FALLA_ICON = createFallaIcon();
const USER_ICON = createUserIcon();

function RouteThemeSwitcher({
  value,
  onChange,
  isDarkTheme,
}: {
  value: MapStyleId;
  onChange: (value: MapStyleId) => void;
  isDarkTheme: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[1.6rem] border px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-2xl',
        isDarkTheme ? 'border-white/10 bg-slate-950/78 text-white' : 'border-white/70 bg-white/92 text-slate-950'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]',
            isDarkTheme ? 'bg-white/10 text-white/82' : 'bg-[#fff2e8] text-brand'
          )}
        >
          <Layers3 className="h-3.5 w-3.5" />
          Capas
        </span>

        {MAP_THEMES.map((theme) => {
          const isActive = value === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={cn(
                'rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                isActive
                  ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
                  : isDarkTheme
                    ? 'bg-white/8 text-white/74 hover:bg-white/12'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              {theme.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavigationViewport({
  routeGeometry,
  destination,
  userPosition,
  focusUserToken,
  focusRouteToken,
  guidanceMode,
  mode,
}: {
  routeGeometry: MapPoint[] | null;
  destination: MapPoint | null;
  userPosition: MapPoint | null;
  focusUserToken: number;
  focusRouteToken: number;
  guidanceMode: boolean;
  mode: 'modal' | 'docked';
}) {
  const map = useMap();
  const [viewportToken, setViewportToken] = useState(0);
  const guidanceIntroTimeoutRef = useRef<number | null>(null);
  const previousGuidanceModeRef = useRef(false);

  const clearGuidanceIntroTimeout = () => {
    if (guidanceIntroTimeoutRef.current !== null) {
      window.clearTimeout(guidanceIntroTimeoutRef.current);
      guidanceIntroTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      safeInvalidate(map);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [map]);

  useEffect(() => {
    const handleResize = () => setViewportToken((current) => current + 1);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const justActivated = guidanceMode && !previousGuidanceModeRef.current;
    previousGuidanceModeRef.current = guidanceMode;

    if (!guidanceMode) {
      clearGuidanceIntroTimeout();
      return;
    }

    if (!justActivated || !userPosition) {
      return;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      safeInvalidate(map);
      safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, mode === 'docked' ? 'main' : 'modal', true));
      guidanceIntroTimeoutRef.current = window.setTimeout(() => {
        const { center, zoom } = getGuidanceViewport(map, userPosition, mode);
        safeFlyTo(map, center, zoom, {
          duration: 0.85,
          easeLinearity: 0.25,
        });
        guidanceIntroTimeoutRef.current = null;
      }, 520);
      return;
    }

    const { center, zoom } = getGuidanceViewport(map, userPosition, mode);
    safeSetView(map, center, zoom, {
      animate: false,
    });
  }, [guidanceMode, map, mode, routeGeometry, userPosition]);

  useEffect(() => {
    const syncViewport = () => {
      safeInvalidate(map);

      if (guidanceMode && userPosition) {
        if (guidanceIntroTimeoutRef.current !== null) {
          return;
        }

        const { center, zoom } = getGuidanceViewport(map, userPosition, mode);
        safeSetView(map, center, zoom, {
          animate: false,
        });
        return;
      }

      if (routeGeometry && routeGeometry.length > 1) {
        safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, mode === 'docked' ? 'main' : 'modal', true));
        return;
      }

      if (destination && userPosition) {
        safeFitBounds(map, [userPosition, destination], getFitBoundsOptions(map, mode === 'docked' ? 'main' : 'modal', false));
        return;
      }

      if (destination) {
        safeFlyTo(map, destination, map.getSize().x < 640 ? 15 : 16, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    };

    syncViewport();
    const timeoutIds = [220, 420].map((delay) => window.setTimeout(syncViewport, delay));

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [destination, guidanceMode, map, mode, routeGeometry, userPosition, viewportToken]);

  useEffect(() => {
    if (!focusUserToken || !userPosition) {
      return;
    }

    if (guidanceIntroTimeoutRef.current !== null) {
      return;
    }

    if (guidanceMode) {
      const { center, zoom } = getGuidanceViewport(map, userPosition, mode);
      safeSetView(map, center, zoom, {
        animate: false,
      });
      return;
    }

    safeFlyTo(map, userPosition, 16, {
      duration: 1.1,
      easeLinearity: 0.25,
    });
  }, [focusUserToken, guidanceMode, map, mode, userPosition]);

  useEffect(() => {
    if (!focusRouteToken) {
      return;
    }

    if (guidanceMode && guidanceIntroTimeoutRef.current !== null) {
      if (routeGeometry && routeGeometry.length > 1) {
        safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, mode === 'docked' ? 'main' : 'modal', true));
      }
      return;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, mode === 'docked' ? 'main' : 'modal', true));
      return;
    }

    if (destination && userPosition) {
      safeFitBounds(map, [userPosition, destination], getFitBoundsOptions(map, mode === 'docked' ? 'main' : 'modal', false));
      return;
    }

    if (destination) {
      safeFlyTo(map, destination, map.getSize().x < 640 ? 15 : 16, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [destination, focusRouteToken, guidanceMode, map, mode, routeGeometry, userPosition]);

  useEffect(() => () => {
    clearGuidanceIntroTimeout();
  }, []);

  return null;
}

interface NavigationMapModalProps {
  falla: Falla | null;
  isDarkMode: boolean;
  mapStyleId: MapStyleId;
  setMapStyleId: (value: MapStyleId) => void;
  activeRouteFallaId: string | null;
  setActiveRouteFallaId: (value: string | null) => void;
  userPosition: MapPoint | null;
  locationStatus: LocationStatus;
  requestLocation: () => Promise<MapPoint>;
  onClose: () => void;
  variant?: 'overlay' | 'docked';
  onGuidanceActiveChange?: (active: boolean) => void;
}

export function NavigationMapModal({
  falla,
  isDarkMode,
  mapStyleId,
  setMapStyleId,
  activeRouteFallaId,
  setActiveRouteFallaId,
  userPosition,
  locationStatus,
  requestLocation,
  variant = 'overlay',
  onClose,
  onGuidanceActiveChange,
}: NavigationMapModalProps) {
  const [focusUserToken, setFocusUserToken] = useState(0);
  const [focusRouteToken, setFocusRouteToken] = useState(0);
  const [autoRequestedForId, setAutoRequestedForId] = useState<string | null>(null);
  const [pendingGuidanceStart, setPendingGuidanceStart] = useState(false);
  const [showDirections, setShowDirections] = useState(true);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('walking');
  const destination = falla ? ([falla.lat, falla.lng] as MapPoint) : null;
  const isRouteActive = Boolean(falla && activeRouteFallaId === falla.id);
  const activeTheme = useMemo(() => getMapTheme(mapStyleId), [mapStyleId]);
  const isDarkTheme = isDarkMode || activeTheme.id === 'night' || activeTheme.id === 'satellite';
  const { routeData, routeDataKey, routeError, routeRequestKey, isRouteLoading } = useRouteData(
    userPosition,
    destination,
    isRouteActive && Boolean(destination),
    routeProfile
  );
  const fallbackRouteGeometry = useMemo<MapPoint[] | null>(
    () => (userPosition && destination ? [userPosition, destination] : null),
    [destination, userPosition]
  );
  const routeGeometry = isRouteActive ? routeData?.geometry ?? fallbackRouteGeometry : null;
  const routeKey = falla ? `${falla.id}:${routeProfile}` : 'none';

  const distanceLabel = useMemo(
    () => (routeData ? formatDistance(routeData.distanceMeters) : null),
    [routeData]
  );
  const durationLabel = useMemo(
    () => (routeData ? formatDuration(routeData.durationSeconds) : null),
    [routeData]
  );
  const googleMapsUrl = useMemo(
    () => (destination ? buildGoogleMapsDirectionsUrl(destination, userPosition, routeProfile) : '#'),
    [destination, routeProfile, userPosition]
  );

  const {
    currentStep,
    currentStepLabel,
    isGuidanceActive,
    startGuidance,
    stopGuidance,
    toggleVoice,
    voiceEnabled,
    voiceSupported,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoPrevious,
    hasReachedDestination,
  } = useNavigationGuidance({
    routeSteps: routeData?.steps ?? [],
    userPosition,
    destination,
    isRouteActive,
    routeKey,
  });

  const visibleSteps = useMemo(
    () => (showDirections && currentStep ? [currentStep] : []),
    [currentStep, showDirections]
  );

  useEffect(() => {
    onGuidanceActiveChange?.(isGuidanceActive);
  }, [isGuidanceActive, onGuidanceActiveChange]);

  useEffect(() => () => {
    onGuidanceActiveChange?.(false);
  }, [onGuidanceActiveChange]);

  const statusCopy = useMemo(() => {
    if (!isRouteActive && locationStatus === 'ready') {
      return 'Ruta preparada. Pulsa iniciar para ver el recorrido.';
    }

    if (routeError) {
      return routeError;
    }

    if (isRouteLoading) {
      return routeProfile === 'driving' ? 'Calculando la mejor ruta en coche' : 'Calculando el mejor recorrido a pie';
    }

    if (distanceLabel && durationLabel) {
      return `${distanceLabel} | ${durationLabel}`;
    }

    if (locationStatus === 'ready') {
      return 'Tu posicion esta activa';
    }

    if (locationStatus === 'loading') {
      return 'Buscando tu posicion';
    }

    if (locationStatus === 'blocked') {
      return 'Activa el permiso de ubicacion';
    }

    return 'Ubicacion no disponible';
  }, [distanceLabel, durationLabel, isRouteActive, isRouteLoading, locationStatus, routeError, routeProfile]);

  useEffect(() => {
    if (!falla) {
      setAutoRequestedForId(null);
      return;
    }

    if (autoRequestedForId === falla.id || userPosition || locationStatus === 'blocked' || locationStatus === 'unsupported') {
      return;
    }

    setAutoRequestedForId(falla.id);
    void requestLocation().catch(() => {
      // The visible state already explains the failure.
    });
  }, [autoRequestedForId, falla, locationStatus, requestLocation, userPosition]);

  useEffect(() => {
    setShowDirections(true);
    setPendingGuidanceStart(false);
    setShowLocationHelp(false);
  }, [falla?.id]);

  useEffect(() => {
    if (userPosition || locationStatus === 'ready') {
      setShowLocationHelp(false);
    }
  }, [locationStatus, userPosition]);

  useEffect(() => {
    if (!pendingGuidanceStart) {
      return;
    }

    if (routeError) {
      setPendingGuidanceStart(false);
      return;
    }

    if (
      !isRouteActive
      || isRouteLoading
      || !routeData
      || routeData.geometry.length < 2
      || !routeRequestKey
      || routeDataKey !== routeRequestKey
    ) {
      return;
    }

    startGuidance();
    setFocusRouteToken((current) => current + 1);
    setPendingGuidanceStart(false);
  }, [isRouteActive, isRouteLoading, pendingGuidanceStart, routeData, routeDataKey, routeError, routeRequestKey, startGuidance]);

  const handleLocate = async () => {
    if (userPosition) {
      setFocusUserToken((current) => current + 1);
      return;
    }

    try {
      await requestLocation();
      setFocusUserToken((current) => current + 1);
    } catch {
      // The status card already reflects the problem.
    }
  };

  const ensureUserPosition = async () => {
    if (userPosition) {
      setShowLocationHelp(false);
      return true;
    }

    try {
      await requestLocation();
      setShowLocationHelp(false);
      return true;
    } catch {
      setShowLocationHelp(true);
      return false;
    }
  };

  const handleStartRoute = async () => {
    if (!destination || !falla) {
      return false;
    }

    const hasUserPosition = await ensureUserPosition();
    if (!hasUserPosition) {
      return false;
    }

    setActiveRouteFallaId(falla.id);
    setFocusRouteToken((current) => current + 1);
    return true;
  };

  const handleCancelRoute = () => {
    setPendingGuidanceStart(false);
    stopGuidance();
    setActiveRouteFallaId(null);
  };

  const handleStartGuidance = async () => {
    if (!falla) {
      return;
    }

    const hasUserPosition = await ensureUserPosition();
    if (!hasUserPosition) {
      return;
    }

    if (
      isRouteActive
      && !isRouteLoading
      && routeData
      && routeData.geometry.length >= 2
      && routeRequestKey
      && routeDataKey === routeRequestKey
    ) {
      startGuidance();
      setFocusRouteToken((current) => current + 1);
      return;
    }

    if (!isRouteActive) {
      const routeStarted = await handleStartRoute();
      if (!routeStarted) {
        return;
      }
    }

    setPendingGuidanceStart(true);
  };

  const handleChangeRouteProfile = (nextProfile: RouteProfile) => {
    if (nextProfile === routeProfile) {
      return;
    }

    setPendingGuidanceStart(false);
    stopGuidance();
    setRouteProfile(nextProfile);
  };
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

  return (
    <AnimatePresence>
      {falla && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[6500] pointer-events-none"
        >
          <button
            type="button"
            aria-label="Cerrar navegacion"
            onClick={onClose}
            className={cn(
              'pointer-events-auto absolute inset-0 transition-colors',
              variant === 'overlay'
                ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.18))] backdrop-blur-[3px]'
                : 'bg-transparent'
            )}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.24 }}
            className={cn(
              'pointer-events-auto absolute inset-4 overflow-hidden rounded-[2.75rem] border shadow-[0_34px_90px_rgba(15,23,42,0.22)] sm:inset-5 lg:inset-y-4 lg:left-auto',
              variant === 'overlay'
                ? 'lg:right-5 lg:w-[min(44vw,780px)] xl:right-6 xl:w-[min(42vw,760px)] 2xl:w-[min(40vw,740px)]'
                : 'lg:right-4 lg:w-[min(48vw,820px)]',
              isDarkMode
                ? 'border-white/10 bg-[linear-gradient(180deg,#0d1117_0%,#111827_100%)]'
                : 'border-white/70 bg-[linear-gradient(180deg,#fffaf7_0%,#f4eee6_100%)]'
            )}
          >
            <MapContainer
              center={defaultCenter}
              zoom={14}
              zoomControl={false}
              scrollWheelZoom={true}
              preferCanvas={true}
              fadeAnimation={false}
              zoomAnimation={false}
              markerZoomAnimation={false}
              wheelDebounceTime={80}
              wheelPxPerZoomLevel={80}
              inertia={true}
              className="h-full w-full"
            >
              {/* Map performance: load tiles after panning, but avoid aggressive redraws while zooming. */}
              <TileLayer
                attribution={activeTheme.attribution}
                url={activeTheme.url}
                maxZoom={activeTheme.maxZoom ?? 20}
                keepBuffer={6}
                updateWhenIdle={false}
                updateWhenZooming={false}
                updateInterval={180}
                detectRetina={false}
              />
              <ZoomControl position="topright" />
              {destination && <Marker position={destination} icon={FALLA_ICON} />}
              {userPosition && <Marker position={userPosition} icon={USER_ICON} />}
              <RoutePolylineLayer geometry={routeGeometry} profile={routeProfile} variant={isGuidanceActive ? 'guided' : 'default'} />
              <NavigationViewport
                routeGeometry={routeGeometry}
                destination={destination}
                userPosition={userPosition}
                focusUserToken={focusUserToken}
                focusRouteToken={focusRouteToken}
                guidanceMode={isGuidanceActive}
                mode="modal"
              />
            </MapContainer>

            <div className="pointer-events-none absolute inset-0">
              {isGuidanceActive && (
                <NavigationGuidanceOverlay
                  currentStep={currentStep}
                  currentStepLabel={currentStepLabel}
                  distanceLabel={distanceLabel}
                  durationLabel={durationLabel}
                  durationSeconds={routeData?.durationSeconds ?? null}
                  destinationName={falla.name}
                  destinationArea={falla.neighborhood}
                  destinationLogoUrl={falla.logoUrl}
                  routeProfile={routeProfile}
                  hasReachedDestination={hasReachedDestination}
                  voiceEnabled={voiceEnabled}
                  voiceSupported={voiceSupported}
                  canGoPrevious={canGoPrevious}
                  canGoNext={canGoNext}
                  onLocate={() => void handleLocate()}
                  onFocusRoute={() => setFocusRouteToken((current) => current + 1)}
                  onChangeProfile={handleChangeRouteProfile}
                  onToggleVoice={toggleVoice}
                  onPreviousStep={goToPreviousStep}
                  onNextStep={goToNextStep}
                  onStopGuidance={stopGuidance}
                  onClose={onClose}
                />
              )}

              <div
                className={cn(
                  'absolute inset-0',
                  isGuidanceActive && 'hidden',
                  isDarkTheme
                    ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,99,33,0.08),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0)_26%,rgba(2,6,23,0.12)_100%)]'
                    : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,99,33,0.10),transparent_28%),linear-gradient(180deg,rgba(255,248,238,0.30),rgba(255,248,238,0.06)_26%,rgba(255,255,255,0.24)_100%)]'
                )}
              />

              <div
                className={cn(
                  'pointer-events-auto absolute inset-x-4 top-4 flex flex-col gap-3 sm:inset-x-5 sm:top-5',
                  isGuidanceActive && 'hidden'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <RouteThemeSwitcher value={mapStyleId} onChange={setMapStyleId} isDarkTheme={isDarkTheme} />
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleLocate()}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/55 bg-white/92 text-sky-600 shadow-xl backdrop-blur-xl transition-colors hover:bg-sky-50"
                    >
                      <LocateFixed className="h-5 w-5" />
                    </button>
                    {routeGeometry && (
                      <button
                        type="button"
                        onClick={() => setFocusRouteToken((current) => current + 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/55 bg-white/92 text-brand shadow-xl backdrop-blur-xl transition-colors hover:bg-orange-50"
                      >
                        <Route className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/55 bg-white/92 text-slate-600 shadow-xl backdrop-blur-xl transition-colors hover:bg-slate-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div
                  className={cn(
                    'max-w-[520px] rounded-[1.9rem] border px-4 py-4 shadow-[0_22px_48px_rgba(15,23,42,0.16)] backdrop-blur-2xl',
                    isDarkTheme ? 'border-white/10 bg-slate-950/78 text-white' : 'border-white/70 bg-white/92 text-slate-950'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                            isDarkTheme ? 'bg-white/10 text-white/82' : 'bg-[#fff2e8] text-brand'
                          )}
                        >
                          {routeProfile === 'driving' ? <CarFront className="h-3.5 w-3.5" /> : <Footprints className="h-3.5 w-3.5" />}
                          {routeProfile === 'driving' ? 'En coche' : 'A pie'}
                        </span>
                        {durationLabel && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                              isDarkTheme ? 'bg-white/10 text-white/82' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                            {durationLabel}
                          </span>
                        )}
                        {distanceLabel && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                              isDarkTheme ? 'bg-white/10 text-white/82' : 'bg-sky-100 text-sky-700'
                            )}
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            {distanceLabel}
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                            isRouteActive
                              ? 'bg-emerald-500 text-white'
                              : isDarkTheme
                                ? 'bg-white/10 text-white/82'
                                : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {isRouteActive ? 'Ruta activa' : 'Ruta en pausa'}
                        </span>
                      </div>

                      <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', isDarkTheme ? 'text-white/55' : 'text-slate-400')}>
                        Navegacion Fallera
                      </p>
                      <div className="mt-3">
                        <RouteProfileToggle
                          value={routeProfile}
                          onChange={handleChangeRouteProfile}
                          isDarkTheme={isDarkTheme}
                        />
                      </div>
                      <h3 className="mt-2 max-w-[240px] text-[1.26rem] font-black leading-[1.08] tracking-tight text-balance sm:max-w-[300px] sm:text-[1.34rem]">
                        {falla.name}
                      </h3>
                      <p className={cn('mt-2 max-w-[260px] text-[13px] font-bold leading-[1.4] sm:max-w-[320px]', isDarkTheme ? 'text-white/78' : 'text-slate-600')}>
                        {statusCopy}
                      </p>
                    </div>

                    <div
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border p-2',
                        isDarkTheme ? 'border-white/10 bg-white/8 text-brand' : 'border-orange-100 bg-[#fff6ee] text-brand'
                      )}
                    >
                      {falla.logoUrl ? (
                        <img
                          src={falla.logoUrl}
                          alt={`Logo de ${falla.name}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <MapPinned className="h-6 w-6" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'pointer-events-auto absolute inset-x-4 bottom-4 grid gap-3 sm:inset-x-5 lg:grid-cols-[minmax(0,1fr)_220px]',
                  isGuidanceActive && 'hidden'
                )}
              >
                <div
                  className={cn(
                    'rounded-[2rem] border px-4 py-4 shadow-[0_26px_54px_rgba(15,23,42,0.16)] backdrop-blur-2xl',
                    isDarkTheme ? 'border-white/10 bg-slate-950/80 text-white' : 'border-white/70 bg-white/94 text-slate-950'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
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
                        <p className={cn('text-sm font-bold', isDarkTheme ? 'text-white/70' : 'text-slate-500')}>
                          {hasReachedDestination
                            ? 'Has llegado a tu destino'
                            : currentStep
                              ? 'Vista previa de la siguiente maniobra'
                              : 'Preparando indicaciones'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDirections((current) => !current)}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                        isDarkTheme ? 'border-white/10 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {showDirections ? <X className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
                    </button>
                  </div>

                  {showDirections ? (
                    visibleSteps.length > 0 ? (
                      visibleSteps.map((step, index) => (
                        <div
                          key={`${step.instruction}-${index}`}
                          className={cn(
                            'rounded-[1.35rem] border px-3.5 py-3',
                            isDarkTheme ? 'border-white/10 bg-white/6' : 'border-slate-100 bg-[#fff8f1]'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-black text-white">
                              {currentStepLabel ?? index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={cn('text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-800')}>
                                {step.instruction}
                              </p>
                              <p className={cn('mt-1 text-[11px] font-bold uppercase tracking-[0.12em]', isDarkTheme ? 'text-white/42' : 'text-slate-400')}>
                                {formatDistance(step.distanceMeters)} | {formatDuration(step.durationSeconds)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className={cn(
                          'rounded-[1.35rem] border px-3.5 py-3 text-sm font-bold',
                          isDarkTheme ? 'border-white/10 bg-white/6 text-white/74' : 'border-slate-100 bg-[#fff8f1] text-slate-500'
                        )}
                      >
                        {routeError
                          ? routeError
                          : !isRouteActive
                            ? 'Pulsa iniciar ruta para mostrar las indicaciones dentro del mapa.'
                            : locationStatus === 'blocked'
                              ? 'Necesitas activar la ubicacion para ver la guia paso a paso.'
                              : isRouteLoading
                                ? 'Preparando el recorrido por calles...'
                                : 'No hay pasos disponibles todavia.'}
                      </div>
                    )
                  ) : null}

                  {showLocationHelp && (locationStatus === 'blocked' || locationStatus === 'unsupported') && (
                    <div
                      className={cn(
                        'mt-3 rounded-[1.35rem] border px-3.5 py-3 text-sm font-bold leading-6',
                        isDarkTheme ? 'border-orange-400/20 bg-orange-500/10 text-orange-100' : 'border-orange-200 bg-orange-50 text-orange-700'
                      )}
                    >
                      {locationStatus === 'blocked'
                        ? 'Para guiar dentro de la app debes permitir la ubicacion en el navegador. Pulsa el icono de ubicacion o el candado de la barra del navegador, permite el acceso y vuelve a pulsar el boton.'
                        : 'La guia interna necesita un navegador con geolocalizacion disponible.'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={isGuidanceActive ? stopGuidance : () => void handleStartGuidance()}
                    disabled={isPrimaryActionDisabled}
                    className={cn(
                      'col-span-2 rounded-[1.4rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-1',
                      isGuidanceActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand hover:bg-[#f45518]'
                    )}
                  >
                    {primaryActionLabel}
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={cn(
                      'rounded-[1.4rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors',
                      voiceEnabled
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : isDarkTheme
                          ? 'bg-white/10 text-white hover:bg-white/14'
                          : 'bg-white/92 text-slate-700 hover:bg-white'
                    )}
                  >
                    {voiceSupported ? (voiceEnabled ? 'Voz activa' : 'Voz guiada') : 'Sin voz'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelRoute}
                    className={cn(
                      'rounded-[1.4rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors',
                      isDarkTheme ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                    )}
                  >
                    Cancelar ruta
                  </button>

                  <button
                    type="button"
                    onClick={() => setFocusRouteToken((current) => current + 1)}
                    className={cn(
                      'rounded-[1.4rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors',
                      isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-white/92 text-slate-700 hover:bg-white'
                    )}
                  >
                    Ver ruta
                  </button>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'col-span-2 inline-flex items-center justify-center gap-2 rounded-[1.4rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_18px_34px_rgba(15,23,42,0.12)] transition-colors lg:col-span-1',
                      isDarkTheme ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-sky-600 text-white hover:bg-sky-700'
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir en Google Maps
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NavigationMapModal;
