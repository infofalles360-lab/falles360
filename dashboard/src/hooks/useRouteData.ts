import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRouteCacheKey, fetchCachedRoute, fetchRoute, getCachedRoute, type MapPoint, type RouteData, type RouteProfile } from '../utils/navigation';

const ROUTE_DEBOUNCE_MS = 800;

export function useRouteData(
  origin: MapPoint | null,
  destination: MapPoint | null,
  enabled = true,
  profile: RouteProfile = 'walking'
) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeDataKey, setRouteDataKey] = useState<string | null>(null);
  const previousRouteRef = useRef<{ destinationKey: string; profile: RouteProfile } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originKey = origin ? `${origin[0].toFixed(4)},${origin[1].toFixed(4)}` : '';
  const destinationKey = destination ? `${destination[0].toFixed(4)},${destination[1].toFixed(4)}` : '';
  const normalizedOrigin = useMemo<MapPoint | null>(() => {
    if (!origin) {
      return null;
    }

    return [Number(origin[0].toFixed(4)), Number(origin[1].toFixed(4))];
  }, [originKey]);
  const normalizedDestination = useMemo<MapPoint | null>(() => {
    if (!destination) {
      return null;
    }

    return [Number(destination[0].toFixed(4)), Number(destination[1].toFixed(4))];
  }, [destinationKey]);
  const routeRequestKey = enabled && normalizedOrigin && normalizedDestination
    ? buildRouteCacheKey([normalizedOrigin, normalizedDestination], profile)
    : null;

  useEffect(() => {
    if (!enabled || !normalizedOrigin || !normalizedDestination) {
      previousRouteRef.current = null;
      setRouteData(null);
      setRouteDataKey(null);
      setRouteError(null);
      setIsRouteLoading(false);
      return;
    }

    const destOrProfileChanged =
      previousRouteRef.current?.destinationKey !== destinationKey
      || previousRouteRef.current?.profile !== profile;

    previousRouteRef.current = { destinationKey, profile };

    let cancelled = false;
    const cachedRoute = getCachedRoute(routeRequestKey);

    if (cachedRoute && routeRequestKey) {
      setRouteData(cachedRoute);
      setRouteDataKey(routeRequestKey);
      setRouteError(null);
      setIsRouteLoading(false);
      return;
    }

    if (destOrProfileChanged) {
      setRouteData(null);
      setRouteDataKey(null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const loadRoute = async () => {
      setIsRouteLoading(true);
      setRouteError(null);

      try {
        const nextRoute = await fetchCachedRoute(
          routeRequestKey!,
          () => fetchRoute(normalizedOrigin, normalizedDestination, profile)
        );

        if (!cancelled) {
          setRouteData(nextRoute);
          setRouteDataKey(routeRequestKey);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo calcular la ruta por calles.', error);
          setRouteData(null);
          setRouteDataKey(null);
          setRouteError('No se ha podido calcular la ruta. Intentalo de nuevo.');
        }
      } finally {
        if (!cancelled) {
          setIsRouteLoading(false);
        }
      }
    };

    debounceTimerRef.current = setTimeout(() => {
      void loadRoute();
    }, destOrProfileChanged ? 0 : ROUTE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [destinationKey, enabled, normalizedDestination, normalizedOrigin, originKey, profile, routeRequestKey]);

  return {
    routeData,
    routeDataKey,
    routeRequestKey,
    routeError,
    isRouteLoading,
  };
}
