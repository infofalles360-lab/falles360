export type MapPoint = [number, number];
export type RouteProfile = 'walking' | 'driving';

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName: string;
  location?: MapPoint | null;
}

export interface RouteData {
  geometry: MapPoint[];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

const ROUTE_REQUEST_TIMEOUT_MS = 12000;
const ROUTE_ENDPOINT_TOLERANCE_METERS = 8;
const WALKING_SPEED_METERS_PER_SECOND = 1.35;
const ROUTE_CACHE_MAX_ENTRIES = 64;
const ROUTE_CACHE_STORAGE_KEY = 'falles360_route_cache';
const ROUTE_CACHE_STORAGE_MAX_ENTRIES = 16;
const routeCache = new Map<string, RouteData>();
const routeRequestCache = new Map<string, Promise<RouteData>>();

function loadRouteCacheFromStorage(): void {
  try {
    const raw = localStorage.getItem(ROUTE_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === 'string' && value && typeof value === 'object' && Array.isArray((value as any).geometry)) {
        routeCache.set(key, value as RouteData);
      }
    }
  } catch {
    localStorage.removeItem(ROUTE_CACHE_STORAGE_KEY);
  }
}

function persistRouteCacheToStorage(): void {
  try {
    const entries: Record<string, RouteData> = {};
    let count = 0;
    for (const [key, value] of routeCache) {
      entries[key] = value;
      count += 1;
      if (count >= ROUTE_CACHE_STORAGE_MAX_ENTRIES) break;
    }
    localStorage.setItem(ROUTE_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Cuota excedida o localStorage no disponible
  }
}

loadRouteCacheFromStorage();

function isMapPoint(value: unknown): value is MapPoint {
  return (
    Array.isArray(value)
    && value.length === 2
    && value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  );
}

function snapToRoad(point: MapPoint): MapPoint {
  // Lógica ficticia: Ajusta el punto al camino más cercano
  return point; // TODO: Reemplazar esto con lógica real
}

export function distanceBetweenPoints(origin: MapPoint, destination: MapPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const [originLat, originLng] = origin;
  const [destinationLat, destinationLng] = destination;
  const deltaLat = toRadians(destinationLat - originLat);
  const deltaLng = toRadians(destinationLng - originLng);
  const normalizedOriginLat = toRadians(originLat);
  const normalizedDestinationLat = toRadians(destinationLat);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.cos(normalizedOriginLat) * Math.cos(normalizedDestinationLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function projectPointToSegment(point: MapPoint, segmentStart: MapPoint, segmentEnd: MapPoint): {
  point: MapPoint;
  ratio: number;
} {
  const averageLat = ((segmentStart[0] + segmentEnd[0]) / 2) * (Math.PI / 180);
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(1, Math.cos(averageLat) * 111_320);
  const pointX = point[1] * metersPerDegreeLng;
  const pointY = point[0] * metersPerDegreeLat;
  const startX = segmentStart[1] * metersPerDegreeLng;
  const startY = segmentStart[0] * metersPerDegreeLat;
  const endX = segmentEnd[1] * metersPerDegreeLng;
  const endY = segmentEnd[0] * metersPerDegreeLat;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  const ratio = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (((pointX - startX) * segmentX) + ((pointY - startY) * segmentY)) / segmentLengthSquared));

  return {
    ratio,
    point: [
      segmentStart[0] + ((segmentEnd[0] - segmentStart[0]) * ratio),
      segmentStart[1] + ((segmentEnd[1] - segmentStart[1]) * ratio),
    ],
  };
}

export function distanceToRouteMeters(point: MapPoint, geometry: MapPoint[] | null | undefined): number | null {
  if (!geometry || geometry.length < 2) {
    return null;
  }

  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < geometry.length - 1; index += 1) {
    const projection = projectPointToSegment(point, geometry[index], geometry[index + 1]);
    closestDistance = Math.min(closestDistance, distanceBetweenPoints(point, projection.point));
  }

  return Number.isFinite(closestDistance) ? closestDistance : null;
}

export function remainingRouteDistanceMeters(point: MapPoint, geometry: MapPoint[] | null | undefined, destination?: MapPoint | null): number | null {
  if (!geometry || geometry.length < 2) {
    return destination ? distanceBetweenPoints(point, destination) : null;
  }

  let closestProjection: { point: MapPoint; segmentIndex: number } | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < geometry.length - 1; index += 1) {
    const projection = projectPointToSegment(point, geometry[index], geometry[index + 1]);
    const distance = distanceBetweenPoints(point, projection.point);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestProjection = {
        point: projection.point,
        segmentIndex: index,
      };
    }
  }

  if (!closestProjection) {
    return destination ? distanceBetweenPoints(point, destination) : null;
  }

  let remainingDistance = distanceBetweenPoints(closestProjection.point, geometry[closestProjection.segmentIndex + 1]);

  for (let index = closestProjection.segmentIndex + 1; index < geometry.length - 1; index += 1) {
    remainingDistance += distanceBetweenPoints(geometry[index], geometry[index + 1]);
  }

  if (destination) {
    const lastPoint = geometry[geometry.length - 1];
    const endpointGap = distanceBetweenPoints(lastPoint, destination);
    if (endpointGap > ROUTE_ENDPOINT_TOLERANCE_METERS) {
      remainingDistance += endpointGap;
    }
  }

  return remainingDistance;
}

export function estimateWalkingDurationSeconds(distanceMeters: number | null): number | null {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return null;
  }

  return Math.max(60, distanceMeters / WALKING_SPEED_METERS_PER_SECOND);
}

function withVisibleRouteEndpoints(geometry: MapPoint[], origin: MapPoint, destination: MapPoint): MapPoint[] {
  if (geometry.length < 2) {
    return geometry;
  }

  const nextGeometry = [...geometry];
  const firstPoint = nextGeometry[0];
  const lastPoint = nextGeometry[nextGeometry.length - 1];

  if (distanceBetweenPoints(origin, firstPoint) > ROUTE_ENDPOINT_TOLERANCE_METERS) {
    nextGeometry.unshift(origin);
  }

  if (distanceBetweenPoints(lastPoint, destination) > ROUTE_ENDPOINT_TOLERANCE_METERS) {
    nextGeometry.push(destination);
  }

  return nextGeometry;
}

function formatStreetName(step: any): string {
  if (typeof step?.name === 'string' && step.name.trim().length > 0) {
    return step.name.trim();
  }

  if (typeof step?.ref === 'string' && step.ref.trim().length > 0) {
    return step.ref.trim();
  }

  return 'la via indicada';
}

function buildRouteInstruction(step: any): string {
  const streetName = formatStreetName(step);
  const maneuver = step?.maneuver ?? {};
  const modifier = typeof maneuver.modifier === 'string' ? maneuver.modifier : '';
  const type = typeof maneuver.type === 'string' ? maneuver.type : '';

  if (type === 'depart') {
    return `Sal de tu posicion y avanza por ${streetName}.`;
  }

  if (type === 'arrive') {
    return 'Has llegado a tu destino.';
  }

  if (type === 'roundabout' || type === 'rotary') {
    return `En la rotonda, sigue las indicaciones hacia ${streetName}.`;
  }

  if (type === 'continue' || type === 'new name') {
    return `Continua por ${streetName}.`;
  }

  if (type === 'fork') {
    if (modifier === 'left') {
      return `Mantente a la izquierda hacia ${streetName}.`;
    }

    if (modifier === 'right') {
      return `Mantente a la derecha hacia ${streetName}.`;
    }

    return `Sigue el desvio hacia ${streetName}.`;
  }

  if (type === 'merge') {
    return `Incorporate hacia ${streetName}.`;
  }

  if (type === 'end of road') {
    if (modifier === 'left') {
      return `Al final de la via, gira a la izquierda hacia ${streetName}.`;
    }

    if (modifier === 'right') {
      return `Al final de la via, gira a la derecha hacia ${streetName}.`;
    }
  }

  if (type === 'turn') {
    if (modifier === 'left' || modifier === 'slight left' || modifier === 'sharp left') {
      return `Gira a la izquierda hacia ${streetName}.`;
    }

    if (modifier === 'right' || modifier === 'slight right' || modifier === 'sharp right') {
      return `Gira a la derecha hacia ${streetName}.`;
    }

    if (modifier === 'uturn') {
      return `Haz un cambio de sentido hacia ${streetName}.`;
    }

    return `Gira hacia ${streetName}.`;
  }

  return `Sigue hacia ${streetName}.`;
}

function normalizeRouteData(payload: any): RouteData | null {
  const geometry = Array.isArray(payload?.geometry)
    ? payload.geometry.filter(isMapPoint).map((point) => [point[0], point[1]] as MapPoint)
    : [];

  if (geometry.length < 2) {
    return null;
  }

  const steps = Array.isArray(payload?.steps)
    ? payload.steps.map((step: any) => ({
        instruction: typeof step?.instruction === 'string' && step.instruction.trim().length > 0
          ? step.instruction
          : 'Sigue la ruta indicada.',
        distanceMeters: Number(step?.distanceMeters) || 0,
        durationSeconds: Number(step?.durationSeconds) || 0,
        streetName: typeof step?.streetName === 'string' ? step.streetName : '',
        location: isMapPoint(step?.location) ? [step.location[0], step.location[1]] : null,
      }))
    : [];

  return {
    geometry,
    distanceMeters: Number(payload?.distanceMeters) || 0,
    durationSeconds: Number(payload?.durationSeconds) || 0,
    steps,
  };
}

export function buildRouteCacheKey(points: readonly MapPoint[] | null | undefined, profile: RouteProfile = 'walking', precision = 4): string | null {
  if (!points || points.length < 2) {
    return null;
  }

  return `${profile}|${points.map((point) => `${point[0].toFixed(precision)},${point[1].toFixed(precision)}`).join('|')}`;
}

function cacheRoute(key: string, route: RouteData) {
  if (routeCache.has(key)) {
    routeCache.delete(key);
  }

  routeCache.set(key, route);

  if (routeCache.size > ROUTE_CACHE_MAX_ENTRIES) {
    const oldestKey = routeCache.keys().next().value;

    if (typeof oldestKey === 'string') {
      routeCache.delete(oldestKey);
    }
  }

  persistRouteCacheToStorage();
}

export function getCachedRoute(key: string | null | undefined): RouteData | null {
  if (!key) {
    return null;
  }

  return routeCache.get(key) ?? null;
}

export function fetchCachedRoute(key: string, loader: () => Promise<RouteData>): Promise<RouteData> {
  const cachedRoute = routeCache.get(key);
  if (cachedRoute) {
    return Promise.resolve(cachedRoute);
  }

  const pendingRequest = routeRequestCache.get(key);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = loader()
    .then((route) => {
      cacheRoute(key, route);
      return route;
    })
    .finally(() => {
      routeRequestCache.delete(key);
    });

  routeRequestCache.set(key, request);
  return request;
}

async function fetchJsonWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ROUTE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildRouteDataFromOsrmPayload(payload: any, origin: MapPoint, destination: MapPoint): RouteData {
  const bestRoute = payload?.routes?.[0];

  if (!Array.isArray(bestRoute?.geometry?.coordinates)) {
    throw new Error('El motor de rutas no devolvio geometria utilizable.');
  }

  const steps = Array.isArray(bestRoute.legs)
    ? bestRoute.legs.flatMap((leg: any) =>
        Array.isArray(leg?.steps)
          ? leg.steps.map((step: any) => ({
              instruction: buildRouteInstruction(step),
              distanceMeters: Number(step?.distance) || 0,
              durationSeconds: Number(step?.duration) || 0,
              streetName: formatStreetName(step),
              location: Array.isArray(step?.maneuver?.location)
                ? [Number(step.maneuver.location[1]), Number(step.maneuver.location[0])] as MapPoint
                : null,
            }))
          : []
      )
    : [];

  const geometry = bestRoute.geometry.coordinates
    .map((point: any) => (Array.isArray(point) ? [Number(point[1]), Number(point[0])] : null))
    .filter((point: MapPoint | null): point is MapPoint => point !== null && isMapPoint(point));

  return {
    geometry: withVisibleRouteEndpoints(geometry, origin, destination),
    distanceMeters: Number(bestRoute?.distance) || 0,
    durationSeconds: Number(bestRoute?.duration) || 0,
    steps,
  };
}

async function fetchRouteFromOsrmPoints(waypoints: readonly MapPoint[], profile: RouteProfile): Promise<RouteData> {
  const validWaypoints = waypoints.filter(isMapPoint);

  if (validWaypoints.length < 2) {
    throw new Error('No hay coordenadas validas suficientes para calcular la ruta.');
  }

  const origin = validWaypoints[0];
  const destination = validWaypoints[validWaypoints.length - 1];
  const osrmProfile = profile === 'driving' ? 'driving' : 'foot';
  const upstreamUrl = new URL(
    `https://router.project-osrm.org/route/v1/${osrmProfile}/${validWaypoints.map(([lat, lng]) => `${lng},${lat}`).join(';')}`
  );

  upstreamUrl.searchParams.set('overview', 'full');
  upstreamUrl.searchParams.set('geometries', 'geojson');
  upstreamUrl.searchParams.set('steps', 'true');

  const response = await fetchJsonWithTimeout(upstreamUrl);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.code !== 'Ok') {
    throw new Error(payload?.message || 'No se pudo obtener una ruta valida.');
  }

  return buildRouteDataFromOsrmPayload(payload, origin, destination);
}

async function fetchRouteFromApiPoints(waypoints: readonly MapPoint[], profile: RouteProfile): Promise<RouteData> {
  const response = await fetchJsonWithTimeout('/api/route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      waypoints,
      profile,
    }),
  });

  const payload = await response.json().catch(() => null);
  const normalizedPayload = normalizeRouteData(payload);

  if (!response.ok || !normalizedPayload) {
    throw new Error(payload?.message || 'No se pudo calcular la ruta.');
  }

  return normalizedPayload;
}

export async function fetchRouteForPoints(waypoints: readonly MapPoint[], profile: RouteProfile = 'walking'): Promise<RouteData> {
  const validWaypoints = waypoints.filter(isMapPoint);

  if (validWaypoints.length < 2) {
    throw new Error('No hay coordenadas validas suficientes para calcular la ruta.');
  }

  const results = await Promise.allSettled([
    fetchRouteFromApiPoints(validWaypoints, profile),
    fetchRouteFromOsrmPoints(validWaypoints, profile),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
  }

  const firstError = results[0].status === 'rejected' ? results[0].reason : results[1].status === 'rejected' ? results[1].reason : null;

  if (firstError instanceof DOMException && firstError.name === 'AbortError') {
    throw new Error('La ruta ha tardado demasiado en responder.');
  }

  if (firstError instanceof Error && firstError.message.trim().length > 0) {
    throw firstError;
  }

  throw new Error('No se pudo calcular la ruta.');
}

export async function fetchRoute(origin: MapPoint, destination: MapPoint, profile: RouteProfile = 'walking'): Promise<RouteData> {
  return fetchRouteForPoints([origin, destination], profile);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function buildGoogleMapsDirectionsUrl(
  destination: MapPoint,
  origin?: MapPoint | null,
  profile: RouteProfile = 'walking'
): string {
  const url = new URL('https://www.google.com/maps/dir/');

  url.searchParams.set('api', '1');
  url.searchParams.set('travelmode', profile === 'driving' ? 'driving' : 'walking');
  url.searchParams.set('destination', `${destination[0]},${destination[1]}`);

  if (origin) {
    url.searchParams.set('origin', `${origin[0]},${origin[1]}`);
  }

  return url.toString();
}
