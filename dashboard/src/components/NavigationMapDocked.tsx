import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  CarFront,
  ChevronDown,
  ChevronUp,
  Clock3,
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
import { type LocationStatus } from '../hooks/useUserLocation';
import { useNavigationGuidance } from '../hooks/useNavigationGuidance';
import { useRouteData } from '../hooks/useRouteData';
import { safeFitBounds, safeFlyTo, safeInvalidate, safeSetView } from '../utils/mapSafe';
import { getFitBoundsOptions, getGuidanceViewport } from '../utils/mapViewport';
import { MAP_THEMES, getMapTheme, type MapStyleId } from '../utils/mapThemes';
import { buildGoogleMapsDirectionsUrl, formatDistance, formatDuration, type MapPoint, type RouteProfile } from '../utils/navigation';
import { NavigationDirectionsPanel } from './NavigationDirectionsPanel';
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

interface NavigationMapDockedProps {
  falla: Falla;
  isDarkMode: boolean;
  mapStyleId: MapStyleId;
  setMapStyleId: (value: MapStyleId) => void;
  activeRouteFallaId: string | null;
  setActiveRouteFallaId: (value: string | null) => void;
  userPosition: MapPoint | null;
  locationStatus: LocationStatus;
  requestLocation: () => Promise<MapPoint>;
  onClose: () => void;
}

export function NavigationMapDocked({
  falla,
  isDarkMode,
  mapStyleId,
  setMapStyleId,
  activeRouteFallaId,
  setActiveRouteFallaId,
  userPosition,
  locationStatus,
  requestLocation,
  onClose,
}: NavigationMapDockedProps) {
  const [focusUserToken, setFocusUserToken] = useState(0);
  const [focusRouteToken, setFocusRouteToken] = useState(0);
  const [autoRequestedForId, setAutoRequestedForId] = useState<string | null>(null);
  const [pendingGuidanceStart, setPendingGuidanceStart] = useState(false);
  const [showWidgets, setShowWidgets] = useState(true);
  const [showDirections, setShowDirections] = useState(true);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('walking');
  const destination = [falla.lat, falla.lng] as MapPoint;
  const isRouteActive = activeRouteFallaId === falla.id;
  const activeTheme = useMemo(() => getMapTheme(mapStyleId), [mapStyleId]);
  const isDarkTheme = isDarkMode || activeTheme.id === 'night' || activeTheme.id === 'satellite';
  const { routeData, routeDataKey, routeError, routeRequestKey, isRouteLoading } = useRouteData(
    userPosition,
    destination,
    isRouteActive,
    routeProfile
  );
  const fallbackRouteGeometry = useMemo<MapPoint[] | null>(
    () => (userPosition ? [userPosition, destination] : null),
    [destination, userPosition]
  );
  const routeGeometry = isRouteActive ? routeData?.geometry ?? fallbackRouteGeometry : null;
  const routeKey = `${falla.id}:${routeProfile}`;

  const distanceLabel = useMemo(() => (routeData ? formatDistance(routeData.distanceMeters) : null), [routeData]);
  const durationLabel = useMemo(() => (routeData ? formatDuration(routeData.durationSeconds) : null), [routeData]);
  const googleMapsUrl = useMemo(
    () => buildGoogleMapsDirectionsUrl(destination, userPosition, routeProfile),
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

  const statusCopy = useMemo(() => {
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
  }, [distanceLabel, durationLabel, isRouteLoading, locationStatus, routeError, routeProfile]);

  useEffect(() => {
    if (autoRequestedForId === falla.id || userPosition || locationStatus === 'blocked' || locationStatus === 'unsupported') {
      return;
    }

    setAutoRequestedForId(falla.id);
    void requestLocation().catch(() => {
      // The visible state already explains the failure.
    });
  }, [autoRequestedForId, falla.id, locationStatus, requestLocation, userPosition]);

  useEffect(() => {
    setShowWidgets(true);
    setShowDirections(true);
    setPendingGuidanceStart(false);
    setShowLocationHelp(false);
  }, [falla.id]);

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

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.24 }}
      className={cn(
        'relative h-[min(980px,calc(100vh-4rem))] min-h-[760px] overflow-hidden rounded-[2.75rem] border shadow-[0_34px_90px_rgba(15,23,42,0.22)]',
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
        className="z-0 h-full w-full"
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
        <Marker position={destination} icon={FALLA_ICON} />
        {userPosition && <Marker position={userPosition} icon={USER_ICON} />}
        <RoutePolylineLayer geometry={routeGeometry} profile={routeProfile} variant={isGuidanceActive ? 'guided' : 'default'} />
        <NavigationViewport
          routeGeometry={routeGeometry}
          destination={destination}
          userPosition={userPosition}
          focusUserToken={focusUserToken}
          focusRouteToken={focusRouteToken}
          guidanceMode={isGuidanceActive}
          mode="docked"
        />
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[1000]">
        {isGuidanceActive ? (
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
        ) : (
          <>
            <div
              className={cn(
                'absolute inset-0',
                isDarkTheme
                  ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,99,33,0.08),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0)_26%,rgba(2,6,23,0.12)_100%)]'
                  : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,99,33,0.10),transparent_28%),linear-gradient(180deg,rgba(255,248,238,0.30),rgba(255,248,238,0.06)_26%,rgba(255,255,255,0.24)_100%)]'
              )}
            />

            <div className="pointer-events-auto absolute inset-x-4 top-4 flex flex-col gap-3 sm:inset-x-5 sm:top-5">
              <div className={cn('flex items-start gap-3', showWidgets ? 'justify-between' : 'justify-end')}>
                {showWidgets && (
                  <div className="min-w-0 flex-1">
                    <RouteThemeSwitcher value={mapStyleId} onChange={setMapStyleId} isDarkTheme={isDarkTheme} />
                  </div>
                )}

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWidgets((current) => !current)}
                    className={cn(
                      'inline-flex h-12 items-center gap-2 rounded-2xl border px-4 text-[10px] font-black uppercase tracking-[0.16em] shadow-xl backdrop-blur-xl transition-colors',
                      isDarkTheme
                        ? 'border-white/15 bg-slate-950/78 text-white hover:bg-slate-900/88'
                        : 'border-white/55 bg-white/92 text-slate-700 hover:bg-white'
                    )}
                  >
                    {showWidgets ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    {showWidgets ? 'Ocultar widgets' : 'Mostrar widgets'}
                  </button>

                  {showWidgets && (
                    <button
                      type="button"
                      onClick={() => void handleLocate()}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/55 bg-white/92 text-sky-600 shadow-xl backdrop-blur-xl transition-colors hover:bg-sky-50"
                    >
                      <LocateFixed className="h-5 w-5" />
                    </button>
                  )}

                  {showWidgets && routeGeometry && (
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

              {showWidgets && (
                <div
                  className={cn(
                    'max-w-[580px] rounded-[1.9rem] border px-4 py-4 shadow-[0_22px_48px_rgba(15,23,42,0.16)] backdrop-blur-2xl',
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
                      <h3 className="mt-2 max-w-[340px] text-[1.4rem] font-black leading-[1.08] tracking-tight text-balance">
                        {falla.name}
                      </h3>
                      <p className={cn('mt-2 max-w-[340px] text-[13px] font-bold leading-[1.4]', isDarkTheme ? 'text-white/78' : 'text-slate-600')}>
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
              )}
            </div>

            {showWidgets && (
              <NavigationDirectionsPanel
                isDarkTheme={isDarkTheme}
                showDirections={showDirections}
                onToggleDirections={() => setShowDirections((current) => !current)}
                currentStep={currentStep}
                currentStepLabel={currentStepLabel}
                routeProfile={routeProfile}
                routeError={routeError}
                locationStatus={locationStatus}
                isRouteLoading={isRouteLoading}
                isRouteActive={isRouteActive}
                isGuidanceActive={isGuidanceActive}
                hasReachedDestination={hasReachedDestination}
                voiceEnabled={voiceEnabled}
                voiceSupported={voiceSupported}
                onStartGuidance={() => void handleStartGuidance()}
                onStopGuidance={stopGuidance}
                onChangeProfile={handleChangeRouteProfile}
                onCancelRoute={handleCancelRoute}
                onFocusRoute={() => setFocusRouteToken((current) => current + 1)}
                onToggleVoice={toggleVoice}
                onPreviousStep={goToPreviousStep}
                onNextStep={goToNextStep}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
                googleMapsUrl={googleMapsUrl}
                locationHelpVisible={showLocationHelp}
              />
            )}
          </>
        )}
      </div>
    </motion.aside>
  );
}
