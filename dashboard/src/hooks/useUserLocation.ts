import { useCallback, useEffect, useRef, useState } from 'react';
import { distanceBetweenPoints, type MapPoint } from '../utils/navigation';

export type LocationStatus = 'idle' | 'loading' | 'ready' | 'blocked' | 'unsupported';

const MIN_POSITION_DELTA_METERS = 6;
const LOCATION_UPDATE_INTERVAL_MS = 800;

export function useUserLocation() {
  const [userPosition, setUserPosition] = useState<MapPoint | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [watchPositionId, setWatchPositionId] = useState<number | null>(null);
  const lastPositionRef = useRef<MapPoint | null>(null);
  const lastLocationUpdateRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const pendingWatchResolversRef = useRef<Array<(position: MapPoint) => void>>([]);
  const pendingWatchRejectersRef = useRef<Array<(error: Error) => void>>([]);

  const commitPosition = useCallback((nextPosition: MapPoint): MapPoint => {
    const lastPosition = lastPositionRef.current;
    const now = Date.now();
    const hasMeaningfulMovement = !lastPosition || distanceBetweenPoints(lastPosition, nextPosition) >= MIN_POSITION_DELTA_METERS;
    const canUpdateLocation = !lastPosition || now - lastLocationUpdateRef.current >= LOCATION_UPDATE_INTERVAL_MS;

    // Map performance: throttle GPS commits so watchPosition cannot force a React/Leaflet redraw on every browser sample.
    if (hasMeaningfulMovement && canUpdateLocation) {
      lastPositionRef.current = nextPosition;
      lastLocationUpdateRef.current = now;
      setUserPosition(nextPosition);
    }

    setLocationStatus((currentStatus) => (currentStatus === 'ready' ? currentStatus : 'ready'));
    return nextPosition;
  }, []);

  const rejectPendingWatchRequests = useCallback((error: Error) => {
    const rejecters = pendingWatchRejectersRef.current.splice(0);
    pendingWatchResolversRef.current.splice(0);
    rejecters.forEach((reject) => reject(error));
  }, []);

  const stopLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = null;
    setWatchPositionId(null);
    rejectPendingWatchRequests(new Error('Seguimiento de ubicacion detenido.'));
  }, [rejectPendingWatchRequests]);

  const startLocationWatch = useCallback(() =>
    new Promise<MapPoint>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setLocationStatus('unsupported');
        reject(new Error('Geolocalizacion no disponible.'));
        return;
      }

      if (lastPositionRef.current) {
        resolve(lastPositionRef.current);
      } else {
        pendingWatchResolversRef.current.push(resolve);
        pendingWatchRejectersRef.current.push(reject);
      }

      if (watchIdRef.current !== null) {
        setLocationStatus((currentStatus) => (currentStatus === 'ready' ? currentStatus : 'loading'));
        return;
      }

      setLocationStatus('loading');
      const watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const nextPosition = commitPosition([coords.latitude, coords.longitude]);
          const resolvers = pendingWatchResolversRef.current.splice(0);
          pendingWatchRejectersRef.current.splice(0);
          resolvers.forEach((pendingResolve) => pendingResolve(nextPosition));
        },
        () => {
          setLocationStatus('blocked');
          stopLocationWatch();
          rejectPendingWatchRequests(new Error('Permiso de ubicacion denegado.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );

      watchIdRef.current = watchId;
      setWatchPositionId(watchId);
    }), [commitPosition, rejectPendingWatchRequests, stopLocationWatch]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
    }

    return () => {
      stopLocationWatch();
    };
  }, [stopLocationWatch]);

  const requestLocation = useCallback(() =>
    new Promise<MapPoint>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setLocationStatus('unsupported');
        reject(new Error('Geolocalizacion no disponible.'));
        return;
      }

      setLocationStatus('loading');

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          resolve(commitPosition([coords.latitude, coords.longitude]));
        },
        () => {
          setLocationStatus('blocked');
          reject(new Error('Permiso de ubicacion denegado.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }), [commitPosition]);

  return {
    userPosition,
    locationStatus,
    requestLocation,
    startLocationWatch,
    stopLocationWatch,
    watchPositionId,
  };
}
