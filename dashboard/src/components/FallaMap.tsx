import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Circle, MapContainer, Marker, Pane, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { safeInvalidate, safeFlyTo, safeFitBounds, safeSetView } from '../utils/mapSafe';
import { Accessibility, Activity, AlertTriangle, ArrowUp, Car, ChevronRight, Compass, CornerUpLeft, CornerUpRight, ExternalLink, Eye, Flame, Heart, Layers3, LocateFixed, MapPin, Megaphone, Navigation, RotateCw, Search, SlidersHorizontal, Sparkles, TrainFront, Trophy, X, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { type Falla } from '../data';
import { useNavigationGuidance } from '../hooks/useNavigationGuidance';
import { type LocationStatus } from '../hooks/useUserLocation';
import { trackActivityEvent } from '../utils/activityHeat';
import { fetchDashboardHeatmap, type DashboardHeatHighlights, type DashboardHeatPoint } from '../utils/mapHeat';
import { getFitBoundsOptions, getGuidanceViewport } from '../utils/mapViewport';
import { MAP_THEMES, getMapTheme, type MapStyleId } from '../utils/mapThemes';
import { buildGoogleMapsDirectionsUrl, buildRouteCacheKey, distanceBetweenPoints, distanceToRouteMeters, estimateWalkingDurationSeconds, fetchCachedRoute, fetchRouteForPoints, getCachedRoute, formatDistance, formatDuration, remainingRouteDistanceMeters, type MapPoint, type RouteData, type RouteProfile, type RouteStep } from '../utils/navigation';
import { fallaMatchesSearch, normalizeFallaSearchQuery } from '../utils/fallaSearch';
import { HeatmapLayer } from './HeatmapLayer';
import { MapFloatingControls } from './MapFloatingControls';
import { NavigationGuidanceOverlay } from './NavigationGuidanceOverlay';
import { NavigationRoutePreviewOverlay } from './NavigationRoutePreviewOverlay';
import { RoutePolylineLayer } from './RoutePolylineLayer';

const DEFAULT_CENTER: MapPoint = [39.4699, -0.3763];
const MODO_DEMO_RUTAS = false;
const NAVIGATION_OFF_ROUTE_METERS = 45;
const ROUTE_RECALCULATE_DISTANCE_METERS = 30;
const NAVIGATION_REROUTE_COOLDOWN_MS = 22_000;
const SMOOTH_POSITION_ANIMATION_MS = 700;
const DEMO_ROUTE_START: RouteWaypoint = { lat: 40.4168, lng: -3.7038, nombre: 'Sol' };
const DEMO_ROUTE_STOP: RouteWaypoint = { lat: 40.4223, lng: -3.6998, nombre: 'Plaza de Colon' };
const DEMO_ROUTE_DESTINATIONS: [RouteWaypoint, RouteWaypoint] = [
  { lat: 40.4196, lng: -3.6927, nombre: 'Puerta de Alcala' },
  { lat: 40.4142, lng: -3.6836, nombre: 'Av. de Menendez Pelayo' },
];
const OFFICIAL_METRO_DATASET_URL = 'https://opendata.vlci.valencia.es/dataset/fgv-estacions-estaciones';
const OFFICIAL_METRO_GEOJSON_URL = 'https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/221/query?where=1=1&outFields=*&f=geojson';
const OFFICIAL_RESTROOM_DATASET_URL = 'https://opendata.vlci.valencia.es/dataset/urinaris-urinarios';
const OFFICIAL_RESTROOM_GEOJSON_URL = 'https://geoportal.valencia.es/server/rest/services/OPENDATA/Turismo/MapServer/217/query?where=1=1&outFields=*&f=geojson';
const CITY_CENTER_RADIUS_METERS = 1800;
const METRO_NEAR_FALLA_RADIUS_METERS = 420;
const RESTROOM_NEAR_FALLA_RADIUS_METERS = 320;
const USER_ICON = new L.DivIcon({
  className: 'falla-map-user-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-16 w-16 rounded-full bg-cyan-500/18 animate-ping"></div>
      <div class="relative flex h-10 w-10 items-center justify-center rounded-[1.15rem] border-[4px] border-white bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 text-[20px] shadow-[0_0_0_10px_rgba(14,165,233,0.18),0_16px_34px_rgba(29,78,216,0.32)]">🔥</div>
    </div>
  `,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});
const PARKING_ICON = new L.DivIcon({
  className: 'falla-map-parking-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-11 w-11 rounded-full bg-emerald-500/18"></div>
      <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#0f766e] text-[14px] font-black text-white shadow-[0_14px_30px_rgba(15,118,110,0.28)]">P</div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});
const RESTROOM_ICON = new L.DivIcon({
  className: 'falla-map-restroom-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-11 w-11 rounded-full bg-sky-500/18"></div>
      <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#0f4c81] text-[11px] font-black tracking-[0.08em] text-white shadow-[0_14px_30px_rgba(15,76,129,0.28)]">WC</div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});
const TRANSPORT_ICON = new L.DivIcon({
  className: 'falla-map-transport-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-11 w-11 rounded-full bg-[#ae0f45]/18"></div>
      <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#ae0f45] text-[13px] font-black text-white shadow-[0_14px_30px_rgba(174,15,69,0.30)]">M</div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});
const FALLA_ICON_CACHE = new Map<string, L.DivIcon>();
const CLUSTER_ICON_CACHE = new Map<string, L.DivIcon>();
const ROUTE_STOP_ICON_CACHE = new Map<string, L.DivIcon>();
const PROJECTED_POINT_CACHE = new Map<string, L.Point>();
const HEATMAP_REQUEST_CACHE = new Map<string, { expiresAt: number; payload: HeatmapPayloadState }>();
let officialMetroStationsCache: OfficialMetroStation[] | null = null;
let officialMetroStationsPromise: Promise<OfficialMetroStation[]> | null = null;
let officialRestroomsCache: OfficialRestroom[] | null = null;
let officialRestroomsPromise: Promise<OfficialRestroom[]> | null = null;
const LEAFLET_CANVAS_RENDERER = L.canvas({ padding: 0.35 });
const HEATMAP_CACHE_TTL_MS = 45_000;
const HEATMAP_DEMO_TARGET_KEYWORDS = ['exposicio', 'misser masco'];
const MAX_PROJECTED_POINT_CACHE_SIZE = 6500;
const VIEWPORT_RENDER_BUCKET_PX = 96;
const MAX_RENDERED_MAP_ITEMS = 520;
const MAX_EXACT_ROUTE_PLANNER_STOPS = 6;
const HEATMAP_GRADIENT = {
  0.2: 'rgba(255, 214, 153, 0.2)',
  0.45: 'rgba(255, 179, 71, 0.3)',
  0.72: 'rgba(255, 140, 66, 0.44)',
  1.0: 'rgba(255, 90, 31, 0.62)',
};
const HEATMAP_PREVIEW_OFFSETS = [
  { intensity: 1, latOffset: 0, lngOffset: 0 },
  { intensity: 0.58, latOffset: 0.00022, lngOffset: 0 },
  { intensity: 0.58, latOffset: -0.00022, lngOffset: 0 },
  { intensity: 0.5, latOffset: 0, lngOffset: 0.00028 },
  { intensity: 0.5, latOffset: 0, lngOffset: -0.00028 },
] as const;
const HEATMAP_RANGE_OPTIONS = ['1h', '6h', '24h'] as const;
const INFANTIL_MARKER_VISUAL_OFFSET: MapPoint = [0.000055, 0.000075];
const FALLAS_LIVE_GRADIENT = {
  0.16: 'rgba(34, 197, 94, 0.24)',
  0.42: 'rgba(250, 204, 21, 0.38)',
  0.68: 'rgba(249, 115, 22, 0.55)',
  1: 'rgba(220, 38, 38, 0.72)',
};
const FALLAS_LIVE_POINTS = [
  { name: 'Plaza del Ayuntamiento', status: 'Saturado', tone: 'red', lat: 39.4699, lng: -0.3763, intensity: 1 },
  { name: 'Ruzafa', status: 'Mucha actividad', tone: 'orange', lat: 39.4624, lng: -0.3702, intensity: 0.76 },
  { name: 'Torres de Serranos', status: 'Tranquilo', tone: 'green', lat: 39.4793, lng: -0.3769, intensity: 0.24 },
  { name: 'La Marina', status: 'Ambiente', tone: 'yellow', lat: 39.4603, lng: -0.3242, intensity: 0.5 },
  { name: 'El Carmen', status: 'Mucha actividad', tone: 'orange', lat: 39.4766, lng: -0.3792, intensity: 0.72 },
] as const;
const mapControlInfo = {
  traffic: {
    icon: Car,
    title: 'Tráfico y cortes',
    description: 'Consulta cortes de calles, tráfico y rutas alternativas durante Fallas.',
  },
  liveAlerts: {
    icon: Megaphone,
    title: 'Avisos en directo',
    description: 'Recibe avisos importantes sobre eventos, horarios, incidencias y cambios en tiempo real.',
  },
  filters: {
    icon: SlidersHorizontal,
    title: 'Filtros del mapa',
    description: 'Elige qué quieres ver en el mapa: fallas, eventos, baños, parkings, cortes y más.',
  },
  incidents: {
    icon: AlertTriangle,
    title: 'Incidencias y seguridad',
    description: 'Visualiza zonas con aglomeraciones, alertas de seguridad o incidencias activas.',
  },
  location: {
    icon: LocateFixed,
    title: 'Mi ubicación',
    description: 'Centra el mapa en tu posición actual para orientarte mejor.',
  },
} as const;
type MapControlInfoKey = keyof typeof mapControlInfo;
const FALLAS_PARKINGS = [
  { id: 'parking-alameda', name: 'Parking Alameda', note: 'Acceso recomendado desde el este por vias amplias.', lat: 39.4693, lng: -0.3588 },
  { id: 'parking-aragon', name: 'Parking Aragon', note: 'Buena entrada desde Blasco Ibañez y Mestalla.', lat: 39.4728, lng: -0.3572 },
  { id: 'parking-av-cid', name: 'Parking Av. del Cid', note: 'Entrada comoda desde el oeste para evitar el centro.', lat: 39.4694, lng: -0.3984 },
  { id: 'parking-campanar', name: 'Parking Campanar', note: 'Acceso norte con enlace peatonal hacia Ciutat Vella.', lat: 39.4826, lng: -0.3923 },
  { id: 'parking-marina', name: 'Parking La Marina', note: 'Mas disponibilidad y acceso despejado desde el puerto.', lat: 39.4608, lng: -0.3296 },
] as const;
const FALLAS_STREET_CLOSURES = [
  {
    id: 'closure-colon',
    name: 'Corte en Calle Colon',
    note: 'Corte temporal por alta afluencia',
    path: [
      [39.4709, -0.3715],
      [39.4695, -0.3692],
    ] as [MapPoint, MapPoint],
  },
  {
    id: 'closure-xativa',
    name: 'Corte en Xativa',
    note: 'Desvio hacia calles laterales',
    path: [
      [39.4669, -0.3785],
      [39.4681, -0.3758],
    ] as [MapPoint, MapPoint],
  },
  {
    id: 'closure-serranos',
    name: 'Acceso restringido en Serranos',
    note: 'Paso peatonal prioritario',
    path: [
      [39.4799, -0.3789],
      [39.4786, -0.3759],
    ] as [MapPoint, MapPoint],
  },
  {
    id: 'closure-ruzafa',
    name: 'Corte en Russafa',
    note: 'Zona densa durante los actos',
    path: [
      [39.4624, -0.3695],
      [39.4608, -0.3674],
    ] as [MapPoint, MapPoint],
  },
] as const;
type HeatmapRange = typeof HEATMAP_RANGE_OPTIONS[number];
type MapFloatingPanel = 'incidents' | 'layers' | 'traffic' | null;
type MapLayerVisibility = {
  events: boolean;
  favorites: boolean;
  foodAndDrink: boolean;
  infantils: boolean;
  parking: boolean;
  principals: boolean;
  publicTransport: boolean;
  restrooms: boolean;
  streetClosures: boolean;
};

interface OfficialMetroStation {
  arrivalsUrl: string;
  code: string;
  id: string;
  lat: number;
  line: string;
  lng: number;
  name: string;
  officialInfoUrl: string;
  officialPhotoUrl: string | null;
}

interface OfficialRestroom {
  accessibleCabins: number;
  address: string;
  id: string;
  lat: number;
  lng: number;
  normalCabins: number;
  officialInfoUrl: string;
  officialPhotoUrl: string | null;
  urinals: number;
}

type SelectedFacility =
  | { kind: 'metro'; item: OfficialMetroStation }
  | { kind: 'restroom'; item: OfficialRestroom }
  | null;

interface MapAgendaEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
  location: string;
  description?: string;
  isLive?: boolean;
}

interface RouteWaypoint {
  lat: number;
  lng: number;
  nombre?: string;
}

function slugifyMetroStationName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function agendaEventSortValue(event: MapAgendaEvent): number {
  const [hours = '0', minutes = '0'] = event.time.split(':');
  const normalizedHours = String(Number(hours) || 0).padStart(2, '0');
  const normalizedMinutes = String(Number(minutes) || 0).padStart(2, '0');

  return new Date(`${event.date}T${normalizedHours}:${normalizedMinutes}:00`).getTime();
}

function formatMapAgendaDistance(index: number): string {
  const fallbackDistances = ['1.2 km', '1.5 km', '2.3 km'];
  return fallbackDistances[index] ?? `${Math.max(1.2, 1.2 + index * 0.6).toFixed(1)} km`;
}

async function fetchOfficialMetroStations(): Promise<OfficialMetroStation[]> {
  if (officialMetroStationsCache) {
    return officialMetroStationsCache;
  }

  if (officialMetroStationsPromise) {
    return officialMetroStationsPromise;
  }

  officialMetroStationsPromise = (async () => {
  const response = await fetch(OFFICIAL_METRO_GEOJSON_URL);
  if (!response.ok) {
    throw new Error('No se pudo cargar la capa oficial de Metrovalencia.');
  }

  const payload = await response.json() as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      id?: number | string;
      properties?: {
        codigo?: string;
        linea?: string;
        nombre?: string;
        proximas_llegadas?: string;
      };
    }>;
  };

  const stations = (payload.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const stationName = feature.properties?.nombre?.trim();
      if (!coordinates || coordinates.length < 2 || !stationName) {
        return null;
      }

      const stationSlug = slugifyMetroStationName(stationName);
      return {
        id: String(feature.id ?? feature.properties?.codigo ?? stationSlug),
        code: String(feature.properties?.codigo ?? ''),
        name: stationName,
        line: String(feature.properties?.linea ?? '').trim(),
        lat: Number(coordinates[1]),
        lng: Number(coordinates[0]),
        arrivalsUrl: String(feature.properties?.proximas_llegadas ?? '').trim(),
        officialInfoUrl: `https://www.metrovalencia.es/es/estaciones/${stationSlug}/`,
        officialPhotoUrl: null,
        } satisfies OfficialMetroStation;
    })
    .filter((station): station is OfficialMetroStation => station !== null);

  officialMetroStationsCache = stations;
  return stations;
  })().finally(() => {
    officialMetroStationsPromise = null;
  });

  return officialMetroStationsPromise;
}

async function fetchOfficialRestrooms(): Promise<OfficialRestroom[]> {
  if (officialRestroomsCache) {
    return officialRestroomsCache;
  }

  if (officialRestroomsPromise) {
    return officialRestroomsPromise;
  }

  officialRestroomsPromise = (async () => {
  const response = await fetch(OFFICIAL_RESTROOM_GEOJSON_URL);
  if (!response.ok) {
    throw new Error('No se pudo cargar la capa oficial de baños públicos.');
  }

  const payload = await response.json() as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      id?: number | string;
      properties?: {
        cabina_min?: number;
        cabina_nor?: number;
        direccion?: string;
        objectid?: number | string;
        urinarios?: number;
      };
    }>;
  };

  const restrooms = (payload.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const address = feature.properties?.direccion?.trim();
      if (!coordinates || coordinates.length < 2 || !address) {
        return null;
      }

      return {
        id: String(feature.id ?? feature.properties?.objectid ?? address),
        address,
        lat: Number(coordinates[1]),
        lng: Number(coordinates[0]),
        normalCabins: Number(feature.properties?.cabina_nor ?? 0),
        accessibleCabins: Number(feature.properties?.cabina_min ?? 0),
        urinals: Number(feature.properties?.urinarios ?? 0),
        officialInfoUrl: OFFICIAL_RESTROOM_DATASET_URL,
        officialPhotoUrl: null,
      } satisfies OfficialRestroom;
    })
    .filter((restroom): restroom is OfficialRestroom => restroom !== null);

  officialRestroomsCache = restrooms;
  return restrooms;
  })().finally(() => {
    officialRestroomsPromise = null;
  });

  return officialRestroomsPromise;
}

function renderOfficialPhotoBlock(title: string) {
  return (
    <div className="mb-2 rounded-full bg-slate-100 px-3 py-2 text-[11px] font-bold leading-4 text-slate-600">
      Sin foto oficial publicada para {title.toLowerCase()}.
    </div>
  );
}

function isPointNearCenterOrFallas(
  point: MapPoint,
  fallasPoints: MapPoint[],
  nearFallaRadiusMeters: number
): boolean {
  if (distanceBetweenPoints(point, DEFAULT_CENTER) <= CITY_CENTER_RADIUS_METERS) {
    return true;
  }

  return fallasPoints.some((fallaPoint) => distanceBetweenPoints(point, fallaPoint) <= nearFallaRadiusMeters);
}

async function fetchRouteForWaypoints(waypoints: RouteWaypoint[], profile: RouteProfile): Promise<RouteData> {
  const validWaypoints = waypoints.filter(isValidRouteWaypoint);

  if (validWaypoints.length < 2) {
    throw new Error('No hay coordenadas validas suficientes para calcular la ruta.');
  }

  return fetchRouteForPoints(
    validWaypoints.map((point) => [point.lat, point.lng] as MapPoint),
    profile
  );
}

interface MapViewportState {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  zoom: number;
}

interface HeatmapPayloadState {
  heatPoints: DashboardHeatPoint[];
  highlights: DashboardHeatHighlights;
  topFallaIds: string[];
  updatedAt: string | null;
}

interface EffectiveHeatmapState extends HeatmapPayloadState {
  source: 'empty' | 'live' | 'preview';
}

interface ClusteredMapItem {
  fallas: Falla[];
  allInfantil: boolean;
  hasInfantil: boolean;
  hasPrize: boolean;
  id: string;
  kind: 'cluster';
  lat: number;
  lng: number;
}

interface SingleMapItem {
  falla: Falla;
  id: string;
  kind: 'falla';
}

type RenderedMapItem = ClusteredMapItem | SingleMapItem;

interface Fallas360RouteApi {
  actualizarRuta: (inicio: RouteWaypoint, puntosIntermedios: RouteWaypoint[], destino: RouteWaypoint) => void;
  rutaHastaFalla: (falla: Falla) => Promise<void>;
  rutaEntreFallas: (fallaOrigen: Falla, fallaDestino: Falla) => void;
  rutaConParadas: (origen: RouteWaypoint | Falla, fallasIntermedias: Array<RouteWaypoint | Falla>, destino: RouteWaypoint | Falla) => void;
  limpiarRuta: () => void;
  centrarRuta: () => void;
}

declare global {
  interface Window {
    Fallas360Rutas?: Fallas360RouteApi;
  }
}

function fallaToRouteWaypoint(falla: Falla): RouteWaypoint {
  return {
    lat: falla.lat,
    lng: falla.lng,
    nombre: falla.name,
  };
}

function pointToRouteWaypoint(point: RouteWaypoint | Falla, fallbackName = 'Punto de ruta'): RouteWaypoint {
  return {
    lat: Number(point.lat),
    lng: Number(point.lng),
    nombre: 'name' in point ? point.name : point.nombre || fallbackName,
  };
}

function matchesRouteWaypointFalla(falla: Falla, waypoint: RouteWaypoint, tolerance = 0.00001): boolean {
  return Math.abs(falla.lat - waypoint.lat) < tolerance && Math.abs(falla.lng - waypoint.lng) < tolerance;
}

function isValidRouteWaypoint(point: RouteWaypoint | null | undefined): point is RouteWaypoint {
  return (
    typeof point?.lat === 'number'
    && Number.isFinite(point.lat)
    && typeof point?.lng === 'number'
    && Number.isFinite(point.lng)
  );
}

function routeWaypointsKey(waypoints: RouteWaypoint[] | null, profile: RouteProfile) {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }

  return buildRouteCacheKey(
    waypoints.map((point) => [point.lat, point.lng] as MapPoint),
    profile,
    4
  );
}

function routeWaypointDistance(origin: RouteWaypoint, destination: RouteWaypoint): number {
  return distanceBetweenPoints([origin.lat, origin.lng], [destination.lat, destination.lng]);
}

function buildOptimizedStopOrder(origin: RouteWaypoint, stops: Falla[]): Falla[] {
  if (stops.length <= 2) {
    return stops;
  }

  const scoreOrder = (order: Falla[]) => {
    const waypoints = [origin, ...order.map(fallaToRouteWaypoint)];
    const legDistances = waypoints.slice(1).map((waypoint, index) => routeWaypointDistance(waypoints[index], waypoint));
    const totalDistance = legDistances.reduce((sum, distance) => sum + distance, 0);
    const longestLeg = Math.max(...legDistances);
    const directionChanges = legDistances.slice(1).reduce((penalty, distance, index) => {
      const previousDistance = legDistances[index];
      return penalty + Math.abs(distance - previousDistance) * 0.08;
    }, 0);

    return totalDistance + (longestLeg * 0.18) + directionChanges;
  };

  const buildGreedyOrder = (): Falla[] => {
    const remaining = [...stops];
    const order: Falla[] = [];
    let currentPoint = origin;

    while (remaining.length > 0) {
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      remaining.forEach((candidate, index) => {
        const candidateDistance = routeWaypointDistance(currentPoint, fallaToRouteWaypoint(candidate));
        if (candidateDistance < closestDistance) {
          closestDistance = candidateDistance;
          closestIndex = index;
        }
      });

      const [nextStop] = remaining.splice(closestIndex, 1);
      order.push(nextStop);
      currentPoint = fallaToRouteWaypoint(nextStop);
    }

    return order;
  };

  if (stops.length > MAX_EXACT_ROUTE_PLANNER_STOPS) {
    return buildGreedyOrder();
  }

  const best = {
    order: stops,
    score: Number.POSITIVE_INFINITY,
  };

  const visit = (remaining: Falla[], currentOrder: Falla[]) => {
    if (remaining.length === 0) {
      const score = scoreOrder(currentOrder);
      if (score < best.score) {
        best.order = currentOrder;
        best.score = score;
      }
      return;
    }

    remaining.forEach((falla, index) => {
      visit(
        remaining.filter((_, currentIndex) => currentIndex !== index),
        [...currentOrder, falla]
      );
    });
  };

  visit(stops, []);
  return best.order;
}

function resolveManeuverIcon(step: RouteStep | null): LucideIcon {
  const instruction = step?.instruction.toLowerCase() ?? '';

  if (instruction.includes('izquierda')) {
    return CornerUpLeft;
  }

  if (instruction.includes('derecha')) {
    return CornerUpRight;
  }

  if (instruction.includes('rotonda') || instruction.includes('cambio de sentido')) {
    return RotateCw;
  }

  return ArrowUp;
}

function RouteManeuverCard({
  currentStep,
  currentStepLabel,
  destinationName,
  isGuidanceActive,
  routeError,
}: {
  currentStep: RouteStep | null;
  currentStepLabel: string | null;
  destinationName: string;
  isGuidanceActive: boolean;
  routeError: string | null;
}) {
  const ManeuverIcon = resolveManeuverIcon(currentStep);
  const instruction = routeError
    ? routeError
    : currentStep?.instruction ?? `Sigue la ruta marcada hasta ${destinationName}.`;
  const distanceLabel = currentStep ? formatDistance(currentStep.distanceMeters) : 'Ruta';
  const streetLabel = currentStep?.streetName && currentStep.streetName !== 'la via indicada'
    ? currentStep.streetName
    : destinationName;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-[1120] flex justify-center sm:inset-x-5 sm:top-5">
      <div className="pointer-events-auto flex w-full max-w-[30rem] items-start gap-3 rounded-[1.45rem] border border-white/85 bg-white/97 px-3.5 py-3.5 text-slate-950 shadow-[0_24px_58px_rgba(15,23,42,0.24)] backdrop-blur-2xl">
        <div className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-white text-white shadow-[0_16px_34px_rgba(26,115,232,0.34)]',
          routeError ? 'bg-red-500' : 'bg-[#11a8ff]'
        )}>
          <ManeuverIcon className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#11a8ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white">
              {isGuidanceActive ? 'Ahora' : 'Vista previa'}
            </span>
            {currentStepLabel ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
                Paso {currentStepLabel}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
              {distanceLabel}
            </span>
          </div>

          <p className="mt-2 text-[1.06rem] font-black leading-[1.18] text-slate-950 sm:text-[1.18rem]">
            {instruction}
          </p>
          <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {streetLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatHeatTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function emptyHeatHighlights(): DashboardHeatHighlights {
  return {
    hottestZoneLabel: null,
    topFalla: null,
    topNeighborhood: null,
  };
}

function formatWalkingEta(distanceMeters: number | null): string {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return 'Sin GPS';
  }

  const walkingSpeedMetersPerSecond = 1.35;
  return formatDuration(distanceMeters / walkingSpeedMetersPerSecond);
}

function formatCompactMetric(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '0';
  }

  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function getHeatmapVisualOptions(zoom: number): L.HeatLayerOptions {
  if (zoom >= 16) {
    return {
      radius: 14,
      blur: 16,
      minOpacity: 0.12,
      maxZoom: 17,
      pane: 'heatmapPane',
      gradient: HEATMAP_GRADIENT,
    };
  }

  if (zoom >= 14) {
    return {
      radius: 20,
      blur: 22,
      minOpacity: 0.1,
      maxZoom: 17,
      pane: 'heatmapPane',
      gradient: HEATMAP_GRADIENT,
    };
  }

  return {
    radius: 24,
    blur: 26,
    minOpacity: 0.09,
    maxZoom: 17,
    pane: 'heatmapPane',
    gradient: HEATMAP_GRADIENT,
  };
}

function useSmoothMapPoint(target: MapPoint | null, durationMs = SMOOTH_POSITION_ANIMATION_MS) {
  const [displayPoint, setDisplayPoint] = useState<MapPoint | null>(target);
  const frameRef = useRef<number | null>(null);
  const startPointRef = useRef<MapPoint | null>(target);

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!target) {
      startPointRef.current = null;
      setDisplayPoint(null);
      return;
    }

    if (!displayPoint) {
      startPointRef.current = target;
      setDisplayPoint(target);
      return;
    }

    const fromPoint = displayPoint;
    const startedAt = performance.now();
    startPointRef.current = fromPoint;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextPoint: MapPoint = [
        fromPoint[0] + ((target[0] - fromPoint[0]) * easedProgress),
        fromPoint[1] + ((target[1] - fromPoint[1]) * easedProgress),
      ];

      setDisplayPoint(nextPoint);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
        startPointRef.current = target;
      }
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, target?.[0], target?.[1]]);

  return displayPoint;
}

function clampHeatIntensity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeHeatmapLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isHeatmapDemoTarget(falla: Falla): boolean {
  const label = normalizeHeatmapLabel(`${falla.name} ${falla.commissionName ?? ''}`);
  return HEATMAP_DEMO_TARGET_KEYWORDS.every((keyword) => label.includes(keyword));
}

function buildHeatmapCacheKey(bounds: L.LatLngBounds, zoom: number, range: HeatmapRange): string {
  const parts = [
    bounds.getSouth(),
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
  ].map((value) => value.toFixed(3));

  return `${range}:${Math.round(zoom)}:${parts.join(':')}`;
}

function buildPreviewHeatmapPayload({
  activeRouteFalla,
  demoFocusFalla,
  fallas,
  favorites,
  selectedFalla,
  userPosition,
}: {
  activeRouteFalla: Falla | null;
  demoFocusFalla: Falla | null;
  fallas: Falla[];
  favorites: string[];
  selectedFalla: Falla | null;
  userPosition: MapPoint | null;
}): HeatmapPayloadState {
  if (fallas.length === 0) {
    return {
      heatPoints: [],
      highlights: emptyHeatHighlights(),
      topFallaIds: [],
      updatedAt: null,
    };
  }

  if (demoFocusFalla) {
    const nearbyFallas = fallas
      .filter((falla) => falla.id !== demoFocusFalla.id)
      .map((falla) => ({
        falla,
        distance: distanceBetweenPoints([demoFocusFalla.lat, demoFocusFalla.lng], [falla.lat, falla.lng]),
      }))
      .filter((entry) => entry.distance <= 950)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 4)
      .map((entry, index) => ({
        falla: entry.falla,
        score: Math.max(0.28, 0.62 - (index * 0.08)),
      }));

    const rankedFallas = [
      { falla: demoFocusFalla, score: 1 },
      ...nearbyFallas,
    ];

    return {
      heatPoints: rankedFallas.flatMap(({ falla, score }, fallaIndex) => HEATMAP_PREVIEW_OFFSETS.map((offset, offsetIndex) => ({
        lat: Number((falla.lat + offset.latOffset).toFixed(6)),
        lng: Number((falla.lng + offset.lngOffset).toFixed(6)),
        intensity: Number(clampHeatIntensity((score * offset.intensity) - (fallaIndex * 0.03) - (offsetIndex * 0.006)).toFixed(4)),
      }))),
      highlights: {
        hottestZoneLabel: demoFocusFalla.name,
        topFalla: {
          id: demoFocusFalla.id,
          name: demoFocusFalla.name,
          score: 1,
          sectionName: demoFocusFalla.section,
        },
        topNeighborhood: {
          name: demoFocusFalla.neighborhood,
          score: 1,
        },
      },
      topFallaIds: rankedFallas.map(({ falla }) => falla.id),
      updatedAt: null,
    };
  }

  const favoritesSet = new Set(favorites);
  const maxVisitors = Math.max(1, ...fallas.map((falla) => falla.visitors || 0));
  const maxLikes = Math.max(1, ...fallas.map((falla) => falla.likes || 0));
  const rankedFallas = [...fallas]
    .map((falla) => {
      const visitorScore = Math.min((falla.visitors || 0) / maxVisitors, 1);
      const likeScore = Math.min((falla.likes || 0) / maxLikes, 1);
      const prizeBoost = falla.prize ? Math.max(0.04, 0.16 - ((falla.prize - 1) * 0.02)) : 0;
      const favoriteBoost = favoritesSet.has(falla.id) ? 0.08 : 0;
      const selectedBoost = selectedFalla?.id === falla.id ? 0.22 : 0;
      const routeBoost = activeRouteFalla?.id === falla.id ? 0.16 : 0;
      const proximityBoost = userPosition
        ? Math.max(0, 1 - (Math.min(distanceBetweenPoints(userPosition, [falla.lat, falla.lng]), 2200) / 2200)) * 0.12
        : 0;

      return {
        falla,
        score: 0.22 + (visitorScore * 0.34) + (likeScore * 0.22) + prizeBoost + favoriteBoost + selectedBoost + routeBoost + proximityBoost,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(8, fallas.length));

  if (rankedFallas.length === 0) {
    return {
      heatPoints: [],
      highlights: emptyHeatHighlights(),
      topFallaIds: [],
      updatedAt: null,
    };
  }

  const topScore = Math.max(1, rankedFallas[0]?.score ?? 1);
  const neighborhoodScores = new Map<string, number>();
  const heatPoints = rankedFallas.flatMap(({ falla, score }) => {
    const normalizedIntensity = clampHeatIntensity(0.24 + ((score / topScore) * 0.58));
    if (falla.neighborhood.trim() !== '') {
      neighborhoodScores.set(
        falla.neighborhood,
        (neighborhoodScores.get(falla.neighborhood) ?? 0) + score
      );
    }

    return HEATMAP_PREVIEW_OFFSETS.map((offset) => ({
      lat: Number((falla.lat + offset.latOffset).toFixed(6)),
      lng: Number((falla.lng + offset.lngOffset).toFixed(6)),
      intensity: Number(clampHeatIntensity(normalizedIntensity * offset.intensity).toFixed(4)),
    }));
  });

  const topNeighborhoodEntry = Array.from(neighborhoodScores.entries())
    .sort((left, right) => right[1] - left[1])[0] ?? null;
  const topFallaEntry = rankedFallas[0] ?? null;

  return {
    heatPoints,
    highlights: {
      hottestZoneLabel: topNeighborhoodEntry?.[0] ?? topFallaEntry?.falla.name ?? null,
      topFalla: topFallaEntry
        ? {
            id: topFallaEntry.falla.id,
            name: topFallaEntry.falla.name,
            score: Number(topFallaEntry.score.toFixed(2)),
            sectionName: topFallaEntry.falla.section,
          }
        : null,
      topNeighborhood: topNeighborhoodEntry
        ? {
            name: topNeighborhoodEntry[0],
            score: Number(topNeighborhoodEntry[1].toFixed(2)),
          }
        : null,
    },
    topFallaIds: rankedFallas.slice(0, 6).map(({ falla }) => falla.id),
    updatedAt: null,
  };
}
 
 function HeatmapDataBridge({
  enabled,
  onLoadingChange,
  onPayloadChange,
  range,
}: {
  enabled: boolean;
  onLoadingChange: (value: boolean) => void;
  onPayloadChange: (payload: HeatmapPayloadState) => void;
  range: HeatmapRange;
}) {
  const map = useMap();
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const clearPendingRequest = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const loadHeatmap = useCallback(() => {
    if (!enabled) {
      clearPendingRequest();
      onLoadingChange(false);
      onPayloadChange({
        heatPoints: [],
        highlights: emptyHeatHighlights(),
        topFallaIds: [],
        updatedAt: null,
      });
      return;
    }

    clearPendingRequest();

    timeoutRef.current = window.setTimeout(() => {
      const bounds = map.getBounds();
      const cacheKey = buildHeatmapCacheKey(bounds, map.getZoom(), range);
      const cachedEntry = HEATMAP_REQUEST_CACHE.get(cacheKey);
      if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        onPayloadChange(cachedEntry.payload);
        onLoadingChange(false);
        return;
      }

      const bbox = [
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast(),
      ].join(',');

      const controller = new AbortController();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      abortRef.current = controller;
      onLoadingChange(true);

      fetchDashboardHeatmap(bbox, map.getZoom(), range, controller.signal)
        .then((payload) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          HEATMAP_REQUEST_CACHE.set(cacheKey, {
            expiresAt: Date.now() + HEATMAP_CACHE_TTL_MS,
            payload,
          });
          onPayloadChange(payload);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          if (error instanceof Error && error.message === 'SESSION_INVALID') {
            const pathname = window.location.pathname;
            const dashboardIndex = pathname.indexOf('/dashboard');
            const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);
            window.location.replace(`${basePath}/login.php`);
            return;
          }

          if (requestId === requestIdRef.current) {
            onPayloadChange({
              heatPoints: [],
              highlights: emptyHeatHighlights(),
              topFallaIds: [],
              updatedAt: null,
            });
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            onLoadingChange(false);
          }
        });
    }, 260);
  }, [clearPendingRequest, enabled, map, onLoadingChange, onPayloadChange, range]);

  useMapEvents({
    moveend: loadHeatmap,
    resize: loadHeatmap,
    zoomend: loadHeatmap,
  });

  useEffect(() => {
    loadHeatmap();

    if (!enabled) {
      return () => {
        clearPendingRequest();
        onLoadingChange(false);
      };
    }

    const intervalId = window.setInterval(() => {
      loadHeatmap();
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
      clearPendingRequest();
      onLoadingChange(false);
    };
  }, [clearPendingRequest, enabled, loadHeatmap, onLoadingChange]);

  return null;
}

function HeatmapFocusController({
  enabled,
  target,
}: {
  enabled: boolean;
  target: Falla | null;
}) {
  const map = useMap();
  const previousEnabledRef = useRef(enabled);

  useEffect(() => {
    const wasEnabled = previousEnabledRef.current;
    previousEnabledRef.current = enabled;

    if (!enabled || wasEnabled || !target) {
      return;
    }

    safeFlyTo(map, [target.lat, target.lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.9,
    });
  }, [enabled, map, target]);

  return null;
}

function createFallaIcon(
  selected: boolean,
  active: boolean,
  prize?: number,
  trending = false,
  minimal = false,
  metric?: number,
  infantil = false
) {
  const hasPrize = typeof prize === 'number';

  if (minimal) {
    const haloBackground = active
      ? 'rgba(110,255,219,0.24)'
      : hasPrize
        ? 'rgba(250,204,21,0.26)'
        : 'rgba(255,99,33,0.22)';
    const haloShadow = active
      ? '0 0 0 8px rgba(110,255,219,0.12)'
      : hasPrize
        ? '0 0 0 7px rgba(250,204,21,0.16)'
        : infantil
          ? '0 0 0 7px rgba(16,185,129,0.15)'
          : '0 0 0 7px rgba(255,99,33,0.12)';
    const markerBackground = hasPrize
      ? 'linear-gradient(180deg,#ffe58f 0%,#f4c20d 100%)'
      : infantil
        ? 'linear-gradient(180deg,#8ff5c7 0%,#10b981 100%)'
        : 'linear-gradient(180deg,#ff8a57 0%,#ff6321 100%)';
    const markerColor = hasPrize ? '#7c4a03' : '#ffffff';
    const markerBorder = active
      ? '#72f7d7'
      : selected
        ? (hasPrize ? '#a16207' : infantil ? '#047857' : '#c2410c')
        : hasPrize
          ? '#facc15'
          : infantil
            ? '#34d399'
            : '#ff7a3d';
    const label = hasPrize
      ? `#${prize}`
      : infantil
        ? 'Inf'
        : (typeof metric === 'number' && metric >= 1.15 ? 'Top' : '');
    const iconHtml = hasPrize
      ? `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 4h8v3a4 4 0 0 1-8 0z"/>
            <path d="M9 18h6"/>
            <path d="M10 15h4v3h-4z"/>
            <path d="M16 5h2a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>
            <path d="M8 5H6a1 1 0 0 0-1 1 4 4 0 0 0 4 4"/>
          </svg>
        `
      : infantil
        ? `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3.5 14.5 9l6 .6-4.5 4 1.3 5.9L12 16.4 6.7 19.5 8 13.6l-4.5-4 6-.6z"/>
          </svg>
        `
        : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2c.6 2.2 2.1 4.1 3.3 5.8 1.4 1.9 2.7 3.7 2.7 6.2a6 6 0 0 1-12 0c0-2.4 1.2-4.1 2.5-5.9C9.8 6.5 11 4.8 11.4 3c1 1.1 1.8 2.4 2 4 .9-1 1.3-2.3 1.3-5z"/>
          </svg>
        `;

    return new L.DivIcon({
      className: 'falla-map-marker-minimal',
      html: `
        <div class="relative flex items-center justify-center">
          ${active || selected || trending ? `<div class="absolute h-10 w-10 rounded-full" style="background:${haloBackground};box-shadow:${haloShadow};"></div>` : ''}
          <div class="relative flex h-8 w-8 items-center justify-center rounded-[14px] border-[2px]" style="background:${markerBackground};color:${markerColor};border-color:${markerBorder};">
            ${iconHtml}
          </div>
          ${label ? `<div class="absolute -bottom-3 rounded-full border border-white/90 bg-white/96 px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em]" style="color:${hasPrize ? '#a16207' : infantil ? '#047857' : '#c2410c'};">${label}</div>` : ''}
        </div>
      `,
      iconSize: [40, 42],
      iconAnchor: [20, 21],
    });
  }

  const bg = hasPrize
    ? 'linear-gradient(180deg,#ffe58f 0%,#f4c20d 100%)'
    : infantil
      ? 'linear-gradient(180deg,#8ff5c7 0%,#10b981 100%)'
      : 'linear-gradient(180deg,#ff8a57 0%,#ff6321 100%)';
  const fg = hasPrize ? '#7c4a03' : '#ffffff';
  const badge = prize ? `#${prize}` : active ? 'Ruta' : infantil ? 'Infantil' : null;
  const badgeHtml = badge
    ? `<div class="absolute -top-8 rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">${badge}</div>`
    : '';
  const trendingHalo = trending
    ? '<div class="absolute h-[4.15rem] w-[4.15rem] rounded-full" style="background:rgba(255,122,26,0.08);box-shadow:0 0 0 5px rgba(255,122,26,0.16);"></div>'
    : '';
  const iconHtml = hasPrize
    ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 4h8v3a4 4 0 0 1-8 0z"/>
          <path d="M9 18h6"/>
          <path d="M10 15h4v3h-4z"/>
          <path d="M16 5h2a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>
          <path d="M8 5H6a1 1 0 0 0-1 1 4 4 0 0 0 4 4"/>
        </svg>
      `
    : infantil
      ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3.5 14.5 9l6 .6-4.5 4 1.3 5.9L12 16.4 6.7 19.5 8 13.6l-4.5-4 6-.6z"/>
        </svg>
      `
      : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a2.5 2.5 0 0 1-5 0c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054-2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a2.5 2.5 0 0 1-5 0z"/>
        </svg>
      `;

  return new L.DivIcon({
    className: 'falla-map-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${badgeHtml}
        ${trendingHalo}
        <div class="absolute h-14 w-14 rounded-full blur-[2px]" style="background:${active ? 'rgba(110,255,219,0.24)' : hasPrize ? 'rgba(250,204,21,0.3)' : infantil ? 'rgba(16,185,129,0.24)' : 'rgba(255,99,33,0.22)'};"></div>
        <div class="relative flex h-12 w-12 items-center justify-center rounded-[1.45rem] border-2 shadow-[0_20px_38px_rgba(15,23,42,0.14)]" style="background:${bg};color:${fg};border-color:${active ? '#72f7d7' : selected ? (hasPrize ? '#a16207' : infantil ? '#047857' : '#7c2d12') : hasPrize ? '#facc15' : infantil ? '#34d399' : '#ff9b74'};">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [56, 66],
    iconAnchor: [28, 38],
  });
}

function getCachedFallaIcon(
  selected: boolean,
  active: boolean,
  prize?: number,
  trending = false,
  minimal = false,
  metric?: number,
  infantil = false
) {
  const cacheKey = `${selected ? '1' : '0'}:${active ? '1' : '0'}:${trending ? '1' : '0'}:${minimal ? '1' : '0'}:${infantil ? '1' : '0'}:${typeof prize === 'number' ? prize : 'none'}:${typeof metric === 'number' ? Math.round(metric * 10) : 'none'}`;
  const cachedIcon = FALLA_ICON_CACHE.get(cacheKey);

  if (cachedIcon) {
    return cachedIcon;
  }

  const nextIcon = createFallaIcon(selected, active, prize, trending, minimal, metric, infantil);
  FALLA_ICON_CACHE.set(cacheKey, nextIcon);
  return nextIcon;
}

function getCachedRouteStopIcon(label: string, kind: 'start' | 'stop' | 'end') {
  const cacheKey = `${kind}:${label}`;
  const cachedIcon = ROUTE_STOP_ICON_CACHE.get(cacheKey);

  if (cachedIcon) {
    return cachedIcon;
  }

  const nextIcon = new L.DivIcon({
    className: 'f360-route-marker-wrapper',
    html: `<div class="f360-route-marker f360-route-marker--${kind}"><span>${label}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 32],
  });
  ROUTE_STOP_ICON_CACHE.set(cacheKey, nextIcon);
  return nextIcon;
}

function createClusterIcon(count: number, hasPrize: boolean, hasInfantil: boolean) {
  const background = hasPrize ? 'linear-gradient(180deg,#ffe58f 0%,#f4c20d 100%)' : hasInfantil ? 'linear-gradient(180deg,#8ff5c7 0%,#10b981 100%)' : 'linear-gradient(180deg,#ff8a57 0%,#ff6321 100%)';
  const border = hasPrize ? '#facc15' : hasInfantil ? '#34d399' : '#ffb08f';
  const text = hasPrize ? '#7c4a03' : '#ffffff';
  const halo = hasPrize ? 'rgba(250,204,21,0.22)' : hasInfantil ? 'rgba(16,185,129,0.2)' : 'rgba(255,99,33,0.18)';

  return new L.DivIcon({
    className: 'falla-map-cluster',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute h-12 w-12 rounded-full" style="background:${halo};"></div>
        <div class="relative flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] shadow-[0_14px_28px_rgba(15,23,42,0.2)]" style="background:${background};border-color:${border};color:${text};">
          <span class="text-[11px] font-black tracking-[0.02em]">${count}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function getCachedClusterIcon(count: number, hasPrize: boolean, hasInfantil: boolean) {
  const cacheKey = `${count}:${hasPrize ? '1' : '0'}:${hasInfantil ? '1' : '0'}`;
  const cachedIcon = CLUSTER_ICON_CACHE.get(cacheKey);

  if (cachedIcon) {
    return cachedIcon;
  }

  const nextIcon = createClusterIcon(count, hasPrize, hasInfantil);
  CLUSTER_ICON_CACHE.set(cacheKey, nextIcon);
  return nextIcon;
}

function getProjectedFallaPoint(falla: Falla, zoom: number): L.Point {
  const cacheKey = `${zoom}:${falla.id}:${falla.lat}:${falla.lng}`;
  const cachedPoint = PROJECTED_POINT_CACHE.get(cacheKey);

  if (cachedPoint) {
    return cachedPoint;
  }

  const nextPoint = L.CRS.EPSG3857.latLngToPoint(L.latLng(falla.lat, falla.lng), zoom);
  if (PROJECTED_POINT_CACHE.size > MAX_PROJECTED_POINT_CACHE_SIZE) {
    PROJECTED_POINT_CACHE.clear();
  }
  PROJECTED_POINT_CACHE.set(cacheKey, nextPoint);
  return nextPoint;
}

function readMapViewportState(map: L.Map): MapViewportState {
  const pixelBounds = map.getPixelBounds();

  return {
    minX: pixelBounds.min.x,
    minY: pixelBounds.min.y,
    maxX: pixelBounds.max.x,
    maxY: pixelBounds.max.y,
    zoom: map.getZoom(),
  };
}

function normalizeViewportStateForRender(state: MapViewportState): MapViewportState {
  return {
    minX: Math.floor(state.minX / VIEWPORT_RENDER_BUCKET_PX) * VIEWPORT_RENDER_BUCKET_PX,
    minY: Math.floor(state.minY / VIEWPORT_RENDER_BUCKET_PX) * VIEWPORT_RENDER_BUCKET_PX,
    maxX: Math.ceil(state.maxX / VIEWPORT_RENDER_BUCKET_PX) * VIEWPORT_RENDER_BUCKET_PX,
    maxY: Math.ceil(state.maxY / VIEWPORT_RENDER_BUCKET_PX) * VIEWPORT_RENDER_BUCKET_PX,
    zoom: state.zoom,
  };
}

function MapViewportBridge({
  onChange,
}: {
  onChange: (state: MapViewportState) => void;
}) {
  const frameRef = useRef<number | null>(null);
  const latestStateRef = useRef<MapViewportState | null>(null);
  const emitChange = useCallback((state: MapViewportState) => {
    latestStateRef.current = state;

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      if (latestStateRef.current) {
        onChange(latestStateRef.current);
      }
    });
  }, [onChange]);
  const map = useMapEvents({
    moveend: () => emitChange(readMapViewportState(map)),
    resize: () => emitChange(readMapViewportState(map)),
    zoomend: () => emitChange(readMapViewportState(map)),
  });

  useEffect(() => {
    emitChange(readMapViewportState(map));

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [emitChange, map]);

  return null;
}

function ViewportController({
  fallas,
  selectedFalla,
  activeRouteFalla,
  routeGeometry,
  clusterFocusFallas,
  userPosition,
  focusClusterToken,
  focusUserToken,
  focusRouteToken,
  focusSelectedToken,
  externalRouteFocusToken,
  guidanceMode,
  onBackgroundClick,
}: {
  fallas: Falla[];
  selectedFalla: Falla | null;
  activeRouteFalla: Falla | null;
  routeGeometry: MapPoint[] | null;
  clusterFocusFallas: Falla[] | null;
  userPosition: MapPoint | null;
  focusClusterToken: number;
  focusUserToken: number;
  focusRouteToken: number;
  focusSelectedToken: number;
  externalRouteFocusToken: number;
  guidanceMode: boolean;
  onBackgroundClick: () => void;
}) {
  const map = useMap();
  const lastAutoFitKey = useRef<string>('');
  useMapEvents({ click: onBackgroundClick });

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      safeInvalidate(map);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [map]);

  useEffect(() => {
    if (!selectedFalla) {
      return;
    }

    lastAutoFitKey.current = `selected:${selectedFalla.id}`;
    safeFlyTo(map, [selectedFalla.lat, selectedFalla.lng], map.getSize().x < 640 ? 15 : 16, { duration: 0.85 });
  }, [map, selectedFalla]);

  useEffect(() => {
    if (!(activeRouteFalla && userPosition)) {
      return;
    }

    const routeKey = guidanceMode
      ? `guidance:${activeRouteFalla.id}:${routeGeometry?.length ?? 0}`
      : routeGeometry && routeGeometry.length > 1
      ? `route:${activeRouteFalla.id}:${routeGeometry.length}:${userPosition[0].toFixed(5)}:${userPosition[1].toFixed(5)}`
      : `route:${activeRouteFalla.id}:${userPosition[0].toFixed(5)}:${userPosition[1].toFixed(5)}`;
    if (lastAutoFitKey.current === routeKey) {
      return;
    }

    lastAutoFitKey.current = routeKey;
    if (guidanceMode) {
      const { center, zoom } = getGuidanceViewport(map, userPosition, 'docked');
      safeSetView(map, center, zoom, { animate: false });
      return;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, 'main', true));
      return;
    }

    safeFitBounds(map, [userPosition, [activeRouteFalla.lat, activeRouteFalla.lng]], getFitBoundsOptions(map, 'main', false));
  }, [activeRouteFalla, guidanceMode, map, routeGeometry, userPosition]);

  useEffect(() => {
    if (selectedFalla || activeRouteFalla || fallas.length === 0) {
      return;
    }

    const visibleKey = `visible:${fallas.map((falla) => falla.id).join(',')}`;
    if (lastAutoFitKey.current === visibleKey) {
      return;
    }

    lastAutoFitKey.current = visibleKey;

    if (fallas.length === 1) {
      safeFlyTo(map, [fallas[0].lat, fallas[0].lng], map.getSize().x < 640 ? 14 : 15, { duration: 0.8 });
      return;
    }

    safeFitBounds(map, fallas.map((falla) => [falla.lat, falla.lng] as MapPoint), {
      paddingTopLeft: L.point(28, 28),
      paddingBottomRight: L.point(28, map.getSize().x < 1024 ? 180 : 48),
      maxZoom: 14,
    });
  }, [activeRouteFalla, fallas, map, selectedFalla, userPosition]);

  useEffect(() => {
    if (!focusClusterToken || !clusterFocusFallas?.length) {
      return;
    }

    if (clusterFocusFallas.length === 1) {
      const [target] = clusterFocusFallas;
      map.flyTo([target.lat, target.lng], map.getSize().x < 640 ? 15 : 16, { duration: 0.75 });
      return;
    }

    safeFitBounds(map, clusterFocusFallas.map((falla) => [falla.lat, falla.lng] as MapPoint), {
      paddingTopLeft: L.point(28, 28),
      paddingBottomRight: L.point(28, map.getSize().x < 1024 ? 220 : 120),
      maxZoom: 16,
    });
  }, [clusterFocusFallas, focusClusterToken, map]);

  useEffect(() => {
    if (focusUserToken && userPosition) {
      lastAutoFitKey.current = `user:${userPosition[0].toFixed(5)}:${userPosition[1].toFixed(5)}`;
      safeFlyTo(map, userPosition, 16, { duration: 0.9 });
    }
  }, [focusUserToken, map, userPosition]);

  useEffect(() => {
    if (!externalRouteFocusToken) {
      return;
    }

    const target = selectedFalla ?? activeRouteFalla;
    if (target) {
      lastAutoFitKey.current = `external:${target.id}:${externalRouteFocusToken}`;
      safeFlyTo(map, [target.lat, target.lng], map.getSize().x < 640 ? 15 : 16, { duration: 0.9 });
    }

    if (!(activeRouteFalla && userPosition)) {
      return;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, 'main', true));
      return;
    }

    safeFitBounds(map, [userPosition, [activeRouteFalla.lat, activeRouteFalla.lng]], getFitBoundsOptions(map, 'main', false));
  }, [activeRouteFalla, externalRouteFocusToken, map, routeGeometry, selectedFalla, userPosition]);

  useEffect(() => {
    if (!focusRouteToken || !(activeRouteFalla && userPosition)) {
      return;
    }

    if (guidanceMode) {
      const { center, zoom } = getGuidanceViewport(map, userPosition, 'docked');
      safeFlyTo(map, center, zoom, { duration: 0.85 });
      return;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      safeFitBounds(map, routeGeometry, getFitBoundsOptions(map, 'main', true));
      return;
    }

    safeFitBounds(map, [userPosition, [activeRouteFalla.lat, activeRouteFalla.lng]], getFitBoundsOptions(map, 'main', false));
  }, [activeRouteFalla, focusRouteToken, guidanceMode, map, routeGeometry, userPosition]);

  useEffect(() => {
    const target = selectedFalla ?? activeRouteFalla;
    if (focusSelectedToken && target) {
      map.flyTo([target.lat, target.lng], map.getSize().x < 640 ? 15 : 16, { duration: 0.9 });
    }
  }, [activeRouteFalla, focusSelectedToken, map, selectedFalla]);

  return null;
}

function MapInteractionBridge({
  onInteractionEnd,
  onInteractionStart,
}: {
  onInteractionEnd: () => void;
  onInteractionStart: () => void;
}) {
  useMapEvents({
    dragstart: onInteractionStart,
    dragend: onInteractionEnd,
    movestart: onInteractionStart,
    moveend: onInteractionEnd,
    zoomstart: onInteractionStart,
    zoomend: onInteractionEnd,
  });

  return null;
}

const FallaMarkerNode = React.memo(function FallaMarkerNode({
  falla,
  icon,
  onSelect,
}: {
  falla: Falla;
  icon: L.DivIcon;
  onSelect: (falla: Falla) => void;
}) {
  const markerPosition = useMemo<MapPoint>(() => (
    falla.category === 'Infantil'
      ? [falla.lat + INFANTIL_MARKER_VISUAL_OFFSET[0], falla.lng + INFANTIL_MARKER_VISUAL_OFFSET[1]]
      : [falla.lat, falla.lng]
  ), [falla.category, falla.lat, falla.lng]);

  return (
    <Marker
      position={markerPosition}
      icon={icon}
      eventHandlers={{ click: () => onSelect(falla) }}
    />
  );
});

const ClusterMarkerNode = React.memo(function ClusterMarkerNode({
  item,
  onFocus,
  onSelect,
}: {
  item: ClusteredMapItem;
  onFocus: (fallas: Falla[]) => void;
  onSelect: (falla: Falla) => void;
}) {
  const eventHandlers = useMemo(() => ({
    click: () => {
      const infantilFalla = item.fallas.find((falla) => falla.category === 'Infantil') ?? null;

      if (infantilFalla) {
        onSelect(infantilFalla);
        return;
      }

      onFocus(item.fallas);
    },
  }), [item.fallas, onFocus, onSelect]);

  return (
    <Marker
      position={[item.lat, item.lng]}
      icon={getCachedClusterIcon(item.fallas.length, item.hasPrize, item.allInfantil)}
      eventHandlers={eventHandlers}
    />
  );
});

interface FallaMapProps {
  isDarkMode: boolean;
  isAdmin?: boolean;
  isModalOpen?: boolean;
  variant?: 'default' | 'expanded';
  frameClassName?: string;
  mapHeightClassName?: string;
  chromeMode?: 'full' | 'minimal';
  heatmapEnabled?: boolean;
  setHeatmapEnabled?: (enabled: boolean) => void;
  fallasLiveModuleEnabled?: boolean;
  mapStyleId: MapStyleId;
  setMapStyleId: (value: MapStyleId) => void;
  mapSearchQuery: string;
  setMapSearchQuery: (value: string) => void;
  activeRouteFalla: Falla | null;
  activeRouteFallaId: string | null;
  setActiveRouteFallaId: React.Dispatch<React.SetStateAction<string | null>>;
  fallas: Falla[];
  routeFallas?: Falla[];
  selectedFalla: Falla | null;
  setSelectedFalla: (value: Falla | null) => void;
  userPosition: MapPoint | null;
  locationStatus: LocationStatus;
  requestLocation: () => Promise<MapPoint>;
  startLocationWatch: () => Promise<MapPoint>;
  stopLocationWatch: () => void;
  watchPositionId: number | null;
  favorites: string[];
  toggleFavorite: (id: string, event?: React.MouseEvent) => void;
  onShowDetail: (falla: Falla) => void;
  onPrepareRoute: (falla: Falla) => void;
  externalRouteFallaIds?: string[] | null;
  externalRouteWaypoints?: RouteWaypoint[] | null;
  externalRouteFocusToken?: number;
  onGuidanceActiveChange?: (active: boolean) => void;
  agendaEvents?: MapAgendaEvent[];
  selectedDate?: string;
  onOpenAgenda?: () => void;
}

function FallaMapComponent({
  isDarkMode,
  isAdmin = false,
  isModalOpen = false,
  variant = 'default',
  frameClassName,
  mapHeightClassName,
  chromeMode = 'full',
  heatmapEnabled,
  setHeatmapEnabled,
  fallasLiveModuleEnabled = true,
  mapStyleId,
  setMapStyleId,
  mapSearchQuery,
  setMapSearchQuery,
  activeRouteFalla,
  activeRouteFallaId,
  setActiveRouteFallaId,
  fallas,
  routeFallas = fallas,
  selectedFalla,
  setSelectedFalla,
  userPosition,
  locationStatus,
  requestLocation,
  startLocationWatch,
  stopLocationWatch,
  watchPositionId,
  favorites,
  toggleFavorite,
  onShowDetail,
  onPrepareRoute,
  externalRouteFallaIds = null,
  externalRouteWaypoints = null,
  externalRouteFocusToken = 0,
  onGuidanceActiveChange,
  agendaEvents = [],
  selectedDate = '',
  onOpenAgenda,
}: FallaMapProps) {
  const [focusUserToken, setFocusUserToken] = useState(0);
  const [focusRouteToken, setFocusRouteToken] = useState(0);
  const [focusSelectedToken, setFocusSelectedToken] = useState(0);
  const [focusClusterToken, setFocusClusterToken] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapControlsExpanded, setIsMapControlsExpanded] = useState<boolean>(() => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false));
  const [trafficLayerActive, setTrafficLayerActive] = useState(false);
  const [isHeatmapEnabledInternal, setIsHeatmapEnabledInternal] = useState(false);
  const [isFallasLiveVisible, setIsFallasLiveVisible] = useState(true);
  const [activeFloatingPanel, setActiveFloatingPanel] = useState<MapFloatingPanel>(null);
  const [incidentsVisible, setIncidentsVisible] = useState(false);
  const [userLocationActive, setUserLocationActive] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [mapFloatingToast, setMapFloatingToast] = useState<string | null>(null);
  const [isAgendaPreviewDismissed, setIsAgendaPreviewDismissed] = useState(false);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [routePlannerStopIds, setRoutePlannerStopIds] = useState<string[]>(['']);
  const [mapLayerVisibility, setMapLayerVisibility] = useState<MapLayerVisibility>({
    principals: true,
    infantils: true,
    events: false,
    streetClosures: false,
    parking: false,
    restrooms: false,
    foodAndDrink: false,
    publicTransport: false,
    favorites: false,
  });
  const [selectedFacility, setSelectedFacility] = useState<SelectedFacility>(null);
  const [officialMetroStations, setOfficialMetroStations] = useState<OfficialMetroStation[]>(() => officialMetroStationsCache ?? []);
  const [officialRestrooms, setOfficialRestrooms] = useState<OfficialRestroom[]>(() => officialRestroomsCache ?? []);
  const [hasActivatedHeatmap, setHasActivatedHeatmap] = useState(false);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRange>('1h');
  const [heatmapPayload, setHeatmapPayload] = useState<HeatmapPayloadState>({
    heatPoints: [],
    highlights: emptyHeatHighlights(),
    topFallaIds: [],
    updatedAt: null,
  });
  const [clusterFocusFallas, setClusterFocusFallas] = useState<Falla[] | null>(null);
  const [customRouteWaypoints, setCustomRouteWaypoints] = useState<RouteWaypoint[] | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeDataKey, setRouteDataKey] = useState<string | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('walking');
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [pendingGuidanceStart, setPendingGuidanceStart] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState<MapPoint | null>(null);
  const [routeCalculationOrigin, setRouteCalculationOrigin] = useState<MapPoint | null>(null);
  const [viewportState, setViewportState] = useState<MapViewportState | null>(null);
  const lastRerouteAtRef = useRef(0);
  const lastExternalRouteRequestRef = useRef(0);
  const interactionTimerRef = useRef<number | null>(null);
  const floatingToastTimerRef = useRef<number | null>(null);
  const activeTheme = useMemo(() => getMapTheme(mapStyleId), [mapStyleId]);
  const isDarkTheme = isDarkMode || activeTheme.id !== 'city';
  const useReferenceLightStyling = activeTheme.id === 'city' && !isDarkMode;
  const isMinimalChrome = chromeMode === 'minimal';
  const isHeatmapEnabled = heatmapEnabled ?? isHeatmapEnabledInternal;
  const isNavigationSceneActive = Boolean(activeRouteFalla);
  const shouldShowFallasLive = fallasLiveModuleEnabled && isFallasLiveVisible && !isNavigationSceneActive;
  const commitHeatmapEnabled = setHeatmapEnabled ?? setIsHeatmapEnabledInternal;
  const deferredMapSearchQuery = useDeferredValue(mapSearchQuery);
  const routeDestination = useMemo<MapPoint | null>(
    () => (activeRouteFalla ? [activeRouteFalla.lat, activeRouteFalla.lng] as MapPoint : null),
    [activeRouteFalla]
  );
  const defaultRouteWaypoints = useMemo<RouteWaypoint[] | null>(
    () => {
      const origin = routeOrigin ?? routeCalculationOrigin ?? userPosition;
      return activeRouteFalla && origin
      ? [
          { lat: origin[0], lng: origin[1], nombre: 'Tu ubicacion' },
          fallaToRouteWaypoint(activeRouteFalla),
        ]
      : null;
    },
    [activeRouteFalla, routeCalculationOrigin, routeOrigin, userPosition]
  );
  const activeRouteWaypoints = customRouteWaypoints ?? defaultRouteWaypoints;
  const isRouteActive = Boolean(activeRouteWaypoints && activeRouteWaypoints.length >= 2);
  const routeRequestKey = routeWaypointsKey(activeRouteWaypoints, routeProfile);
  const routeGeometry = isRouteActive ? routeData?.geometry ?? null : null;
  const routeWaypointMarkers = useMemo(() => {
    if (!activeRouteWaypoints || activeRouteWaypoints.length < 2) {
      return [];
    }

    return activeRouteWaypoints.map((waypoint, index) => {
      const isFirst = index === 0;
      const isLast = index === activeRouteWaypoints.length - 1;
      return {
        key: `${index}:${waypoint.lat.toFixed(5)}:${waypoint.lng.toFixed(5)}`,
        label: isFirst ? 'T' : String(index),
        kind: isFirst ? 'start' as const : isLast ? 'end' as const : 'stop' as const,
        name: waypoint.nombre || (isFirst ? 'Tu ubicacion' : `Parada ${index}`),
        position: [waypoint.lat, waypoint.lng] as MapPoint,
      };
    });
  }, [activeRouteWaypoints]);
  const remainingDistanceMeters = useMemo(
    () => (userPosition ? remainingRouteDistanceMeters(userPosition, routeGeometry, routeDestination) : null),
    [routeDestination, routeGeometry, userPosition]
  );
  const remainingDurationSeconds = useMemo(
    () => estimateWalkingDurationSeconds(remainingDistanceMeters),
    [remainingDistanceMeters]
  );
  const distanceLabel = useMemo(() => (routeData ? formatDistance(routeData.distanceMeters) : null), [routeData]);
  const durationLabel = useMemo(() => (routeData ? formatDuration(routeData.durationSeconds) : null), [routeData]);
  const googleMapsUrl = useMemo(
    () => (routeDestination ? buildGoogleMapsDirectionsUrl(routeDestination, userPosition, routeProfile) : '#'),
    [routeDestination, routeProfile, userPosition]
  );
  const fallasLiveHeatPoints = useMemo<DashboardHeatPoint[]>(() => (
    FALLAS_LIVE_POINTS.flatMap((point) => [
      { lat: point.lat, lng: point.lng, intensity: point.intensity },
      { lat: point.lat + 0.0012, lng: point.lng + 0.0009, intensity: point.intensity * 0.54 },
      { lat: point.lat - 0.001, lng: point.lng - 0.0008, intensity: point.intensity * 0.48 },
    ])
  ), []);
  const routeKey = activeRouteFalla ? `${activeRouteFalla.id}:${routeProfile}` : 'none';
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
    destination: routeDestination,
    isRouteActive,
    routeKey,
  });
  const navigationDistanceLabel = isGuidanceActive && remainingDistanceMeters !== null
    ? formatDistance(remainingDistanceMeters)
    : distanceLabel;
  const navigationDurationLabel = isGuidanceActive && remainingDurationSeconds !== null
    ? formatDuration(remainingDurationSeconds)
    : durationLabel;
  const isRoutePreviewVisible = Boolean(activeRouteFalla && !isGuidanceActive);
  const shouldRenderHeatmap = isHeatmapEnabled && !isNavigationSceneActive;
  const smoothUserPosition = useSmoothMapPoint(userPosition);
  const displayedUserPosition = isNavigationSceneActive ? userPosition : smoothUserPosition;
  const isNavigationTrackingActive = watchPositionId !== null;
  const isControlsVisible = false;
  const setIsControlsVisible = (_value: boolean | ((current: boolean) => boolean)) => undefined;
  const activeControlInfo: (typeof mapControlInfo)[keyof typeof mapControlInfo] | null = null;
  const mapLayersPanelOpen = activeFloatingPanel === 'layers';
  const isBottomSheetOpen = activeFloatingPanel !== null;
  const isDetailCardOpen = Boolean(selectedFalla);
  const isNavigationActive = isNavigationSceneActive || isGuidanceActive || isRoutePreviewVisible;
  const showParkingOverlay = trafficLayerActive || mapLayerVisibility.parking;
  const showStreetClosuresOverlay = incidentsVisible || mapLayerVisibility.streetClosures;
  const routePlannerOptions = useMemo(
    () => [...routeFallas]
      .filter((falla) => Number.isFinite(falla.lat) && Number.isFinite(falla.lng))
      .sort((left, right) => left.name.localeCompare(right.name, 'es')),
    [routeFallas]
  );
  const mapUpcomingAgendaEvents = useMemo(() => {
    if (agendaEvents.length === 0) {
      return [];
    }

    const dayEvents = selectedDate
      ? agendaEvents.filter((event) => event.date === selectedDate)
      : agendaEvents;
    const sortedEvents = dayEvents
      .slice()
      .sort((left, right) => agendaEventSortValue(left) - agendaEventSortValue(right));

    return sortedEvents.slice(0, 3);
  }, [agendaEvents, selectedDate]);
  const routePinnedFallaIds = useMemo(() => {
    if (!customRouteWaypoints || customRouteWaypoints.length < 2) {
      return new Set<string>();
    }

    return new Set(
      routeFallas
        .filter((falla) => customRouteWaypoints.some((waypoint) => matchesRouteWaypointFalla(falla, waypoint)))
        .map((falla) => falla.id)
    );
  }, [customRouteWaypoints, routeFallas]);

  const showMapFloatingToast = useCallback((message: string) => {
    if (floatingToastTimerRef.current !== null) {
      window.clearTimeout(floatingToastTimerRef.current);
    }

    setMapFloatingToast(message);
    floatingToastTimerRef.current = window.setTimeout(() => {
      setMapFloatingToast(null);
      floatingToastTimerRef.current = null;
    }, 2800);
  }, []);

  const closeFloatingPanel = useCallback(() => {
    setActiveFloatingPanel((current) => {
      if (current === 'traffic') {
        setTrafficLayerActive(false);
        setMapLayerVisibility((layers) => ({
          ...layers,
          parking: false,
        }));
      }

      if (current === 'incidents') {
        setIncidentsVisible(false);
        setMapLayerVisibility((layers) => ({
          ...layers,
          streetClosures: false,
        }));
      }

      return null;
    });
  }, []);
  const hideControlInfo = useCallback(() => undefined, []);
  const showControlInfo = useCallback((_controlKey: keyof typeof mapControlInfo) => undefined, []);

  const markMapInteractionStart = useCallback(() => {
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    }

    setIsMapInteracting(true);
  }, []);

  const markMapInteractionEnd = useCallback(() => {
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
    }

    interactionTimerRef.current = window.setTimeout(() => {
      setIsMapInteracting(false);
      interactionTimerRef.current = null;
    }, 1400);
  }, []);

  useEffect(() => () => {
    if (interactionTimerRef.current !== null) {
      window.clearTimeout(interactionTimerRef.current);
    }

    if (floatingToastTimerRef.current !== null) {
      window.clearTimeout(floatingToastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setIsAgendaPreviewDismissed(false);
  }, [selectedDate]);

  useEffect(() => {
    if (!mapLayerVisibility.publicTransport && !mapLayerVisibility.restrooms) {
      return;
    }

    let cancelled = false;

    void Promise.all([
      mapLayerVisibility.publicTransport ? fetchOfficialMetroStations() : Promise.resolve(officialMetroStationsCache ?? officialMetroStations),
      mapLayerVisibility.restrooms ? fetchOfficialRestrooms() : Promise.resolve(officialRestroomsCache ?? officialRestrooms),
    ])
      .then(([metroStations, restrooms]) => {
        if (cancelled) {
          return;
        }

        setOfficialMetroStations(metroStations);
        setOfficialRestrooms(restrooms);
      })
      .catch((error: unknown) => {
        console.error('No se pudieron cargar las capas oficiales de transporte y baños:', error);
        if (cancelled) {
          return;
        }

        setOfficialMetroStations([]);
        setOfficialRestrooms([]);
      });

    return () => {
      cancelled = true;
    };
  }, [mapLayerVisibility.publicTransport, mapLayerVisibility.restrooms]);

  useEffect(() => {
    if (!isRouteActive) {
      setRouteData(null);
      setRouteDataKey(null);
      setRouteError(null);
      setIsRouteLoading(false);
    }
  }, [isRouteActive, routeRequestKey]);

  useEffect(() => {
    if (!isRouteActive || !activeRouteWaypoints || !routeRequestKey) {
      return;
    }

    let cancelled = false;
    const cachedRoute = getCachedRoute(routeRequestKey);

    if (cachedRoute) {
      setRouteData(cachedRoute);
      setRouteDataKey(routeRequestKey);
      setRouteError(null);
      setIsRouteLoading(false);
      return;
    }

    setIsRouteLoading(true);
    setRouteError(null);
    setRouteData((current) => (routeDataKey === routeRequestKey ? current : null));
    setRouteDataKey((current) => (current === routeRequestKey ? current : null));

    const routeWaypointsSnapshot = activeRouteWaypoints.map((waypoint) => ({ ...waypoint }));
    void fetchCachedRoute(
      routeRequestKey,
      () => fetchRouteForWaypoints(routeWaypointsSnapshot, routeProfile)
    )
      .then((nextRoute) => {
        if (cancelled) {
          return;
        }

        setRouteData(nextRoute);
        setRouteDataKey(routeRequestKey);
        setRouteError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        console.error('Error calculando o pintando la ruta:', error);
        setRouteData(null);
        setRouteDataKey(null);
        setRouteError('No se ha podido calcular la ruta. Intentalo de nuevo.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsRouteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isRouteActive, routeProfile, routeRequestKey]);

  useEffect(() => {
    onGuidanceActiveChange?.(isGuidanceActive);
  }, [isGuidanceActive, onGuidanceActiveChange]);

  useEffect(() => () => {
    onGuidanceActiveChange?.(false);
  }, [onGuidanceActiveChange]);

  useEffect(() => {
    if (isHeatmapEnabled) {
      setHasActivatedHeatmap(true);
    }
  }, [isHeatmapEnabled]);

  useEffect(() => {
    if (!(isNavigationActive || isModalOpen)) {
      return;
    }

    setIsMapControlsExpanded(false);
    setActiveFloatingPanel(null);
  }, [isModalOpen, isNavigationActive]);

  useEffect(() => {
    if (!userLocationActive) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setUserLocationActive(false);
    }, 2200);

    return () => window.clearTimeout(timerId);
  }, [userLocationActive]);

  useEffect(() => {
    if (!activeRouteFalla) {
      setPendingGuidanceStart(false);
      setShowLocationHelp(false);
      setCustomRouteWaypoints(null);
      setRouteOrigin(null);
      setRouteCalculationOrigin(null);
      stopLocationWatch();
      return;
    }

    setRouteProfile('walking');
    setRouteOrigin(null);
    setRouteCalculationOrigin(userPosition);
    lastRerouteAtRef.current = 0;
    setShowLocationHelp(false);
    setPendingGuidanceStart(false);
  }, [activeRouteFalla?.id, stopLocationWatch]);

  useEffect(() => {
    if (!activeRouteFalla || routeOrigin || !userPosition) {
      return;
    }

    // Map performance: route requests are expensive, so only refresh the origin after enough real movement.
    setRouteCalculationOrigin((currentOrigin) => {
      if (!currentOrigin || distanceBetweenPoints(currentOrigin, userPosition) >= ROUTE_RECALCULATE_DISTANCE_METERS) {
        return userPosition;
      }

      return currentOrigin;
    });
  }, [activeRouteFalla, routeOrigin, userPosition]);

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

  useEffect(() => {
    if (!isGuidanceActive || !userPosition || !routeGeometry || routeGeometry.length < 2 || routeError || isRouteLoading) {
      return;
    }

    const distanceFromRoute = distanceToRouteMeters(userPosition, routeGeometry);
    if (distanceFromRoute === null || distanceFromRoute <= NAVIGATION_OFF_ROUTE_METERS) {
      return;
    }

    const now = Date.now();
    if (now - lastRerouteAtRef.current < NAVIGATION_REROUTE_COOLDOWN_MS) {
      return;
    }

    lastRerouteAtRef.current = now;
    setRouteOrigin(userPosition);
    setRouteCalculationOrigin(userPosition);
    setCustomRouteWaypoints(null);
    setRouteData(null);
    setRouteDataKey(null);
    setRouteError(null);
    setIsRouteLoading(true);
    setPendingGuidanceStart(true);
    stopGuidance();
  }, [isGuidanceActive, isRouteLoading, routeError, routeGeometry, stopGuidance, userPosition]);

  useEffect(() => {
    if (!isGuidanceActive || !hasReachedDestination) {
      return;
    }

    setPendingGuidanceStart(false);
    stopLocationWatch();
  }, [hasReachedDestination, isGuidanceActive, stopLocationWatch]);

  useEffect(() => {
    if (!activeRouteFalla) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingGuidanceStart(false);
        stopGuidance();
        stopLocationWatch();
        setShowLocationHelp(false);
        setClusterFocusFallas(null);
        setSelectedFalla(null);
        setActiveRouteFallaId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRouteFalla, setActiveRouteFallaId, setSelectedFalla, stopGuidance, stopLocationWatch]);
  const normalizedMapSearch = normalizeFallaSearchQuery(deferredMapSearchQuery);
  const filteredByLayersFallas = useMemo(() => {
    const favoritesSet = new Set(favorites);

    return fallas.filter((falla) => {
      const isInfantil = falla.category === 'Infantil' || falla.section.toLowerCase().includes('infantil');
      const isPrincipal = !isInfantil;

      if ((isPrincipal && !mapLayerVisibility.principals) || (isInfantil && !mapLayerVisibility.infantils)) {
        return false;
      }

      if (mapLayerVisibility.favorites && !favoritesSet.has(falla.id)) {
        return false;
      }

      return true;
    });
  }, [fallas, favorites, mapLayerVisibility.favorites, mapLayerVisibility.infantils, mapLayerVisibility.principals]);
  const visibleFallas = useMemo(() => {
    if (!normalizedMapSearch) {
      return filteredByLayersFallas;
    }

    return filteredByLayersFallas.filter((falla) => fallaMatchesSearch(falla, normalizedMapSearch));
  }, [filteredByLayersFallas, normalizedMapSearch]);
  const visibleFallaPoints = useMemo(
    () => visibleFallas.map((falla) => [falla.lat, falla.lng] as MapPoint),
    [visibleFallas]
  );
  const nearbyOfficialMetroStations = useMemo(
    () => officialMetroStations.filter((station) => (
      isPointNearCenterOrFallas([station.lat, station.lng], visibleFallaPoints, METRO_NEAR_FALLA_RADIUS_METERS)
    )),
    [officialMetroStations, visibleFallaPoints]
  );
  const nearbyOfficialRestrooms = useMemo(
    () => officialRestrooms.filter((restroom) => (
      isPointNearCenterOrFallas([restroom.lat, restroom.lng], visibleFallaPoints, RESTROOM_NEAR_FALLA_RADIUS_METERS)
    )),
    [officialRestrooms, visibleFallaPoints]
  );
  const displayedFallas = useMemo(() => {
    if (activeRouteFalla) {
      return [activeRouteFalla];
    }

    const items = [...visibleFallas];

    if (selectedFalla && !items.some((item) => item.id === selectedFalla.id)) {
      items.unshift(selectedFalla);
    }

    if (activeRouteFalla && !items.some((item) => item.id === activeRouteFalla.id)) {
      items.unshift(activeRouteFalla);
    }

    return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
  }, [activeRouteFalla, selectedFalla, visibleFallas]);
  const heatmapDemoFocusFalla = useMemo(
    () => displayedFallas.find(isHeatmapDemoTarget) ?? visibleFallas.find(isHeatmapDemoTarget) ?? fallas.find(isHeatmapDemoTarget) ?? null,
    [displayedFallas, fallas, visibleFallas]
  );
  const effectiveHeatmap = useMemo<EffectiveHeatmapState>(() => {
    if (!shouldRenderHeatmap) {
      return {
        heatPoints: [],
        highlights: emptyHeatHighlights(),
        topFallaIds: [],
        updatedAt: null,
        source: 'empty',
      };
    }

    if (heatmapPayload.heatPoints.length > 0) {
      return {
        ...heatmapPayload,
        source: 'live',
      };
    }

    const previewPayload = buildPreviewHeatmapPayload({
      activeRouteFalla,
      demoFocusFalla: heatmapDemoFocusFalla,
      fallas: displayedFallas,
      favorites,
      selectedFalla,
      userPosition,
    });

    if (previewPayload.heatPoints.length === 0) {
      return {
        ...previewPayload,
        source: 'empty',
      };
    }

    return {
      ...previewPayload,
      source: 'preview',
    };
  }, [activeRouteFalla, displayedFallas, favorites, heatmapDemoFocusFalla, heatmapPayload, selectedFalla, shouldRenderHeatmap, userPosition]);
  const trendingFallaIdSet = useMemo(() => new Set(effectiveHeatmap.topFallaIds), [effectiveHeatmap.topFallaIds]);
  const heatmapUpdatedLabel = useMemo(
    () => (effectiveHeatmap.source === 'live' ? formatHeatTimestamp(effectiveHeatmap.updatedAt) : null),
    [effectiveHeatmap.source, effectiveHeatmap.updatedAt]
  );
  const heatmapSummary = effectiveHeatmap.highlights;
  const heatmapStatusLabel = useMemo(() => {
    if (!shouldRenderHeatmap) {
      return null;
    }

    if (isHeatmapLoading) {
      return effectiveHeatmap.source === 'preview' ? 'Demo actualizando' : 'Actualizando calor';
    }

    if (effectiveHeatmap.source === 'preview') {
      return heatmapDemoFocusFalla ? `Vista demo · ${heatmapDemoFocusFalla.name}` : 'Vista demo';
    }

    if (heatmapUpdatedLabel) {
      return `Heat ${heatmapUpdatedLabel}`;
    }

    return null;
  }, [effectiveHeatmap.source, heatmapDemoFocusFalla, heatmapUpdatedLabel, isHeatmapLoading, shouldRenderHeatmap]);
  const heatmapSaturatedZoneLabel = useMemo(
    () => heatmapSummary.topNeighborhood?.name || heatmapSummary.hottestZoneLabel || heatmapSummary.topFalla?.name || 'Sin saturacion detectada',
    [heatmapSummary.hottestZoneLabel, heatmapSummary.topFalla?.name, heatmapSummary.topNeighborhood?.name]
  );
  const heatmapAlternativeRouteLabel = useMemo(() => {
    const crowdedZone = heatmapSummary.topNeighborhood?.name || heatmapSummary.hottestZoneLabel;

    if (activeRouteFalla) {
      return crowdedZone
        ? `Evita ${crowdedZone} y entra por calles laterales hacia ${activeRouteFalla.neighborhood || activeRouteFalla.name}.`
        : `Prioriza accesos laterales hacia ${activeRouteFalla.neighborhood || activeRouteFalla.name}.`;
    }

    if (selectedFalla) {
      return crowdedZone
        ? `Evita ${crowdedZone} y prepara una ruta alternativa hacia ${selectedFalla.neighborhood || selectedFalla.name}.`
        : `Prepara una ruta alternativa antes de acercarte a ${selectedFalla.neighborhood || selectedFalla.name}.`;
    }

    return crowdedZone
      ? `Evita ${crowdedZone} si quieres moverte mas rapido.`
      : 'Selecciona una falla para recomendarte una ruta alternativa.';
  }, [activeRouteFalla, heatmapSummary.hottestZoneLabel, heatmapSummary.topNeighborhood?.name, selectedFalla]);
  const handleToggleLayerVisibility = useCallback((layerKey: string) => {
    setMapLayerVisibility((current) => {
      const nextValue = !current[layerKey as keyof MapLayerVisibility];

      if (layerKey === 'parking') {
        setTrafficLayerActive(nextValue);
        showMapFloatingToast(nextValue ? 'Mostrando parkings disponibles' : 'Parkings ocultos');
      }

      if (layerKey === 'streetClosures') {
        setIncidentsVisible(nextValue);
        showMapFloatingToast(nextValue ? 'Mostrando calles cortadas' : 'Calles cortadas ocultas');
      }

      if (layerKey === 'restrooms') {
        showMapFloatingToast(nextValue ? 'Mostrando banos publicos' : 'Banos publicos ocultos');
      }

      if (layerKey === 'publicTransport') {
        showMapFloatingToast(nextValue ? 'Mostrando transporte publico' : 'Transporte publico oculto');
      }

      return {
        ...current,
        [layerKey]: nextValue,
      };
    });
  }, [showMapFloatingToast]);
  const floatingLayerOptions = useMemo(() => ([
    {
      key: 'principals',
      label: 'Fallas principales',
      description: 'Muestra monumentos principales y destacados.',
      checked: mapLayerVisibility.principals,
    },
    {
      key: 'infantils',
      label: 'Fallas infantiles',
      description: 'Activa la capa de monumentos infantiles.',
      checked: mapLayerVisibility.infantils,
    },
    {
      key: 'restrooms',
      label: 'Baños publicos',
      description: 'Datos oficiales del Ayuntamiento sobre urinarios y cabinas publicas.',
      checked: mapLayerVisibility.restrooms,
    },
    {
      key: 'publicTransport',
      label: 'Transporte publico',
      description: 'Datos oficiales de FGV para estaciones de Metrovalencia.',
      checked: mapLayerVisibility.publicTransport,
    },
    {
      key: 'streetClosures',
      label: 'Cortes de calles',
      description: 'Muestra cortes activos y desvios recomendados.',
      checked: mapLayerVisibility.streetClosures,
    },
    {
      key: 'parking',
      label: 'Parking',
      description: 'Visualiza parkings de acceso perimetral durante Fallas.',
      checked: mapLayerVisibility.parking,
    },
    {
      key: 'foodAndDrink',
      label: 'Comida y bebida',
      description: 'Reservado para la capa de marketplace local.',
      checked: mapLayerVisibility.foodAndDrink,
      disabled: true,
    },
    {
      key: 'events',
      label: 'Eventos',
      description: 'Preparado para la agenda geolocalizada.',
      checked: mapLayerVisibility.events,
      disabled: true,
    },
    {
      key: 'favorites',
      label: 'Favoritos',
      description: 'Filtra el mapa para quedarte solo con tus guardadas.',
      checked: mapLayerVisibility.favorites,
    },
  ]), [mapLayerVisibility]);
  const floatingTrafficItems = useMemo(() => ([
    {
      id: 'traffic-parking',
      label: 'Parkings accesibles',
      tone: 'brand' as const,
      value: `${FALLAS_PARKINGS.length} accesos perimetrales recomendados.`,
    },
    {
      id: 'traffic-access',
      label: 'Acceso recomendado',
      tone: 'brand' as const,
      value: heatmapAlternativeRouteLabel,
    },
    {
      id: 'traffic-crowd',
      label: 'Zona sensible',
      tone: 'danger' as const,
      value: heatmapSaturatedZoneLabel,
    },
    {
      id: 'traffic-live',
      label: 'Estado actual',
      tone: 'neutral' as const,
      value: shouldShowFallasLive ? 'Mostrando parkings accesibles pese a cortes del centro.' : 'Activa Fallas Live para enriquecer los accesos cercanos.',
    },
  ]), [heatmapAlternativeRouteLabel, heatmapSaturatedZoneLabel, shouldShowFallasLive]);
  const floatingIncidentItems = useMemo(() => (
    FALLAS_STREET_CLOSURES.map((closure, index) => ({
      id: closure.id,
      label: index === 0 ? 'Corte principal' : 'Desvio activo',
      tone: 'danger' as const,
      value: `${closure.name} · ${closure.note}`,
    }))
  ), []);
  const userPositionCircleStyle = useMemo(
    () => (useReferenceLightStyling
      ? { color: '#0f172a', fillColor: '#ffffff', fillOpacity: 0.18, opacity: 0.18, weight: 1.2 }
      : { color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.1, opacity: 0.55, weight: 1.4 }),
    [useReferenceLightStyling]
  );
  const selectedDistanceMeters = useMemo(() => {
    if (!(selectedFalla && userPosition)) {
      return null;
    }

    return distanceBetweenPoints(userPosition, [selectedFalla.lat, selectedFalla.lng]);
  }, [selectedFalla, userPosition]);
  const selectedDistanceLabel = useMemo(
    () => (typeof selectedDistanceMeters === 'number' ? formatDistance(selectedDistanceMeters) : 'Sin GPS'),
    [selectedDistanceMeters]
  );
  const selectedEtaLabel = useMemo(() => formatWalkingEta(selectedDistanceMeters), [selectedDistanceMeters]);
  const selectedActivityLabel = useMemo(() => {
    if (!selectedFalla || !shouldRenderHeatmap) {
      return 'Sin dato';
    }

    if (effectiveHeatmap.source === 'preview') {
      return trendingFallaIdSet.has(selectedFalla.id) ? 'Alta demo' : 'Estable demo';
    }

    return trendingFallaIdSet.has(selectedFalla.id) ? 'Alta' : 'Estable';
  }, [effectiveHeatmap.source, selectedFalla, shouldRenderHeatmap, trendingFallaIdSet]);
  const selectedLocationLabel = useMemo(
    () => (selectedFalla ? selectedFalla.address || `${selectedFalla.neighborhood}, Valencia` : ''),
    [selectedFalla]
  );
  const selectedArtistLabel = useMemo(
    () => (selectedFalla ? selectedFalla.artist || 'Artista pendiente' : ''),
    [selectedFalla]
  );
  const selectedCommissionLabel = useMemo(
    () => (selectedFalla ? selectedFalla.commissionName || selectedFalla.name : ''),
    [selectedFalla]
  );
  const selectedHeroLabel = useMemo(() => {
    if (!selectedFalla) {
      return 'Ficha rapida';
    }

    if (selectedFalla.prize) {
      return 'Falla premiada';
    }

    return selectedActivityLabel !== 'Sin dato' ? 'Mapa en vivo' : 'Ficha rapida';
  }, [selectedActivityLabel, selectedFalla]);
  const selectedSummaryCopy = useMemo(() => {
    if (!selectedFalla) {
      return '';
    }

    const description = selectedFalla.description.trim();
    if (description) {
      return description;
    }

    return `${selectedFalla.name} ya esta disponible en el mapa con acceso directo a su ubicacion, detalle y ruta.`;
  }, [selectedFalla]);
  const selectedMetaChips = useMemo(() => {
    if (!selectedFalla) {
      return [];
    }

    return [
      selectedFalla.section,
      selectedFalla.category,
      selectedFalla.prize ? `#${selectedFalla.prize} premio` : selectedFalla.year || null,
    ].filter((value): value is string => Boolean(value && value.trim()));
  }, [selectedFalla]);
  const selectedStatusNote = useMemo(() => {
    if (!selectedFalla) {
      return '';
    }

    const socialLabel = selectedFalla.favoritesCount && selectedFalla.favoritesCount > 0
      ? `${formatCompactMetric(selectedFalla.favoritesCount)} guardados`
      : selectedFalla.likes > 0
        ? `${formatCompactMetric(selectedFalla.likes)} likes`
        : 'Sin seguimiento social';
    const eventsLabel = selectedFalla.eventsCount && selectedFalla.eventsCount > 0
      ? `${selectedFalla.eventsCount} actos vinculados`
      : 'Sin actos vinculados';
    const activityLabel = selectedActivityLabel !== 'Sin dato' ? `Actividad ${selectedActivityLabel.toLowerCase()}` : null;

    return [socialLabel, eventsLabel, activityLabel].filter(Boolean).join(' | ');
  }, [selectedActivityLabel, selectedFalla]);
  const routeStatusCopy = useMemo(() => {
    if (routeError) {
      return routeError;
    }

    if (isRouteLoading) {
      return routeProfile === 'driving'
        ? 'Calculando el mejor recorrido en coche por calles reales...'
        : 'Calculando el mejor recorrido a pie por calles reales...';
    }

    if (distanceLabel && durationLabel) {
      return isNavigationTrackingActive
        ? `${distanceLabel} | ${durationLabel} | GPS en tiempo real`
        : `${distanceLabel} | ${durationLabel}`;
    }

    if (locationStatus === 'ready') {
      return 'GPS activo. Preparando indicaciones.';
    }

    if (locationStatus === 'loading') {
      return 'Buscando tu ubicacion actual.';
    }

    if (locationStatus === 'blocked') {
      return 'Activa el permiso de ubicacion para calcular la ruta.';
    }

    return 'La ruta necesita acceder a tu ubicacion.';
  }, [distanceLabel, durationLabel, isNavigationTrackingActive, isRouteLoading, locationStatus, routeError, routeProfile]);
  const canShowUpcomingAgendaOverlay = mapUpcomingAgendaEvents.length > 0 && !selectedFalla && !selectedFacility && !routePlannerOpen && !isNavigationSceneActive;
  const shouldShowUpcomingAgendaOverlay = canShowUpcomingAgendaOverlay && !isAgendaPreviewDismissed;
  const upcomingAgendaOverlay = shouldShowUpcomingAgendaOverlay ? (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.05rem)] z-[1320] sm:bottom-5 sm:left-5 sm:right-auto sm:w-[20rem]">
      <motion.aside
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto overflow-hidden rounded-t-[1.45rem] border-t border-white bg-white/98 text-slate-950 shadow-[0_-18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:rounded-[1.45rem] sm:border"
      >
        <div className="flex items-center justify-between gap-3 px-3.5 pb-1.5 pt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-tight text-slate-950">Proximos eventos</p>
            <p className="mt-0.5 text-[9px] font-bold text-slate-400">Eventos del dia</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onOpenAgenda ? (
              <button
                type="button"
                onClick={onOpenAgenda}
                className="rounded-full px-2 py-1 text-[10px] font-black text-brand transition-colors hover:bg-[#fff1e8]"
              >
                Ver todos
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsAgendaPreviewDismissed(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
              aria-label="Ocultar proximos eventos"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="px-2.5 pb-2">
          {mapUpcomingAgendaEvents.map((event, index) => (
            <button
              key={`map-agenda-${event.id}`}
              type="button"
              onClick={() => onOpenAgenda?.()}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[1rem] px-2.5 py-2 text-left transition-colors hover:bg-orange-50/70',
                index > 0 ? 'border-t border-slate-100' : ''
              )}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1e8] text-brand">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-black leading-4 text-slate-950">{event.title}</span>
                <span className="block truncate text-[9.5px] font-bold leading-3 text-slate-400">
                  {event.time} · {event.location}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[9px] font-black text-slate-400">
                {formatMapAgendaDistance(index)}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </motion.aside>
    </div>
  ) : canShowUpcomingAgendaOverlay && isAgendaPreviewDismissed ? (
    <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5.05rem)] left-3 z-[1320] sm:bottom-5 sm:left-5">
      <motion.button
        type="button"
        initial={{ opacity: 0, x: -10, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        onClick={() => setIsAgendaPreviewDismissed(false)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white bg-white/96 px-3 py-2 text-[10px] font-black text-slate-950 shadow-[0_16px_38px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        aria-label="Mostrar proximos eventos"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#fff1e8] text-brand">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span>Eventos</span>
        <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8px] text-white">{mapUpcomingAgendaEvents.length}</span>
      </motion.button>
    </div>
  ) : null;
  const handleViewportChange = useCallback((nextState: MapViewportState) => {
    const normalizedNextState = normalizeViewportStateForRender(nextState);

    setViewportState((current) => {
      if (
        current
        && current.zoom === normalizedNextState.zoom
        && current.minX === normalizedNextState.minX
        && current.minY === normalizedNextState.minY
        && current.maxX === normalizedNextState.maxX
        && current.maxY === normalizedNextState.maxY
      ) {
        return current;
      }

      return normalizedNextState;
    });
  }, []);
  const cancelRouteMode = useCallback(() => {
    setPendingGuidanceStart(false);
    stopGuidance();
    stopLocationWatch();
    setShowLocationHelp(false);
    setClusterFocusFallas(null);
    setCustomRouteWaypoints(null);
    setRouteOrigin(null);
    setRouteCalculationOrigin(null);
    setRouteData(null);
    setRouteDataKey(null);
    setRouteError(null);
    setIsRouteLoading(false);
    setSelectedFalla(null);
    setActiveRouteFallaId(null);
  }, [setActiveRouteFallaId, setSelectedFalla, stopGuidance, stopLocationWatch]);
  const handleMarkerSelect = useCallback((falla: Falla) => {
    setClusterFocusFallas(null);
    setSelectedFalla(falla);
    setActiveRouteFallaId((current) => (current === falla.id ? current : null));
    setFocusSelectedToken((current) => current + 1);
    trackActivityEvent({
      eventType: 'marker_open',
      fallaId: falla.id,
      latitude: falla.lat,
      longitude: falla.lng,
    });
  }, [setActiveRouteFallaId, setSelectedFalla]);
  const handleClusterFocus = useCallback((clusterFallas: Falla[]) => {
    setClusterFocusFallas(clusterFallas);
    setFocusClusterToken((current) => current + 1);
  }, []);
  const handleShowDetail = useCallback((falla: Falla) => {
    trackActivityEvent({
      eventType: 'detail_open',
      fallaId: falla.id,
      latitude: falla.lat,
      longitude: falla.lng,
    });
    onShowDetail(falla);
  }, [onShowDetail]);
  const handlePrepareRoute = useCallback((falla: Falla) => {
    setCustomRouteWaypoints(null);
    trackActivityEvent({
      eventType: 'route_prepare',
      fallaId: falla.id,
      latitude: falla.lat,
      longitude: falla.lng,
    });
    onPrepareRoute(falla);
  }, [onPrepareRoute]);
  const updateRoutePlannerStop = useCallback((index: number, fallaId: string) => {
    setRoutePlannerStopIds((current) => current.map((id, currentIndex) => (currentIndex === index ? fallaId : id)));
  }, []);
  const addRoutePlannerStop = useCallback(() => {
    setRoutePlannerStopIds((current) => (current.length >= 5 ? current : [...current, '']));
  }, []);
  const removeRoutePlannerStop = useCallback((index: number) => {
    setRoutePlannerStopIds((current) => {
      const nextStops = current.filter((_, currentIndex) => currentIndex !== index);
      return nextStops.length > 0 ? nextStops : [''];
    });
  }, []);
  const actualizarRuta = useCallback((inicio: RouteWaypoint, puntosIntermedios: RouteWaypoint[], destino: RouteWaypoint) => {
    const nextWaypoints = [inicio, ...puntosIntermedios, destino].filter(isValidRouteWaypoint);

    if (nextWaypoints.length < 2) {
      console.warn('No hay coordenadas validas suficientes para calcular la ruta.');
      setRouteError('No hay coordenadas validas para calcular la ruta.');
      return;
    }

    const destinationFalla = routeFallas.find((falla) => (
      Math.abs(falla.lat - destino.lat) < 0.00001
      && Math.abs(falla.lng - destino.lng) < 0.00001
    )) ?? null;

    setCustomRouteWaypoints(nextWaypoints);
    setRouteCalculationOrigin(null);
    setPendingGuidanceStart(false);
    stopGuidance();
    setShowLocationHelp(false);
    setClusterFocusFallas(null);

    if (destinationFalla) {
      setSelectedFalla(destinationFalla);
      setActiveRouteFallaId(destinationFalla.id);
    }

    setFocusRouteToken((current) => current + 1);
  }, [routeFallas, setActiveRouteFallaId, setSelectedFalla, stopGuidance]);
  const rutaHastaFalla = useCallback(async (falla: Falla) => {
    let origin = userPosition;

    if (!origin) {
      try {
        origin = await requestLocation();
      } catch (error) {
        console.warn('Activa tu ubicacion para calcular la ruta desde tu posicion actual.', error);
        setShowLocationHelp(true);
        setRouteError('Activa tu ubicacion para calcular la ruta desde tu posicion actual.');
        showMapFloatingToast('Activa la ubicacion para abrir la ruta');
        return;
      }
    }

    actualizarRuta(
      { lat: origin[0], lng: origin[1], nombre: 'Tu ubicacion' },
      [],
      fallaToRouteWaypoint(falla)
    );
  }, [actualizarRuta, requestLocation, showMapFloatingToast, userPosition]);
  const navigateToFacility = useCallback(async (facility: { lat: number; lng: number; address: string }) => {
    let origin = userPosition;

    if (!origin) {
      try {
        origin = await requestLocation();
      } catch {
        showMapFloatingToast('Activa la ubicacion para abrir la ruta');
        return;
      }
    }

    setSelectedFacility(null);
    actualizarRuta(
      { lat: origin[0], lng: origin[1], nombre: 'Tu ubicacion' },
      [],
      { lat: facility.lat, lng: facility.lng, nombre: facility.address }
    );
  }, [actualizarRuta, requestLocation, showMapFloatingToast, userPosition]);
  const rutaEntreFallas = useCallback((fallaOrigen: Falla, fallaDestino: Falla) => {
    actualizarRuta(fallaToRouteWaypoint(fallaOrigen), [], fallaToRouteWaypoint(fallaDestino));
  }, [actualizarRuta]);
  const rutaConParadas = useCallback((origen: RouteWaypoint | Falla, fallasIntermedias: Array<RouteWaypoint | Falla>, destino: RouteWaypoint | Falla) => {
    actualizarRuta(
      pointToRouteWaypoint(origen, 'Inicio'),
      fallasIntermedias.map((falla, index) => pointToRouteWaypoint(falla, `Parada ${index + 1}`)),
      pointToRouteWaypoint(destino, 'Destino')
    );
  }, [actualizarRuta]);
  const createRoutePlannerRoute = useCallback(async () => {
    const selectedStops = routePlannerStopIds
      .map((id) => routePlannerOptions.find((falla) => falla.id === id) ?? null)
      .filter((falla): falla is Falla => falla !== null);

    if (selectedStops.length < 1) {
      showMapFloatingToast('Elige al menos una falla para crear la ruta');
      return;
    }

    let origin = userPosition;

    if (!origin) {
      try {
        origin = await requestLocation();
      } catch (error) {
        console.warn('No se pudo obtener ubicacion para crear la ruta personalizada.', error);
        setShowLocationHelp(true);
        setRouteError('Activa tu ubicacion para crear tu ruta.');
        showMapFloatingToast('Activa la ubicacion para crear tu ruta');
        return;
      }
    }

    const originWaypoint = { lat: origin[0], lng: origin[1], nombre: 'Tu ubicacion' };
    const optimizedStops = buildOptimizedStopOrder(originWaypoint, selectedStops);
    const destination = optimizedStops[optimizedStops.length - 1];
    rutaConParadas(
      originWaypoint,
      optimizedStops.slice(0, -1),
      destination
    );
    setRoutePlannerOpen(false);
    showMapFloatingToast(selectedStops.length > 1 ? 'Ruta optimizada por comodidad' : 'Ruta creada');
  }, [requestLocation, routePlannerOptions, routePlannerStopIds, rutaConParadas, showMapFloatingToast, userPosition]);
  const limpiarRuta = useCallback(() => {
    setPendingGuidanceStart(false);
    stopGuidance();
    stopLocationWatch();
    setShowLocationHelp(false);
    setCustomRouteWaypoints(null);
    setRouteOrigin(null);
    setRouteCalculationOrigin(null);
    setRouteData(null);
    setRouteDataKey(null);
    setRouteError(null);
    setIsRouteLoading(false);
    setActiveRouteFallaId(null);
  }, [setActiveRouteFallaId, stopGuidance, stopLocationWatch]);
  const centrarRuta = useCallback(() => {
    if (!isRouteActive) {
      console.warn('No hay una ruta activa para centrar.');
      return;
    }

    setFocusRouteToken((current) => current + 1);
  }, [isRouteActive]);

  useEffect(() => {
    window.Fallas360Rutas = {
      actualizarRuta,
      rutaHastaFalla,
      rutaEntreFallas,
      rutaConParadas,
      limpiarRuta,
      centrarRuta,
    };

    return () => {
      if (window.Fallas360Rutas?.actualizarRuta === actualizarRuta) {
        delete window.Fallas360Rutas;
      }
    };
  }, [actualizarRuta, centrarRuta, limpiarRuta, rutaConParadas, rutaEntreFallas, rutaHastaFalla]);

  useEffect(() => {
    if (!MODO_DEMO_RUTAS) {
      return;
    }

    let index = 0;
    const intervalId = window.setInterval(() => {
      index = index === 0 ? 1 : 0;
      actualizarRuta(DEMO_ROUTE_START, [DEMO_ROUTE_STOP], DEMO_ROUTE_DESTINATIONS[index]);
    }, 5000);

    actualizarRuta(DEMO_ROUTE_START, [DEMO_ROUTE_STOP], DEMO_ROUTE_DESTINATIONS[index]);
    return () => window.clearInterval(intervalId);
  }, [actualizarRuta]);
  useEffect(() => {
    if (!externalRouteFocusToken) {
      return;
    }

    if (lastExternalRouteRequestRef.current === externalRouteFocusToken) {
      return;
    }

    lastExternalRouteRequestRef.current = externalRouteFocusToken;

    const requestedRouteWaypoints = Array.isArray(externalRouteWaypoints) && externalRouteWaypoints.length > 1
      ? externalRouteWaypoints.filter(isValidRouteWaypoint)
      : [];
    const requestedRouteFallas = Array.isArray(externalRouteFallaIds) && externalRouteFallaIds.length > 1
      ? Array.from(new Map(
        externalRouteFallaIds
          .map((fallaId) => routeFallas.find((item) => item.id === fallaId) ?? null)
          .filter((item): item is Falla => item !== null)
          .map((falla) => [`${falla.id}:${falla.lat.toFixed(4)}:${falla.lng.toFixed(4)}`, falla] as const)
      ).values())
      : [];

    if (requestedRouteWaypoints.length > 1 || requestedRouteFallas.length > 1) {
      void (async () => {
        let origin = userPosition;

        if (!origin) {
          try {
            origin = await requestLocation();
          } catch (error) {
            console.warn('Activa tu ubicacion para calcular la ruta conjunta.', error);
            setShowLocationHelp(true);
            setRouteError('Activa tu ubicacion para calcular la ruta conjunta.');
            showMapFloatingToast('Activa la ubicacion para abrir la ruta');
            return;
          }
        }

        const originWaypoint = { lat: origin[0], lng: origin[1], nombre: 'Tu ubicacion' };
        if (requestedRouteWaypoints.length > 1) {
          const destination = requestedRouteWaypoints[requestedRouteWaypoints.length - 1];
          rutaConParadas(
            originWaypoint,
            requestedRouteWaypoints.slice(0, -1),
            destination
          );
          return;
        }

        const destination = requestedRouteFallas[requestedRouteFallas.length - 1];
        rutaConParadas(
          originWaypoint,
          requestedRouteFallas.slice(0, -1),
          destination
        );
      })();
      return;
    }

    if (!activeRouteFalla) {
      return;
    }

    if (!Number.isFinite(activeRouteFalla.lat) || !Number.isFinite(activeRouteFalla.lng)) {
      setRouteError('Esta falla no tiene coordenadas validas para calcular la ruta.');
      return;
    }

    void rutaHastaFalla(activeRouteFalla);
  }, [activeRouteFalla, externalRouteFallaIds, externalRouteFocusToken, externalRouteWaypoints, requestLocation, routeFallas, rutaConParadas, rutaHastaFalla, showMapFloatingToast, userPosition]);
  const handleFavoriteToggle = useCallback((falla: Falla, event?: React.MouseEvent) => {
    trackActivityEvent({
      eventType: 'favorite_toggle',
      fallaId: falla.id,
      latitude: falla.lat,
      longitude: falla.lng,
    });
    toggleFavorite(falla.id, event);
  }, [toggleFavorite]);
  const handleChangeRouteProfile = useCallback((nextProfile: RouteProfile) => {
    if (nextProfile === routeProfile) {
      return;
    }

    setPendingGuidanceStart(true);
    stopGuidance();
    setRouteProfile(nextProfile);
  }, [routeProfile, stopGuidance]);
  const renderedMapItems = useMemo<RenderedMapItem[]>(() => {
    if (!viewportState) {
      return displayedFallas
        .filter((falla) => routePinnedFallaIds.has(falla.id) || falla.id === selectedFalla?.id || falla.id === activeRouteFalla?.id)
        .map((falla) => ({ kind: 'falla', id: falla.id, falla }));
    }

    const zoom = viewportState.zoom;
    const viewportWidth = Math.max(0, viewportState.maxX - viewportState.minX);
    const compactViewport = viewportWidth > 0 && viewportWidth < 680;
    const padding = isMinimalChrome
      ? (zoom >= 16 ? 44 : zoom >= 14 ? 72 : 104)
      : compactViewport
        ? (zoom >= 16 ? 48 : zoom >= 14 ? 78 : 112)
        : (zoom >= 16 ? 56 : zoom >= 14 ? 88 : 124);
    const minX = viewportState.minX - padding;
    const minY = viewportState.minY - padding;
    const maxX = viewportState.maxX + padding;
    const maxY = viewportState.maxY + padding;
    const cellSize = isMinimalChrome
      ? (zoom >= 16 ? 0 : zoom >= 15 ? 44 : zoom >= 14 ? 58 : 72)
      : compactViewport
        ? (zoom >= 15 ? 0 : zoom >= 14 ? 44 : 58)
        : (zoom >= 17 ? 0 : zoom >= 16 ? 64 : zoom >= 15 ? 76 : zoom >= 14 ? 92 : 108);
    const pinnedIds = new Set(routePinnedFallaIds);
    [selectedFalla?.id, activeRouteFalla?.id]
      .filter((value): value is string => Boolean(value))
      .forEach((value) => pinnedIds.add(value));
    const clusters = new Map<string, { fallas: Falla[]; latSum: number; lngSum: number; allInfantil: boolean; hasInfantil: boolean; hasPrize: boolean }>();
    const items: RenderedMapItem[] = [];

    for (const falla of displayedFallas) {
      if (pinnedIds.has(falla.id)) {
        items.push({ kind: 'falla', id: falla.id, falla });
        continue;
      }

      const point = getProjectedFallaPoint(falla, zoom);
      if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
        continue;
      }

      if (cellSize === 0) {
        items.push({ kind: 'falla', id: falla.id, falla });
        continue;
      }

      const bucketX = Math.floor((point.x - minX) / cellSize);
      const bucketY = Math.floor((point.y - minY) / cellSize);
      const bucketKey = `${bucketX}:${bucketY}`;
      const bucket = clusters.get(bucketKey);

      if (bucket) {
        bucket.fallas.push(falla);
        bucket.latSum += falla.lat;
        bucket.lngSum += falla.lng;
        bucket.allInfantil = bucket.allInfantil && falla.category === 'Infantil';
        bucket.hasInfantil = bucket.hasInfantil || falla.category === 'Infantil';
        bucket.hasPrize = bucket.hasPrize || typeof falla.prize === 'number';
      } else {
        clusters.set(bucketKey, {
          fallas: [falla],
          latSum: falla.lat,
          lngSum: falla.lng,
          allInfantil: falla.category === 'Infantil',
          hasInfantil: falla.category === 'Infantil',
          hasPrize: typeof falla.prize === 'number',
        });
      }
    }

    clusters.forEach((cluster, bucketKey) => {
      if (cluster.fallas.length === 1) {
        items.push({ kind: 'falla', id: cluster.fallas[0].id, falla: cluster.fallas[0] });
        return;
      }

      items.push({
        kind: 'cluster',
        id: `cluster:${zoom}:${bucketKey}:${cluster.fallas.length}`,
        lat: cluster.latSum / cluster.fallas.length,
        lng: cluster.lngSum / cluster.fallas.length,
        fallas: cluster.fallas,
        allInfantil: cluster.allInfantil,
        hasInfantil: cluster.hasInfantil,
        hasPrize: cluster.hasPrize,
      });
    });

    if (items.length > MAX_RENDERED_MAP_ITEMS) {
      const pinnedItems = items.filter((item) => item.kind === 'falla' && pinnedIds.has(item.falla.id));
      const restItems = items
        .filter((item) => !(item.kind === 'falla' && pinnedIds.has(item.falla.id)))
        .sort((left, right) => {
          if (left.kind !== right.kind) {
            return left.kind === 'cluster' ? -1 : 1;
          }

          if (left.kind === 'cluster' && right.kind === 'cluster') {
            return right.fallas.length - left.fallas.length;
          }

          if (left.kind === 'falla' && right.kind === 'falla') {
            const leftPrize = typeof left.falla.prize === 'number' ? left.falla.prize : 99;
            const rightPrize = typeof right.falla.prize === 'number' ? right.falla.prize : 99;
            return leftPrize - rightPrize || right.falla.visitors - left.falla.visitors;
          }

          return 0;
        });

      return [
        ...pinnedItems,
        ...restItems.slice(0, Math.max(0, MAX_RENDERED_MAP_ITEMS - pinnedItems.length)),
      ];
    }

    return items;
  }, [activeRouteFalla?.id, displayedFallas, isMinimalChrome, routePinnedFallaIds, selectedFalla?.id, viewportState]);
  const shouldUseLightMarkers = isMinimalChrome
    || Boolean(viewportState && (viewportState.maxX - viewportState.minX) < 680)
    || Boolean(viewportState && viewportState.zoom < 17);
  const markerNodes = useMemo(() => (
    renderedMapItems.map((item) => {
      if (item.kind === 'cluster') {
        return (
          <ClusterMarkerNode
            key={item.id}
            item={item}
            onFocus={handleClusterFocus}
            onSelect={handleMarkerSelect}
          />
        );
      }

      const falla = item.falla;
      return (
          <React.Fragment key={falla.id}>
            <FallaMarkerNode
              falla={falla}
              icon={getCachedFallaIcon(
                selectedFalla?.id === falla.id,
                activeRouteFallaId === falla.id,
                falla.prize,
                isHeatmapEnabled && trendingFallaIdSet.has(falla.id),
                shouldUseLightMarkers,
                falla.visitors / 160,
                falla.category === 'Infantil',
              )}
              onSelect={handleMarkerSelect}
            />
          </React.Fragment>
        );
      })
  ), [activeRouteFallaId, handleClusterFocus, handleMarkerSelect, isHeatmapEnabled, renderedMapItems, selectedFalla?.id, shouldUseLightMarkers, trendingFallaIdSet]);

  const locateUser = useCallback(async () => {
    if (userPosition) {
      setFocusUserToken((current) => current + 1);
      return true;
    }

    setIsLocating(true);
    try {
      await requestLocation();
      setFocusUserToken((current) => current + 1);
      return true;
    } catch {
      return false;
    } finally {
      setIsLocating(false);
    }
  }, [requestLocation, userPosition]);
  const handleCenterUserLocation = useCallback(async () => {
    const centered = await locateUser();
    setUserLocationActive(centered);
    showMapFloatingToast(centered ? 'Ubicacion centrada' : 'Activa los permisos de ubicacion para usar esta funcion');
  }, [locateUser, showMapFloatingToast]);
  const handleToggleTrafficLayer = useCallback(() => {
    setTrafficLayerActive((current) => {
      const nextValue = !current;
      setMapLayerVisibility((layers) => ({
        ...layers,
        parking: nextValue,
      }));
      setActiveFloatingPanel(nextValue ? 'traffic' : null);
      showMapFloatingToast(nextValue ? 'Mostrando parkings disponibles' : 'Ocultando parkings');
      return nextValue;
    });
  }, [showMapFloatingToast]);
  const handleToggleFallasLiveControls = useCallback(() => {
    if (!fallasLiveModuleEnabled) {
      showMapFloatingToast(isAdmin ? 'Fallas Live esta desactivado globalmente desde admin' : 'Avisos ocultados temporalmente');
      return;
    }

    setIsFallasLiveVisible((current) => {
      const nextValue = !current;
      showMapFloatingToast(nextValue ? 'Fallas Live visible' : 'Avisos ocultados temporalmente');
      return nextValue;
    });
  }, [fallasLiveModuleEnabled, isAdmin, showMapFloatingToast]);
  const handleOpenMapLayersPanel = useCallback(() => {
    setActiveFloatingPanel((current) => current === 'layers' ? null : 'layers');
  }, []);
  const handleToggleIncidents = useCallback(() => {
    setIncidentsVisible((current) => {
      const nextValue = !current;
      setMapLayerVisibility((layers) => ({
        ...layers,
        streetClosures: nextValue,
      }));
      setActiveFloatingPanel(nextValue ? 'incidents' : null);
      showMapFloatingToast(nextValue ? 'Mostrando calles cortadas' : 'Calles cortadas ocultas');
      return nextValue;
    });
  }, [showMapFloatingToast]);
  const ensureUserPosition = useCallback(async () => {
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
  }, [requestLocation, userPosition]);
  const handleStartGuidance = useCallback(async () => {
    let navigationPosition = userPosition;

    try {
      navigationPosition = await startLocationWatch();
      setShowLocationHelp(false);
    } catch {
      setShowLocationHelp(true);
      return;
    }

    setRouteOrigin(navigationPosition);
    setRouteCalculationOrigin(navigationPosition);
    if (customRouteWaypoints && customRouteWaypoints.length >= 2) {
      setCustomRouteWaypoints((current) => current && current.length >= 2
        ? [
            { lat: navigationPosition[0], lng: navigationPosition[1], nombre: 'Tu ubicacion' },
            ...current.slice(1),
          ]
        : current
      );
    } else {
      setCustomRouteWaypoints(null);
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

    setPendingGuidanceStart(true);
  }, [customRouteWaypoints, isRouteActive, isRouteLoading, routeData, routeDataKey, routeRequestKey, startGuidance, startLocationWatch, userPosition]);

  return (
    <section
      className={cn(
        'relative overflow-hidden border shadow-[0_30px_72px_rgba(15,23,42,0.14)]',
        variant === 'expanded' ? 'rounded-[24px] p-3 sm:p-4' : 'rounded-[24px] p-3',
        isDarkMode
          ? 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.58))]'
          : 'border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(255,174,122,0.2),transparent_26%),linear-gradient(180deg,#fffdfa_0%,#f6f1e9_100%)]'
        ,frameClassName
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand/12 blur-3xl" />
      <div
        className={cn(
          'relative overflow-hidden',
          isMinimalChrome ? 'rounded-none' : 'rounded-[24px]',
          mapHeightClassName ?? (variant === 'expanded' ? 'h-[min(84vh,1080px)] min-h-[520px] sm:min-h-[760px]' : 'h-[min(76vh,900px)] min-h-[500px] sm:min-h-[660px]')
        )}
      >
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          zoomControl={false}
          scrollWheelZoom={true}
          preferCanvas={true}
          renderer={LEAFLET_CANVAS_RENDERER}
          updateWhenIdle={true}
          updateWhenZooming={false}
          fadeAnimation={false}
          zoomAnimation={false}
          markerZoomAnimation={false}
          wheelDebounceTime={80}
          wheelPxPerZoomLevel={80}
          inertiaDeceleration={2600}
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
          {activeTheme.id === 'satellite' ? (
            <Pane name="labelsPane" style={{ zIndex: 360, pointerEvents: 'none' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                maxZoom={20}
                opacity={0.96}
                keepBuffer={6}
                updateWhenIdle={false}
                updateWhenZooming={false}
                updateInterval={180}
                detectRetina={false}
              />
            </Pane>
          ) : null}
          <ZoomControl position={isMinimalChrome ? 'bottomleft' : 'topright'} />
          <MapViewportBridge onChange={handleViewportChange} />
          <MapInteractionBridge onInteractionStart={markMapInteractionStart} onInteractionEnd={markMapInteractionEnd} />
          <Pane name="heatmapPane" style={{ zIndex: 350, pointerEvents: 'none' }}>
            {shouldRenderHeatmap ? (
              <>
                <HeatmapLayer enabled={true} points={effectiveHeatmap.heatPoints} mapStyleId={mapStyleId} />
                <HeatmapDataBridge
                  enabled={true}
                  onLoadingChange={setIsHeatmapLoading}
                  onPayloadChange={setHeatmapPayload}
                  range={heatmapRange}
                />
              </>
            ) : null}
          </Pane>
          <Pane name="fallasLiveHeatmapPane" style={{ zIndex: 352, pointerEvents: 'none' }}>
            {shouldShowFallasLive ? (
              <HeatmapLayer
                enabled={true}
                points={fallasLiveHeatPoints}
                mapStyleId={mapStyleId}
                gradient={FALLAS_LIVE_GRADIENT}
                pane="fallasLiveHeatmapPane"
              />
            ) : null}
          </Pane>
          <Pane name="routePane" style={{ zIndex: 640, pointerEvents: 'none' }}>
            <RoutePolylineLayer geometry={routeGeometry} profile={routeProfile} variant={isGuidanceActive ? 'guided' : 'default'} />
            {displayedUserPosition ? (
              <Circle
                center={displayedUserPosition}
                radius={90}
                pathOptions={userPositionCircleStyle}
              />
            ) : null}
          </Pane>
          <Pane name="routeStopsPane" style={{ zIndex: 648 }}>
            {isRouteActive ? routeWaypointMarkers.map((waypoint) => (
              <Marker
                key={waypoint.key}
                position={waypoint.position}
                icon={getCachedRouteStopIcon(waypoint.label, waypoint.kind)}
              >
                <Tooltip direction="top" offset={[0, -26]}>
                  {waypoint.name}
                </Tooltip>
              </Marker>
            )) : null}
          </Pane>
          <Pane name="parkingPane" style={{ zIndex: 646 }}>
            {showParkingOverlay ? FALLAS_PARKINGS.map((parking) => (
              <Marker
                key={parking.id}
                position={[parking.lat, parking.lng]}
                icon={PARKING_ICON}
              >
                <Tooltip direction="left" offset={[-10, 0]}>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-950">{parking.name}</p>
                    <p className="text-[11px] font-semibold text-slate-600">{parking.note}</p>
                  </div>
                </Tooltip>
              </Marker>
            )) : null}
          </Pane>
          <Pane name="restroomsPane" style={{ zIndex: 646 }}>
            {mapLayerVisibility.restrooms ? nearbyOfficialRestrooms.map((restroom) => (
              <Marker
                key={restroom.id}
                position={[restroom.lat, restroom.lng]}
                icon={RESTROOM_ICON}
                eventHandlers={{ click: () => setSelectedFacility({ kind: 'restroom', item: restroom }) }}
              >
                <Tooltip direction="left" offset={[-10, 0]}>{restroom.address}</Tooltip>
              </Marker>
            )) : null}
          </Pane>
          <Pane name="transportPane" style={{ zIndex: 646 }}>
            {mapLayerVisibility.publicTransport ? nearbyOfficialMetroStations.map((transport) => (
              <Marker
                key={transport.id}
                position={[transport.lat, transport.lng]}
                icon={TRANSPORT_ICON}
                eventHandlers={{ click: () => setSelectedFacility({ kind: 'metro', item: transport }) }}
              >
                <Tooltip direction="left" offset={[-10, 0]}>{transport.name}</Tooltip>
              </Marker>
            )) : null}
          </Pane>
          <Pane name="closuresPane" style={{ zIndex: 647 }}>
            {showStreetClosuresOverlay ? FALLAS_STREET_CLOSURES.map((closure) => (
              <Polyline
                key={closure.id}
                positions={closure.path}
                pathOptions={{
                  color: '#dc2626',
                  weight: 5,
                  opacity: 0.88,
                  dashArray: '10 8',
                  lineCap: 'round',
                }}
              >
                <Tooltip sticky>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-950">{closure.name}</p>
                    <p className="text-[11px] font-semibold text-slate-600">{closure.note}</p>
                  </div>
                </Tooltip>
              </Polyline>
            )) : null}
          </Pane>
          <Pane name="fallasPane" style={{ zIndex: 650 }}>
            {displayedUserPosition ? (
              <Marker position={displayedUserPosition} icon={USER_ICON} />
            ) : null}
            {markerNodes}
          </Pane>
          <ViewportController
            fallas={visibleFallas}
            selectedFalla={selectedFalla}
            activeRouteFalla={activeRouteFalla}
            routeGeometry={routeGeometry}
            clusterFocusFallas={clusterFocusFallas}
            userPosition={displayedUserPosition ?? userPosition}
            focusClusterToken={focusClusterToken}
            focusUserToken={focusUserToken}
            focusRouteToken={focusRouteToken}
            focusSelectedToken={focusSelectedToken}
            externalRouteFocusToken={externalRouteFocusToken}
            guidanceMode={isGuidanceActive}
            onBackgroundClick={() => {
              setSelectedFalla(null);
              setSelectedFacility(null);
            }}
          />
          <HeatmapFocusController enabled={shouldRenderHeatmap} target={heatmapDemoFocusFalla} />
        </MapContainer>
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[120]',
            isNavigationSceneActive
              ? 'bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.02)_30%,rgba(2,6,23,0.18)_100%)]'
              : isDarkTheme
                ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.03)_28%,rgba(2,6,23,0.12)_100%)]'
                : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_30%),linear-gradient(180deg,rgba(255,248,238,0.14),rgba(255,248,238,0.04)_28%,rgba(255,255,255,0.12)_100%)]'
          )}
          style={shouldRenderHeatmap ? { opacity: 0.55 } : undefined}
        />

        {(!isMinimalChrome || fallasLiveModuleEnabled) ? (
          <div className="pointer-events-none absolute inset-0 z-[1000]">
            <MapFloatingControls
              activeMapThemeId={mapStyleId}
              activePanel={activeFloatingPanel}
              fallasLiveEnabled={fallasLiveModuleEnabled && shouldShowFallasLive}
              incidentItems={floatingIncidentItems}
              isAdmin={isAdmin}
              isBottomSheetOpen={isBottomSheetOpen}
              isDetailCardOpen={isDetailCardOpen}
              isIncidentsVisible={showStreetClosuresOverlay}
              isMapControlsExpanded={isMapControlsExpanded}
              isMapInteracting={isMapInteracting}
              isMapLayersPanelOpen={mapLayersPanelOpen}
              isModalOpen={isModalOpen}
              isNavigationActive={isNavigationActive}
              isAgendaPreviewOpen={shouldShowUpcomingAgendaOverlay}
              isRoutePlannerOpen={routePlannerOpen}
              isTrafficLayerActive={showParkingOverlay}
              isUserLocationActive={userLocationActive}
              isDarkTheme={isDarkTheme}
              layerOptions={floatingLayerOptions}
              mapSearchQuery={mapSearchQuery}
              onCenterUserLocation={() => { void handleCenterUserLocation(); }}
              onClosePanel={closeFloatingPanel}
              onMapSearchQueryChange={setMapSearchQuery}
              onOpenMapLayers={handleOpenMapLayersPanel}
              onToggleRoutePlanner={() => {
                setRoutePlannerOpen((current) => !current);
                setActiveFloatingPanel(null);
              }}
              onSelectMapTheme={setMapStyleId}
              onSetMapControlsExpanded={setIsMapControlsExpanded}
              onToggleFallasLive={handleToggleFallasLiveControls}
              onToggleIncidents={handleToggleIncidents}
              onToggleLayer={handleToggleLayerVisibility}
              onToggleTrafficLayer={handleToggleTrafficLayer}
              themeOptions={MAP_THEMES}
              trafficItems={floatingTrafficItems}
            />

            {upcomingAgendaOverlay}

            <AnimatePresence>
              {mapFloatingToast ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={cn(
                    'pointer-events-none absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1.15rem)] flex justify-center sm:bottom-5',
                    isDetailCardOpen && 'sm:bottom-[5.5rem]'
                  )}
                >
                  <div className={cn(
                    'rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] shadow-[0_18px_38px_rgba(15,23,42,0.16)] backdrop-blur-xl',
                    isDarkTheme ? 'bg-slate-950/86 text-white' : 'bg-white/94 text-slate-700'
                  )}>
                    {mapFloatingToast}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {!isNavigationSceneActive ? (
          <div className="pointer-events-none absolute inset-0 z-[6200] flex items-end justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.05rem)] sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom,0px)+5.7rem)]">
            <AnimatePresence>
              {routePlannerOpen ? (
                <motion.aside
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 22, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={cn(
                    'pointer-events-auto mx-auto w-full max-w-[26rem] overflow-hidden rounded-[1.85rem] border shadow-[0_28px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:max-w-[29rem] sm:rounded-[2rem]',
                    isDarkTheme ? 'border-white/12 bg-slate-950/94 text-white' : 'border-white/95 bg-white/98 text-[#0f2d57]'
                  )}
                  style={{ transformOrigin: 'bottom center' }}
                >
                  <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
                    <div className={cn('mx-auto mb-4 h-1.5 w-16 rounded-full', isDarkTheme ? 'bg-white/18' : 'bg-slate-300')} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[1.35rem] font-black leading-tight tracking-[-0.04em] sm:text-[1.55rem]">Crear ruta personalizada</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRoutePlannerOpen(false)}
                        className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors sm:h-10 sm:w-10', isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
                        aria-label="Cerrar mis rutas"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className={cn('mt-2 text-[0.95rem] font-bold leading-6', isDarkTheme ? 'text-white/56' : 'text-slate-500')}>
                      Elige las fallas y Falles 360 ordenara la ruta mas comoda y efectiva desde tu ubicacion.
                    </p>

                    <div className="mt-5 max-h-[min(24dvh,12rem)] space-y-3 overflow-y-auto pr-1 sm:max-h-[min(34dvh,17rem)]">
                      {routePlannerStopIds.map((stopId, index) => (
                        <div key={`${index}-${stopId}`} className="flex items-center gap-3">
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff6421] text-[1rem] font-black text-white shadow-[0_14px_26px_rgba(255,100,33,0.3)]">
                            {index + 1}
                          </span>
                          <select
                            value={stopId}
                            onChange={(event) => updateRoutePlannerStop(index, event.target.value)}
                            className={cn(
                              'min-w-0 flex-1 rounded-[1.1rem] border px-4 py-3.5 text-[1rem] font-bold outline-none transition-colors',
                              isDarkTheme ? 'border-white/12 bg-white/8 text-white' : 'border-slate-200 bg-white text-[#0f2d57]'
                            )}
                          >
                            <option value="">Elige una falla</option>
                            {routePlannerOptions.map((falla) => (
                              <option key={falla.id} value={falla.id}>
                                {falla.name}
                              </option>
                            ))}
                          </select>
                          {routePlannerStopIds.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeRoutePlannerStop(index)}
                              className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors', isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                              aria-label="Quitar parada"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={addRoutePlannerStop}
                        disabled={routePlannerStopIds.length >= 5}
                        className={cn('inline-flex h-14 items-center justify-center rounded-[1.1rem] border px-3 text-[0.95rem] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-45', isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
                      >
                        + Parada
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRoutePlannerStopIds(['']);
                          limpiarRuta();
                          showMapFloatingToast('Ruta limpiada');
                        }}
                        className={cn('inline-flex h-14 items-center justify-center rounded-[1.1rem] border px-3 text-[0.95rem] font-black transition-colors', isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
                      >
                        Limpiar
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <button
                        type="button"
                        onClick={() => { void createRoutePlannerRoute(); }}
                        className="inline-flex h-16 items-center justify-center rounded-[1.25rem] bg-[#ff6421] px-4 text-[1.05rem] font-black text-white shadow-[0_20px_40px_rgba(255,100,33,0.28)] transition-colors hover:bg-[#f05516]"
                      >
                        Crear ruta optimizada
                      </button>
                      <button
                        type="button"
                        onClick={centrarRuta}
                        disabled={!isRouteActive}
                        className={cn(
                          'inline-flex h-16 w-16 items-center justify-center rounded-[1.25rem] border transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                          isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        )}
                        aria-label="Centrar ruta"
                      >
                        <LocateFixed className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.aside>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {selectedFacility && !selectedFalla && !isNavigationSceneActive ? (
          <div className="pointer-events-none absolute inset-0 z-[1350] flex items-center justify-center px-2.5 py-3 sm:px-6 sm:py-6">
            <motion.aside
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="pointer-events-auto w-full max-w-[19.75rem] rounded-[1.35rem] border border-white/80 bg-white/96 p-3 text-slate-950 shadow-[0_24px_54px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:max-w-[28rem] sm:rounded-[1.65rem] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] sm:px-3 sm:py-2 sm:text-[10px]',
                  selectedFacility.kind === 'metro'
                    ? 'border-[#ffcfbf] bg-[#fff4ef] text-[#ff5b1f]'
                    : 'border-sky-100 bg-sky-50 text-sky-700'
                )}>
                  <span className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-[0_10px_18px_rgba(15,23,42,0.1)] sm:h-8 sm:w-8',
                    selectedFacility.kind === 'metro' ? 'bg-[#ff5b1f]' : 'bg-[#0f4c81]'
                  )}>
                    {selectedFacility.kind === 'metro' ? <TrainFront className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </span>
                  {selectedFacility.kind === 'metro' ? 'Metrovalencia' : 'Baño público'}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFacility(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-[0_12px_20px_rgba(15,23,42,0.08)] transition-colors hover:bg-slate-50 sm:h-11 sm:w-11"
                  aria-label="Cerrar cartel"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="mt-3">
                <h3 className="text-[1.15rem] font-black leading-[0.94] tracking-[-0.04em] text-[#0f2d57] sm:text-[2.75rem]">
                  {selectedFacility.kind === 'metro' ? selectedFacility.item.name : selectedFacility.item.address}
                </h3>
              </div>

              <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                {selectedFacility.kind === 'metro' ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.07)] sm:h-12 sm:w-12 sm:rounded-[1rem]">
                        <Navigation className="h-5 w-5 text-[#385782] sm:h-6 sm:w-6" />
                      </span>
                      <p className="text-[0.92rem] font-medium text-[#385782] sm:text-[1rem]">Código oficial: <span className="font-black text-[#0f2d57]">{selectedFacility.item.code || 'Sin código'}</span></p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.07)] sm:h-12 sm:w-12 sm:rounded-[1rem]">
                        <TrainFront className="h-5 w-5 text-[#385782] sm:h-6 sm:w-6" />
                      </span>
                      <p className="text-[0.92rem] font-medium text-[#385782] sm:text-[1rem]">Línea: <span className="font-black text-[#0f2d57]">{selectedFacility.item.line || 'Sin línea publicada'}</span></p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.07)] sm:h-12 sm:w-12 sm:rounded-[1rem]">
                        <MapPin className="h-5 w-5 text-[#385782] sm:h-6 sm:w-6" />
                      </span>
                      <p className="text-[0.9rem] font-medium text-[#385782] sm:text-[0.98rem]">Cabinas normales: <span className="font-black text-[#0f2d57]">{selectedFacility.item.normalCabins}</span></p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.07)] sm:h-12 sm:w-12 sm:rounded-[1rem]">
                        <Accessibility className="h-5 w-5 text-[#385782] sm:h-6 sm:w-6" />
                      </span>
                      <p className="text-[0.9rem] font-medium text-[#385782] sm:text-[0.98rem]">Cabinas PMR: <span className="font-black text-[#0f2d57]">{selectedFacility.item.accessibleCabins}</span></p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 sm:mt-5 sm:pt-5">
                {selectedFacility.kind === 'metro' ? (
                  <div className="flex flex-wrap gap-2.5">
                    {selectedFacility.item.arrivalsUrl ? (
                      <a href={selectedFacility.item.arrivalsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#ff5b1f_0%,#ff7a1f_100%)] px-3.5 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_24px_rgba(255,99,33,0.22)] sm:px-4 sm:py-3 sm:text-[0.78rem]">
                        <TrainFront className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Próximas llegadas
                        <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </a>
                    ) : null}
                    <a href={OFFICIAL_METRO_DATASET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#132b52] px-3.5 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_24px_rgba(19,43,82,0.18)] sm:px-4 sm:py-3 sm:text-[0.78rem]">
                      <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Fuente oficial
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigateToFacility({
                        lat: selectedFacility.item.lat,
                        lng: selectedFacility.item.lng,
                        address: selectedFacility.item.address,
                      })}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0f4c81] px-3.5 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_24px_rgba(15,76,129,0.22)] transition-all hover:bg-[#0d3f6b] sm:px-4 sm:py-3 sm:text-[0.78rem]"
                    >
                      <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Ir a este baño
                    </button>
                    <a href={selectedFacility.item.officialInfoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#132b52] px-3.5 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_24px_rgba(19,43,82,0.18)] sm:px-4 sm:py-3 sm:text-[0.78rem]">
                      <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Fuente oficial
                    </a>
                  </div>
                )}
                <p className="mt-2.5 text-[11px] font-bold leading-4 text-slate-500 sm:mt-3 sm:text-[12px]">
                  {selectedFacility.kind === 'metro'
                    ? 'Datos oficiales de FGV y Geoportal de València.'
                    : 'Datos oficiales del Ayuntamiento de València y Geoportal.'}
                </p>
              </div>
            </motion.aside>
          </div>
        ) : null}

        {false ? (
          <div className="pointer-events-none absolute inset-0 z-[1000]">
          {!isMinimalChrome && !isNavigationSceneActive ? (
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
            {isControlsVisible ? (
            <div className={cn('pointer-events-auto rounded-[24px] border px-3 py-3 shadow-[0_20px_44px_rgba(15,23,42,0.15)] backdrop-blur-2xl', isDarkTheme ? 'border-white/12 bg-slate-950/82 text-white' : 'border-white/80 bg-white/92 text-slate-950')}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'bg-brand/16 text-brand' : 'bg-[#fff1e8] text-brand')}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Mapa en vivo
                  </span>
                  <span className={cn('hidden rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] md:inline-flex', isDarkTheme ? 'bg-white/8 text-white/70' : 'bg-slate-100 text-slate-500')}>
                    {activeTheme.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsControlsVisible(false)}
                  className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border transition-colors', isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-100 bg-slate-100 text-slate-600 hover:bg-slate-200')}
                  aria-label="Ocultar controles"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'bg-white/10 text-white/80' : 'bg-[#fff1e8] text-brand')}><Layers3 className="h-3.5 w-3.5" />Capas</span>
                {MAP_THEMES.map((theme) => (
                  <button key={theme.id} type="button" onClick={() => setMapStyleId(theme.id)} className={cn('rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all', mapStyleId === theme.id ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20' : isDarkTheme ? 'bg-white/8 text-white/72 hover:bg-white/12' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                    {theme.shortLabel}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextValue = !isHeatmapEnabled;
                    if (nextValue) {
                      setHasActivatedHeatmap(true);
                    }
                    commitHeatmapEnabled(nextValue);
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                    isHeatmapEnabled
                      ? 'bg-brand text-white shadow-[0_14px_28px_rgba(255,99,33,0.24)]'
                      : isDarkTheme
                        ? 'bg-white/8 text-white/72 hover:bg-white/12'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  <Flame className="h-3.5 w-3.5" />
                  {isHeatmapEnabled ? 'Heatmap on' : 'Heatmap'}
                </button>
                {HEATMAP_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setHeatmapRange(option)}
                    disabled={!isHeatmapEnabled}
                    className={cn(
                      'rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-45',
                      heatmapRange === option
                        ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
                        : isDarkTheme
                          ? 'bg-white/8 text-white/72 hover:bg-white/12'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {option}
                  </button>
                ))}
                {heatmapStatusLabel ? (
                  <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'bg-white/8 text-white/64' : 'bg-slate-100 text-slate-500')}>
                    {heatmapStatusLabel}
                  </span>
                ) : null}
              </div>
              <div className={cn('mt-3 flex items-center gap-2 rounded-[1.2rem] border px-3 py-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.08)]', isDarkTheme ? 'border-white/10 bg-white/6' : 'border-white/80 bg-white/92')}>
                <Search className={cn('h-4 w-4 shrink-0', isDarkTheme ? 'text-white/55' : 'text-slate-400')} />
                <input
                  type="search"
                  value={mapSearchQuery}
                  onChange={(event) => setMapSearchQuery(event.target.value)}
                  placeholder="Busca falla, barrio o seccion"
                  className={cn('min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none placeholder:font-bold', isDarkTheme ? 'text-white placeholder:text-white/38' : 'text-slate-800 placeholder:text-slate-400')}
                />
                {mapSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => setMapSearchQuery('')}
                    className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors', isDarkTheme ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                    aria-label="Limpiar bÃºsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            ) : <div />}

            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsControlsVisible((current) => !current)}
                className={cn(
                  'pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-[18px] border shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors',
                  isDarkTheme ? 'border-white/12 bg-slate-950/80 text-white hover:bg-slate-900/90' : 'border-white/70 bg-white/92 text-slate-700 hover:bg-white'
                )}
                aria-label={isControlsVisible ? 'Ocultar controles del mapa' : 'Mostrar controles del mapa'}
              >
                <Layers3 className={cn('h-5 w-5', mapSearchQuery.trim() ? 'text-brand' : 'text-sky-500')} />
              </button>
              <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl', isDarkTheme ? 'bg-slate-950/82 text-white' : 'bg-white/94 text-slate-700')}>{String(visibleFallas.length).padStart(2, '0')} visibles</span>
              <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl', locationStatus === 'ready' ? 'bg-emerald-500 text-white' : locationStatus === 'blocked' || locationStatus === 'unsupported' ? 'bg-amber-500 text-slate-950' : isDarkTheme ? 'bg-slate-950/80 text-white' : 'bg-white/92 text-slate-700')}>
                <Navigation className="h-3.5 w-3.5" />
                {locationStatus === 'ready' ? 'GPS activo' : locationStatus === 'loading' ? 'Buscando GPS' : locationStatus === 'blocked' ? 'GPS bloqueado' : 'Sin GPS'}
              </span>
              <button type="button" onClick={() => void locateUser()} className={cn('pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] border shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors', isDarkTheme ? 'border-white/12 bg-slate-950/80 text-white hover:bg-slate-900/90' : 'border-white/70 bg-white/92 text-slate-700 hover:bg-white')}>
                <LocateFixed className={cn('h-5 w-5', isLocating && 'animate-pulse')} />
              </button>
            </div>
          </div>
          ) : null}

          {!isNavigationSceneActive ? (
            <>
              <div className="absolute left-1/2 top-4 -translate-x-1/2 pointer-events-auto sm:top-5">
                <button
                  type="button"
                  onClick={() => fallasLiveModuleEnabled && setIsFallasLiveVisible((current) => !current)}
                  disabled={!fallasLiveModuleEnabled}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:px-4',
                    shouldShowFallasLive
                      ? 'border-slate-950/10 bg-slate-950/88 text-white'
                      : isDarkTheme
                        ? 'border-white/12 bg-slate-950/80 text-white/72 hover:bg-slate-900/90'
                        : 'border-white/80 bg-white/94 text-slate-700 hover:bg-white'
                  )}
                >
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', shouldShowFallasLive ? 'bg-brand text-white' : 'bg-brand/12 text-brand')}>
                    <Activity className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-black leading-none">Fallas Live</span>
                  <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]', fallasLiveModuleEnabled ? 'bg-emerald-500/18 text-emerald-300' : 'bg-amber-500/16 text-amber-300')}>
                    {fallasLiveModuleEnabled ? 'ACTIVO' : 'OFF'}
                  </span>
                </button>
              </div>

              {fallasLiveModuleEnabled ? (
                <div className="absolute right-3 top-[6.1rem] pointer-events-auto flex flex-col gap-1.5 sm:right-5 sm:top-[6.6rem]">
                  {[
                    { key: 'traffic' as const, action: () => setIsFallasLiveVisible(true), active: shouldShowFallasLive },
                    { key: 'liveAlerts' as const, action: () => setIsFallasLiveVisible(true), active: shouldShowFallasLive },
                    { key: 'filters' as const, action: () => {
                      const nextValue = !isHeatmapEnabled;
                      if (nextValue) {
                        setHasActivatedHeatmap(true);
                      }
                      commitHeatmapEnabled(nextValue);
                    }, active: isHeatmapEnabled },
                    { key: 'incidents' as const, action: () => setShowLocationHelp(true), active: showLocationHelp },
                    { key: 'location' as const, action: () => { void locateUser(); }, active: locationStatus === 'ready' },
                  ].map(({ key, action, active }) => {
                    const info = mapControlInfo[key];
                    const Icon = info.icon;

                    return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        action();
                        showControlInfo(key);
                      }}
                      onMouseEnter={() => showControlInfo(key)}
                      onFocus={() => showControlInfo(key)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_12px_26px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all',
                        active
                          ? 'border-brand/20 bg-brand text-white hover:bg-[#f45518]'
                          : isDarkTheme
                            ? 'border-white/12 bg-slate-950/72 text-white/58'
                            : 'border-white/80 bg-white/88 text-slate-500'
                      )}
                      aria-label={info.title}
                      title={info.title}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </button>
                    );
                  })}
                </div>
              ) : null}

              {activeControlInfo ? (() => {
                const InfoIcon = activeControlInfo.icon;

                return (
                  <motion.aside
                    key={activeControlInfo.title}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      'pointer-events-auto absolute inset-x-3 bottom-5 rounded-[1.35rem] border px-4 py-3.5 pr-11 shadow-[0_22px_54px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:right-[4.75rem] sm:top-[6.65rem] sm:w-[21rem]',
                      isDarkTheme
                        ? 'border-white/12 bg-slate-950/90 text-white'
                        : 'border-white/80 bg-white/96 text-slate-950'
                    )}
                    role="status"
                    aria-live="polite"
                  >
                    <button
                      type="button"
                      onClick={hideControlInfo}
                      className={cn(
                        'absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                        isDarkTheme ? 'bg-white/8 text-white/62 hover:bg-white/12 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                      )}
                      aria-label="Cerrar explicación"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_14px_28px_rgba(255,99,33,0.25)]">
                        <InfoIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-sm font-black leading-5">{activeControlInfo.title}</strong>
                        <p className={cn('mt-1 text-[12px] font-semibold leading-5 sm:text-[13px]', isDarkTheme ? 'text-white/66' : 'text-slate-500')}>
                          {activeControlInfo.description}
                        </p>
                      </div>
                    </div>
                  </motion.aside>
                );
              })() : null}

            </>
          ) : null}

          {hasActivatedHeatmap && shouldRenderHeatmap && !isNavigationSceneActive && (heatmapSummary.hottestZoneLabel || heatmapSummary.topFalla || heatmapSummary.topNeighborhood) ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'pointer-events-none absolute bottom-4 right-4 max-w-[20rem] rounded-[1.6rem] border px-4 py-4 shadow-[0_24px_54px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:bottom-5 sm:right-5',
                isDarkTheme ? 'border-white/12 bg-slate-950/82 text-white' : 'border-white/80 bg-white/94 text-slate-950'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">{effectiveHeatmap.source === 'preview' ? 'Heatmap demo' : 'Heatmap en tiempo real'}</span>
                {heatmapUpdatedLabel ? (
                  <span className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/52' : 'text-slate-400')}>
                    {heatmapUpdatedLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2.5">
                <div className={cn('rounded-[1rem] px-3 py-2.5', isDarkTheme ? 'bg-white/7' : 'bg-slate-100/80')}>
                  <p className={cn('inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/62' : 'text-slate-500')}><Flame className="h-3.5 w-3.5 text-brand" />Zona mas activa ahora</p>
                  <p className="mt-1 text-sm font-black">{heatmapSummary.hottestZoneLabel ?? 'Sin zona dominante'}</p>
                </div>
                <div className={cn('rounded-[1rem] px-3 py-2.5', isDarkTheme ? 'bg-amber-400/10' : 'bg-amber-50')}>
                  <p className={cn('inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-amber-100/80' : 'text-amber-700')}><AlertTriangle className="h-3.5 w-3.5" />Zona saturada</p>
                  <p className="mt-1 text-sm font-black">{heatmapSaturatedZoneLabel}</p>
                  {heatmapSummary.topFalla?.name ? (
                    <p className={cn('mt-1 text-[11px] font-bold', isDarkTheme ? 'text-white/58' : 'text-slate-500')}>
                      Pico junto a {heatmapSummary.topFalla.name}
                    </p>
                  ) : null}
                </div>
                <div className={cn('rounded-[1rem] px-3 py-2.5', isDarkTheme ? 'bg-sky-400/10' : 'bg-sky-50')}>
                  <p className={cn('inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-sky-100/80' : 'text-sky-700')}><Compass className="h-3.5 w-3.5" />Ruta alternativa recomendada</p>
                  <p className="mt-1 text-sm font-black leading-5">{heatmapAlternativeRouteLabel}</p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {selectedFalla && !isNavigationSceneActive ? (
            <div
              className={cn(
                'pointer-events-none absolute inset-x-4 top-[6.35rem] sm:inset-x-auto sm:right-5 sm:top-[5.9rem]',
                variant === 'expanded' ? 'sm:w-[24rem] lg:w-[26rem]' : 'sm:w-[22rem] lg:w-[24rem]'
              )}
            >
              <motion.div
                initial={{ opacity: 0, x: 18, y: 18 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                key={selectedFalla.id}
                className={cn(
                  'pointer-events-auto no-scrollbar relative max-h-[calc(100dvh-12rem)] overflow-y-auto rounded-[2rem] border shadow-[0_32px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl sm:max-h-[calc(100dvh-8rem)]',
                  isDarkTheme ? 'border-white/12 bg-slate-950/88 text-white' : 'border-white/80 bg-white/96 text-slate-950'
                )}
              >
                <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-[15rem]', isDarkTheme ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,99,33,0.24),transparent_56%),linear-gradient(180deg,rgba(15,23,42,0.18),transparent_100%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,99,33,0.16),transparent_58%),linear-gradient(180deg,rgba(255,248,239,0.94),rgba(255,255,255,0)_100%)]')} />
                <div className={cn('pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full border', isDarkTheme ? 'border-white/8 bg-white/[0.03]' : 'border-white/65 bg-[#fff5eb]/92')} />
                <div className={cn('pointer-events-none absolute right-4 top-4 h-32 w-32 overflow-hidden rounded-full border shadow-[0_22px_44px_rgba(15,23,42,0.16)] sm:h-36 sm:w-36', isDarkTheme ? 'border-white/10 bg-white/6' : 'border-white/80 bg-white/94')}>
                  <img src={selectedFalla.imageUrl} alt={selectedFalla.name} className="h-full w-full object-cover" />
                  <div className={cn('absolute inset-0', isDarkTheme ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.28))]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,245,235,0.24))]')} />
                </div>

                <div className="relative p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]', selectedFalla.prize ? 'bg-[#ffe4b8] text-amber-900' : isDarkTheme ? 'bg-brand/18 text-brand' : 'bg-[#ffe8dc] text-brand')}>
                      {selectedFalla.prize ? <Trophy className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {selectedHeroLabel}
                    </span>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => handleFavoriteToggle(selectedFalla, event)}
                        className={cn(
                          'pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border transition-colors',
                          favorites.includes(selectedFalla.id)
                            ? 'border-red-200 bg-red-500 text-white'
                            : isDarkTheme
                              ? 'border-white/12 bg-white/8 text-white hover:bg-white/12'
                              : 'border-slate-100 bg-white/88 text-slate-500 hover:bg-white'
                        )}
                        aria-label={favorites.includes(selectedFalla.id) ? 'Quitar de favoritas' : 'Guardar favorita'}
                      >
                        <Heart className={cn('h-4.5 w-4.5', favorites.includes(selectedFalla.id) && 'fill-current')} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFalla(null)}
                        className={cn('pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border transition-colors', isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-100 bg-white/88 text-slate-500 hover:bg-white')}
                        aria-label="Cerrar panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-12 pr-24 sm:mt-14 sm:pr-28">
                    <h3 className="line-clamp-3 text-[1.85rem] font-black leading-[0.96] tracking-tight sm:text-[2.15rem]">{selectedFalla.name}</h3>
                    <p className={cn('mt-3 line-clamp-4 text-[14px] font-bold leading-6', isDarkTheme ? 'text-white/70' : 'text-slate-600')}>
                      {selectedSummaryCopy}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedMetaChips.map((chip) => (
                      <span
                        key={chip}
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                          chip.startsWith('#')
                            ? 'bg-amber-400 text-amber-950'
                            : isDarkTheme
                              ? 'bg-white/10 text-white/74'
                              : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className={cn('mt-5 rounded-[1.6rem] border p-4', isDarkTheme ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-white/70')}>
                    <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'text-white/42' : 'text-slate-400')}>
                      Lo esencial
                    </p>

                    <div className="mt-3 space-y-3">
                      <div className={cn('flex items-start gap-3 pb-3', isDarkTheme ? 'border-b border-white/10' : 'border-b border-slate-200')}>
                        <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem]', isDarkTheme ? 'bg-white/8 text-white/72' : 'bg-[#fff1e8] text-brand')}>
                          <MapPin className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/40' : 'text-slate-400')}>Ubicacion</p>
                          <p className="mt-1 text-[13px] font-black leading-5">{selectedLocationLabel}</p>
                        </div>
                      </div>

                      <div className={cn('flex items-start gap-3 pb-3', isDarkTheme ? 'border-b border-white/10' : 'border-b border-slate-200')}>
                        <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem]', isDarkTheme ? 'bg-white/8 text-white/72' : 'bg-[#fff1e8] text-brand')}>
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/40' : 'text-slate-400')}>Artista</p>
                          <p className="mt-1 text-[13px] font-black leading-5">{selectedArtistLabel}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem]', isDarkTheme ? 'bg-white/8 text-white/72' : 'bg-[#fff1e8] text-brand')}>
                          <Flame className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/40' : 'text-slate-400')}>Comision</p>
                          <p className="mt-1 text-[13px] font-black leading-5">{selectedCommissionLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkTheme ? 'text-white/42' : 'text-slate-400')}>
                      Acceso rapido
                    </p>

                    <div className={cn('mt-2 flex flex-col gap-3 rounded-[1.35rem] px-3 py-3.5 sm:flex-row sm:items-center', isDarkTheme ? 'bg-white/[0.06]' : 'bg-slate-100/88')}>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-brand text-white shadow-[0_14px_24px_rgba(255,99,33,0.26)]">
                        <Navigation className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkTheme ? 'text-white/42' : 'text-slate-400')}>
                          Tu siguiente parada
                        </p>
                        <p className="mt-1 truncate text-[13px] font-black">{selectedLocationLabel}</p>
                        <p className={cn('mt-1 text-[11px] font-bold', isDarkTheme ? 'text-white/62' : 'text-slate-500')}>
                          {selectedDistanceLabel} | {selectedEtaLabel}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePrepareRoute(selectedFalla)}
                        className="pointer-events-auto inline-flex h-[3rem] w-full shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_34px_rgba(15,23,42,0.22)] transition-colors hover:bg-slate-800 sm:w-auto"
                      >
                        Preparar ruta
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleShowDetail(selectedFalla)}
                      className={cn(
                        'pointer-events-auto mt-3 inline-flex h-[3rem] w-full items-center justify-center gap-2 rounded-[1.15rem] border px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-colors',
                        isDarkTheme ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Eye className="h-4 w-4" />
                      Ver detalle completo
                    </button>

                    <p className={cn('mt-3 text-[11px] font-bold leading-5', isDarkTheme ? 'text-white/48' : 'text-slate-400')}>
                      {selectedStatusNote}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}

          </div>
        ) : null}

        {activeRouteFalla && isRoutePreviewVisible ? (
          <NavigationRoutePreviewOverlay
            isDarkTheme={isDarkTheme}
            destinationName={activeRouteFalla.name}
            destinationArea={activeRouteFalla.neighborhood}
            currentStep={currentStep}
            routeSteps={routeData?.steps ?? []}
            distanceLabel={distanceLabel}
            durationLabel={durationLabel}
            statusCopy={routeStatusCopy}
            locationStatus={locationStatus}
            isRouteLoading={isRouteLoading}
            routeError={routeError}
            googleMapsUrl={googleMapsUrl}
            locationHelpVisible={showLocationHelp}
            onStart={() => { void handleStartGuidance(); }}
            onLocate={() => { void locateUser(); }}
            onFocusRoute={() => setFocusRouteToken((current) => current + 1)}
            onCancel={cancelRouteMode}
          />
        ) : null}

        {activeRouteFalla && isNavigationSceneActive && isGuidanceActive ? (
          <NavigationGuidanceOverlay
            currentStep={currentStep}
            currentStepLabel={currentStepLabel}
            distanceLabel={navigationDistanceLabel}
            durationLabel={navigationDurationLabel}
            durationSeconds={isGuidanceActive ? remainingDurationSeconds : routeData?.durationSeconds ?? null}
            destinationName={activeRouteFalla.name}
            destinationArea={activeRouteFalla.neighborhood}
            destinationLogoUrl={activeRouteFalla.logoUrl}
            routeProfile={routeProfile}
            hasReachedDestination={hasReachedDestination}
            voiceEnabled={voiceEnabled}
            voiceSupported={voiceSupported}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            onLocate={() => { void locateUser(); }}
            onFocusRoute={() => setFocusRouteToken((current) => current + 1)}
            onChangeProfile={handleChangeRouteProfile}
            onToggleVoice={toggleVoice}
            onPreviousStep={goToPreviousStep}
            onNextStep={goToNextStep}
            onStopGuidance={cancelRouteMode}
            onClose={cancelRouteMode}
          />
        ) : null}
      </div>
    </section>
  );
}

function areFallaMapPropsEqual(previous: FallaMapProps, next: FallaMapProps) {
  const previousUserPosition = previous.userPosition;
  const nextUserPosition = next.userPosition;

  return (
    previous.isDarkMode === next.isDarkMode
    && previous.variant === next.variant
    && previous.frameClassName === next.frameClassName
    && previous.mapHeightClassName === next.mapHeightClassName
    && previous.chromeMode === next.chromeMode
    && previous.heatmapEnabled === next.heatmapEnabled
    && previous.setHeatmapEnabled === next.setHeatmapEnabled
    && previous.fallasLiveModuleEnabled === next.fallasLiveModuleEnabled
    && previous.mapStyleId === next.mapStyleId
    && previous.mapSearchQuery === next.mapSearchQuery
    && previous.activeRouteFallaId === next.activeRouteFallaId
    && previous.activeRouteFalla?.id === next.activeRouteFalla?.id
    && previous.routeFallas === next.routeFallas
    && previous.externalRouteFocusToken === next.externalRouteFocusToken
    && (previous.externalRouteFallaIds ?? []).join('|') === (next.externalRouteFallaIds ?? []).join('|')
    && JSON.stringify(previous.externalRouteWaypoints ?? []) === JSON.stringify(next.externalRouteWaypoints ?? [])
    && previous.fallas === next.fallas
    && previous.agendaEvents === next.agendaEvents
    && previous.selectedDate === next.selectedDate
    && previous.selectedFalla?.id === next.selectedFalla?.id
    && previous.locationStatus === next.locationStatus
    && previous.watchPositionId === next.watchPositionId
    && previous.favorites === next.favorites
    && previousUserPosition?.[0] === nextUserPosition?.[0]
    && previousUserPosition?.[1] === nextUserPosition?.[1]
  );
}

export const FallaMap = React.memo(FallaMapComponent, areFallaMapPropsEqual);
FallaMap.displayName = 'FallaMap';

