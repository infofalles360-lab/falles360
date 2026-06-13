import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { type MapPoint, type RouteData } from '../utils/navigation';

export interface RouteWaypoint {
  lat: number;
  lng: number;
  nombre?: string;
}

type RoutingControl = L.Control & {
  setWaypoints: (waypoints: unknown[]) => void;
  route: () => void;
  on: (event: string, handler: (event: any) => void) => void;
  off: (event: string, handler: (event: any) => void) => void;
};

const ROUTING_MACHINE_JS_URL = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js';
let routingMachineLoadPromise: Promise<any> | null = null;

function getRoutingNamespace() {
  return (L as typeof L & { Routing?: any }).Routing;
}

function ensureRoutingMachine() {
  const existingNamespace = getRoutingNamespace();
  if (existingNamespace) {
    return Promise.resolve(existingNamespace);
  }

  if (routingMachineLoadPromise) {
    return routingMachineLoadPromise;
  }

  routingMachineLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Leaflet Routing Machine solo puede cargarse en navegador.'));
      return;
    }

    (window as any).L = L;

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${ROUTING_MACHINE_JS_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(getRoutingNamespace()));
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Leaflet Routing Machine.')));
      return;
    }

    const script = document.createElement('script');
    script.src = ROUTING_MACHINE_JS_URL;
    script.async = true;
    script.onload = () => {
      const namespace = getRoutingNamespace();
      if (namespace) {
        resolve(namespace);
        return;
      }

      reject(new Error('Leaflet Routing Machine no esta disponible despues de cargar el CDN.'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet Routing Machine.'));
    document.head.appendChild(script);
  });

  return routingMachineLoadPromise;
}

function isValidWaypoint(point: RouteWaypoint): boolean {
  return (
    typeof point?.lat === 'number'
    && Number.isFinite(point.lat)
    && typeof point?.lng === 'number'
    && Number.isFinite(point.lng)
  );
}

function buildRoutingWaypoints(routingNamespace: any, waypoints: RouteWaypoint[]) {
  return waypoints.map((point) => {
    const latLng = L.latLng(point.lat, point.lng);
    const name = point.nombre?.trim() || '';

    if (typeof routingNamespace?.waypoint === 'function') {
      return routingNamespace.waypoint(latLng, name);
    }

    return Object.assign(latLng, { name });
  });
}

function buildRouteMarkerIcon(index: number, total: number) {
  const isStart = index === 0;
  const isEnd = index === total - 1;
  const markerClass = isStart
    ? 'f360-route-marker f360-route-marker--start'
    : isEnd
      ? 'f360-route-marker f360-route-marker--end'
      : 'f360-route-marker f360-route-marker--stop';
  const label = isStart ? '●' : isEnd ? 'F' : String(index);

  return L.divIcon({
    className: 'f360-route-marker-wrapper',
    html: `<span class="${markerClass}"><span>${label}</span></span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
  });
}

function buildRouteData(route: any): RouteData {
  const coordinates = Array.isArray(route?.coordinates)
    ? route.coordinates.map((point: L.LatLng) => [point.lat, point.lng] as MapPoint)
    : [];

  const steps = Array.isArray(route?.instructions)
    ? route.instructions.map((instruction: any) => ({
        instruction: instruction.text || 'Sigue la ruta indicada.',
        distanceMeters: Number(instruction.distance) || 0,
        durationSeconds: Number(instruction.time) || 0,
        streetName: instruction.road || '',
        location: instruction.latLng
          ? [Number(instruction.latLng.lat), Number(instruction.latLng.lng)] as MapPoint
          : null,
      }))
    : [];

  return {
    geometry: coordinates,
    distanceMeters: Number(route?.summary?.totalDistance) || 0,
    durationSeconds: Number(route?.summary?.totalTime) || 0,
    steps,
  };
}

interface RoutingMachineLayerProps {
  waypoints: RouteWaypoint[] | null;
  fitSelectedRoutes?: boolean;
  onRouteStart?: () => void;
  onRouteReady?: (route: RouteData) => void;
  onRouteError?: (message: string) => void;
  routeWhileDragging?: boolean;
  showInstructions?: boolean;
}

export function RoutingMachineLayer({
  waypoints,
  fitSelectedRoutes = true,
  onRouteStart,
  onRouteReady,
  onRouteError,
  routeWhileDragging = true,
  showInstructions = false,
}: RoutingMachineLayerProps) {
  const map = useMap();
  const controlRef = useRef<RoutingControl | null>(null);
  const handlersRef = useRef<{
    routesFound: (event: any) => void;
    routingError: (event: any) => void;
  } | null>(null);
  const callbacksRef = useRef({
    onRouteError,
    onRouteReady,
    onRouteStart,
  });
  const waypointsKey = waypoints
    ?.map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)},${point.nombre ?? ''}`)
    .join('|') ?? '';

  useEffect(() => {
    callbacksRef.current = {
      onRouteError,
      onRouteReady,
      onRouteStart,
    };
  }, [onRouteError, onRouteReady, onRouteStart]);

  useEffect(() => {
    let cancelled = false;
    const validWaypoints = (waypoints ?? []).filter(isValidWaypoint);

    if (validWaypoints.length < 2) {
      if (controlRef.current) {
        if (handlersRef.current) {
          controlRef.current.off('routesfound', handlersRef.current.routesFound);
          controlRef.current.off('routingerror', handlersRef.current.routingError);
          handlersRef.current = null;
        }
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
      return;
    }

    const handleRoutesFound = (event: any) => {
      if (cancelled) {
        return;
      }

      const route = event?.routes?.[0];

      if (!route) {
        callbacksRef.current.onRouteError?.('No se ha encontrado una ruta valida.');
        return;
      }

      callbacksRef.current.onRouteReady?.(buildRouteData(route));
    };

    const handleRoutingError = (event: any) => {
      if (cancelled) {
        return;
      }

      const message =
        event?.error?.message
        || event?.message
        || 'No se ha podido calcular la ruta por calles.';

      callbacksRef.current.onRouteError?.(message);
    };

    callbacksRef.current.onRouteStart?.();

    void ensureRoutingMachine()
      .then((routingNamespace) => {
        if (cancelled) {
          return;
        }

        if (!routingNamespace) {
          callbacksRef.current.onRouteError?.('Leaflet Routing Machine no esta disponible.');
          return;
        }

        const routingWaypoints = buildRoutingWaypoints(routingNamespace, validWaypoints);

        if (!controlRef.current) {
          handlersRef.current = {
            routesFound: handleRoutesFound,
            routingError: handleRoutingError,
          };

          controlRef.current = routingNamespace.control({
            waypoints: routingWaypoints,
            router: routingNamespace.osrmv1({
              serviceUrl: 'https://router.project-osrm.org/route/v1',
              profile: 'foot',
            }),
            language: 'es',
            routeWhileDragging,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes,
            showAlternatives: true,
            show: showInstructions,
            collapsible: true,
            createMarker: () => false,
            lineOptions: {
              styles: [
                { color: '#7c3aed', weight: 0, opacity: 0 },
              ],
              extendToWaypoints: true,
              missingRouteTolerance: 0,
            },
          }).addTo(map) as RoutingControl;

          controlRef.current.on('routesfound', handleRoutesFound);
          controlRef.current.on('routingerror', handleRoutingError);
          return;
        }

        controlRef.current.setWaypoints(routingWaypoints);
        controlRef.current.route();
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          callbacksRef.current.onRouteError?.(error instanceof Error ? error.message : 'No se pudo cargar el motor de rutas.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fitSelectedRoutes, map, routeWhileDragging, showInstructions, waypointsKey]);

  useEffect(() => () => {
    if (!controlRef.current) {
      return;
    }

    if (handlersRef.current) {
      controlRef.current.off('routesfound', handlersRef.current.routesFound);
      controlRef.current.off('routingerror', handlersRef.current.routingError);
      handlersRef.current = null;
    }

    map.removeControl(controlRef.current);
    controlRef.current = null;
  }, [map]);

  return null;
}
