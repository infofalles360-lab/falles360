import { resolveDashboardBasePath } from './publicApp';

export interface DashboardHeatPoint {
  intensity: number;
  lat: number;
  lng: number;
}

export interface DashboardHeatHighlights {
  hottestZoneLabel: string | null;
  topFalla: {
    id: string;
    name: string;
    score: number;
    sectionName: string;
  } | null;
  topNeighborhood: {
    name: string;
    score: number;
  } | null;
}

interface DashboardHeatmapResponse {
  heatpoints?: Array<{
    intensity?: number | string;
    lat?: number | string;
    lng?: number | string;
  }>;
  highlights?: {
    hottest_zone_label?: string | null;
    top_falla?: {
      id?: number | string;
      name?: string;
      score?: number | string;
      section_name?: string;
    } | null;
    top_neighborhood?: {
      name?: string;
      score?: number | string;
    } | null;
  };
  message?: string;
  ok?: boolean;
  top_fallas?: Array<number | string>;
  updated_at?: string | null;
}

export interface DashboardHeatmapPayload {
  heatPoints: DashboardHeatPoint[];
  highlights: DashboardHeatHighlights;
  topFallaIds: string[];
  updatedAt: string | null;
}

function resolveHeatmapEndpoint(): string {
  if (import.meta.env.DEV) {
    return '/api/map/heat';
  }

  return `${resolveDashboardBasePath() || ''}/api/map/heat.php`;
}

function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export async function fetchDashboardHeatmap(
  bbox: string,
  zoom: number,
  range: string,
  signal?: AbortSignal,
): Promise<DashboardHeatmapPayload> {
  const endpoint = new URL(resolveHeatmapEndpoint(), window.location.origin);
  endpoint.searchParams.set('bbox', bbox);
  endpoint.searchParams.set('zoom', String(Math.round(zoom)));
  endpoint.searchParams.set('range', range);

  const response = await fetch(endpoint.toString(), {
    credentials: 'same-origin',
    signal,
  });

  if (response.status === 401) {
    throw new Error('SESSION_INVALID');
  }

  if (!response.ok) {
    throw new Error('REQUEST_FAILED');
  }

  const payload = await response.json() as DashboardHeatmapResponse;
  if (payload.ok === false) {
    throw new Error(typeof payload.message === 'string' && payload.message.trim() !== '' ? payload.message : 'REQUEST_FAILED');
  }

  const heatPoints = Array.isArray(payload.heatpoints)
    ? payload.heatpoints
      .map((point) => ({
        intensity: clampIntensity(Number(point.intensity ?? 0)),
        lat: Number(point.lat ?? 0),
        lng: Number(point.lng ?? 0),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng) && point.lat !== 0 && point.lng !== 0 && point.intensity > 0)
    : [];

  const topFallaIds = Array.isArray(payload.top_fallas)
    ? payload.top_fallas.map((value) => String(value)).filter((value) => value !== '')
    : [];

  const topFalla = payload.highlights?.top_falla && payload.highlights.top_falla.id != null
    ? {
        id: String(payload.highlights.top_falla.id),
        name: String(payload.highlights.top_falla.name ?? '').trim(),
        score: Number(payload.highlights.top_falla.score ?? 0),
        sectionName: String(payload.highlights.top_falla.section_name ?? '').trim(),
      }
    : null;

  const topNeighborhood = payload.highlights?.top_neighborhood?.name
    ? {
        name: String(payload.highlights.top_neighborhood.name).trim(),
        score: Number(payload.highlights.top_neighborhood.score ?? 0),
      }
    : null;

  return {
    heatPoints,
    highlights: {
      hottestZoneLabel: payload.highlights?.hottest_zone_label ? String(payload.highlights.hottest_zone_label).trim() : null,
      topFalla,
      topNeighborhood,
    },
    topFallaIds,
    updatedAt: typeof payload.updated_at === 'string' && payload.updated_at.trim() !== '' ? payload.updated_at : null,
  };
}
