import type { Falla } from '../data';
import { withCsrfRequestAsync } from './security';

interface PublicFallaItem {
  id?: number | string;
  name?: string;
  category?: string;
  section_name?: string;
  year?: number | string;
  commission_name?: string;
  description?: string;
  address?: string;
  neighborhood?: string;
  latitude?: number | string;
  longitude?: number | string;
  image_url?: string;
  prize_text?: string;
  artist_name?: string;
  route_url?: string;
  jcf_num?: number | string;
  budget_eur?: number | string | null;
  budget_label?: string;
  city?: string;
  favorites_count?: number | string;
  events_count?: number | string;
  status?: string;
}

interface PublicFallasResponse {
  ok?: boolean;
  items?: PublicFallaItem[];
}

interface GeoPortalFeatureProperties {
  objectid?: number | string | null;
  id_falla?: number | string | null;
  nombre?: string | null;
  seccion?: string | null;
  artista?: string | null;
  lema?: string | null;
  boceto?: string | null;
  experim?: number | string | null;
}

interface GeoPortalFeature {
  id?: number | string;
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: GeoPortalFeatureProperties;
}

interface GeoPortalFeatureCollection {
  features?: GeoPortalFeature[];
}

interface PublicFavoritesResponse {
  ok?: boolean;
  favorite?: boolean;
  favorites?: {
    fallas?: Array<number | string>;
  };
  gamification?: unknown;
}

interface PublicEventItem {
  id?: number | string;
  title?: string;
  description?: string;
  category_name?: string;
  category_color?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  falla_name?: string;
  is_featured?: boolean;
  route_url?: string;
}

interface PublicEventsResponse {
  ok?: boolean;
  items?: PublicEventItem[];
}

interface PublicNotificationItem {
  id?: number | string;
  title?: string;
  message?: string;
  commissionId?: number | string | null;
  commissionName?: string | null;
  isRead?: boolean;
  createdAt?: string;
}

interface PublicNotificationsResponse {
  ok?: boolean;
  items?: PublicNotificationItem[];
}

export interface DashboardEvent {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  categoryColor: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  lat: number;
  lng: number;
  fallaName: string;
  isFeatured: boolean;
  routeUrl?: string;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  commissionName: string;
  createdAt: string;
}

export function resolveDashboardBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');

  if (dashboardIndex === -1) {
    return '';
  }

  return pathname.slice(0, dashboardIndex);
}

function resolveApiUrl(fileName: string): string {
  return `${resolveDashboardBasePath() || ''}/api/${fileName}`;
}

function resolveStaticDataUrl(fileName: string): string {
  return `${resolveDashboardBasePath() || ''}/${fileName}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    throw new Error('SESSION_INVALID');
  }

  if (!response.ok) {
    throw new Error('REQUEST_FAILED');
  }

  return response.json() as Promise<T>;
}

function parsePrize(prizeText: string): number | undefined {
  const match = prizeText.match(/\b(\d+)\b/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function mapCategory(category: string | undefined): Falla['category'] {
  const normalizedCategory = (category || '').trim().toLowerCase();

  switch (normalizedCategory) {
    case 'infantil':
    case 'infantiles':
    case 'infantile':
    case 'inf':
    case 'child':
    case 'children':
    case 'kid':
    case 'kids':
      return 'Infantil';
    case 'experimental':
    case 'experimentales':
      return 'Experimental';
    default:
      return 'Principal';
  }
}

function repairMojibake(value: string): string {
  if (!/[ÃÂ]/.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function normalizeGeoPortalSection(section: string): string {
  const normalizedSection = repairMojibake(section).trim().toUpperCase();

  if (normalizedSection === '') {
    return 'Sin seccion';
  }

  if (normalizedSection === 'E') {
    return 'Especial';
  }

  const match = normalizedSection.match(/^([1-8])([A-Z])?$/);
  if (!match) {
    return normalizedSection;
  }

  const sectionNames: Record<string, string> = {
    '1': 'Primera',
    '2': 'Segunda',
    '3': 'Tercera',
    '4': 'Cuarta',
    '5': 'Quinta',
    '6': 'Sexta',
    '7': 'Septima',
    '8': 'Octava',
  };

  const label = sectionNames[match[1]] ?? normalizedSection;
  return match[2] ? `${label} ${match[2]}` : label;
}

function fallbackRouteUrl(lat: number, lng: number): string | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return undefined;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

function mapGeoPortalFeatureToDashboard(feature: GeoPortalFeature): Falla | null {
  const properties = feature.properties ?? {};
  const coordinates = feature.geometry?.coordinates ?? null;
  const name = repairMojibake(String(properties.nombre ?? '').trim());

  if (!name || !coordinates || coordinates.length < 2) {
    return null;
  }

  const lng = Number(coordinates[0] ?? 0);
  const lat = Number(coordinates[1] ?? 0);
  const section = normalizeGeoPortalSection(String(properties.seccion ?? ''));
  const artist = repairMojibake(String(properties.artista ?? '').trim()) || 'Artista pendiente';
  const lema = repairMojibake(String(properties.lema ?? '').trim());
  const id = String(properties.id_falla ?? feature.id ?? properties.objectid ?? '').trim();

  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const isExperimental = Number(properties.experim ?? 0) === 1;
  const description = lema
    ? `${fallbackDescription(name, section)} Lema: ${lema}.`
    : fallbackDescription(name, section);

  return {
    id,
    name,
    section,
    category: isExperimental ? 'Experimental' : 'Principal',
    lat,
    lng,
    description,
    artist,
    imageUrl: String(properties.boceto ?? '').trim(),
    neighborhood: 'Valencia',
    likes: 0,
    visitors: 0,
    routeUrl: fallbackRouteUrl(lat, lng),
    status: 'fallback',
  };
}

async function fetchFallbackFallasFromGeoPortal(): Promise<Falla[]> {
  try {
    const response = await fetch(resolveStaticDataUrl('tmp-fallas-mapserver.geojson'), {
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as GeoPortalFeatureCollection;
    const features = Array.isArray(payload.features) ? payload.features : [];

    return features
      .map(mapGeoPortalFeatureToDashboard)
      .filter((item): item is Falla => item !== null);
  } catch {
    return [];
  }
}

function fallbackDescription(name: string, section: string): string {
  return section
    ? `${name} forma parte de la sección ${section} y ya está disponible para explorar en el mapa de la app.`
    : `${name} ya está disponible para explorar en el mapa de la app.`;
}

export function hasValidCoordinates(falla: Pick<Falla, 'lat' | 'lng'>): boolean {
  return Number.isFinite(falla.lat) && Number.isFinite(falla.lng) && falla.lat !== 0 && falla.lng !== 0;
}

export function mapPublicFallaToDashboard(item: PublicFallaItem): Falla {
  const id = String(item.id ?? '');
  const name = (item.name || 'Falla sin nombre').trim();
  const section = (item.section_name || 'Sin sección').trim();
  const year = String(item.year ?? '').trim();
  const commissionName = (item.commission_name || '').trim();
  const description = (item.description || '').trim();
  const address = (item.address || '').trim();
  const neighborhood = (item.neighborhood || '').trim();
  const prizeText = (item.prize_text || '').trim();
  const lat = Number(item.latitude ?? 0);
  const lng = Number(item.longitude ?? 0);
  const favoritesCount = Number(item.favorites_count ?? 0);
  const eventsCount = Number(item.events_count ?? 0);
  const budgetEur = item.budget_eur === null || item.budget_eur === undefined ? NaN : Number(item.budget_eur);
  const jcfNum = String(item.jcf_num ?? '').trim();

  return {
    id,
    name,
    section,
    category: mapCategory(item.category),
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    description: description || fallbackDescription(name, section),
    artist: (item.artist_name || '').trim() || 'Artista pendiente',
    prize: parsePrize(prizeText),
    imageUrl: (item.image_url || '').trim(),
    neighborhood: neighborhood || address || 'Valencia',
    likes: 0,
    visitors: 0,
    address: address || undefined,
    routeUrl: (item.route_url || '').trim() || undefined,
    commissionName: commissionName || undefined,
    prizeText: prizeText || undefined,
    favoritesCount: Number.isFinite(favoritesCount) ? favoritesCount : 0,
    eventsCount: Number.isFinite(eventsCount) ? eventsCount : 0,
    status: (item.status || '').trim() || undefined,
    year: year || undefined,
    jcfNum: jcfNum || undefined,
    budgetEur: Number.isFinite(budgetEur) ? budgetEur : undefined,
    budgetLabel: (item.budget_label || '').trim() || undefined,
    city: (item.city || '').trim() || undefined,
  };
}

function mapPublicEventToDashboard(item: PublicEventItem): DashboardEvent {
  const lat = Number(item.latitude ?? 0);
  const lng = Number(item.longitude ?? 0);

  return {
    id: String(item.id ?? ''),
    title: (item.title || 'Evento sin titulo').trim(),
    description: (item.description || 'Evento sin descripcion.').trim(),
    categoryName: (item.category_name || 'Agenda').trim(),
    categoryColor: (item.category_color || '#ff7a4d').trim(),
    eventDate: (item.event_date || '').trim(),
    startTime: (item.start_time || '').trim(),
    endTime: (item.end_time || '').trim(),
    locationName: (item.location_name || 'Ubicacion pendiente').trim(),
    address: (item.address || '').trim(),
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    fallaName: (item.falla_name || '').trim(),
    isFeatured: Boolean(item.is_featured),
    routeUrl: (item.route_url || '').trim() || undefined,
  };
}

export async function fetchDashboardFallas(): Promise<Falla[]> {
  try {
    const payload = await fetchJson<PublicFallasResponse>(resolveApiUrl('fallas.php'));
    if (payload.ok === false) {
      throw new Error('REQUEST_FAILED');
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const mappedItems = items.map(mapPublicFallaToDashboard).filter((item) => item.id !== '');

    if (mappedItems.length > 0) {
      return mappedItems;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_INVALID') {
      throw error;
    }
  }

  return fetchFallbackFallasFromGeoPortal();
}

export async function fetchDashboardEvents(): Promise<DashboardEvent[]> {
  // Intentar cargar desde la agenda real primero, sin limitarla a un anio fijo.
  try {
    const agendaResponse = await fetchJson<{
      ok?: boolean;
      items?: Array<{
        id?: string | number;
        title?: string;
        description?: string;
        date?: string;
        time?: string;
        location?: string;
        type?: string;
        isLive?: boolean;
      }>;
    }>(resolveApiUrl('agenda.php'));

    if (agendaResponse.ok && Array.isArray(agendaResponse.items)) {
      const agendaEvents = agendaResponse.items
        .filter((item): item is typeof agendaResponse.items[number] => Boolean(item))
        .map((item) => ({
          id: String(item.id ?? ''),
          title: (item.title || 'Evento sin titulo').trim(),
          description: (item.description || 'Evento sin descripcion.').trim(),
          categoryName: (item.type || 'Agenda').trim(),
          categoryColor: '#ff7a4d',
          eventDate: (item.date || '').trim(),
          startTime: (item.time || '').trim(),
          endTime: '',
          locationName: (item.location || 'Valencia').trim(),
          address: '',
          lat: 0,
          lng: 0,
          fallaName: '',
          isFeatured: Boolean(item.isLive),
        } as DashboardEvent))
        .filter((item) => item.id !== '');

      if (agendaEvents.length > 0) {
        return agendaEvents;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_INVALID') {
      throw error;
    }
    // Si falla, intenta el endpoint antiguo
  }

  // Fallback al endpoint antiguo si no hay datos de agenda
  const payload = await fetchJson<PublicEventsResponse>(resolveApiUrl('events.php'));
  if (payload.ok === false) {
    throw new Error('REQUEST_FAILED');
  }
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items.map(mapPublicEventToDashboard).filter((item) => item.id !== '');
}

export async function fetchDashboardFavoriteIds(): Promise<string[]> {
  const payload = await fetchJson<PublicFavoritesResponse>(resolveApiUrl('favorites.php'));
  if (payload.ok === false) {
    throw new Error('REQUEST_FAILED');
  }
  const items = Array.isArray(payload.favorites?.fallas) ? payload.favorites?.fallas : [];

  return items.map((item) => String(item)).filter((item) => item !== '');
}

export async function fetchDashboardNotifications(): Promise<DashboardNotification[]> {
  const payload = await fetchJson<PublicNotificationsResponse>(resolveApiUrl('notifications.php'));
  if (payload.ok === false) {
    throw new Error('REQUEST_FAILED');
  }
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items
    .map((item) => ({
      id: String(item.id ?? '').trim(),
      title: String(item.title ?? '').trim(),
      message: String(item.message ?? '').trim(),
      commissionName: String(item.commissionName ?? '').trim(),
      createdAt: String(item.createdAt ?? '').trim(),
    }))
    .filter((item) => item.id !== '' && item.title !== '' && item.message !== '');
}

export async function toggleDashboardFavorite(type: 'falla' | 'event', id: number | string): Promise<PublicFavoritesResponse> {
  const response = await fetch(resolveApiUrl('favorites.php'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      id,
    }),
  }));

  if (response.status === 401) {
    throw new Error('SESSION_INVALID');
  }

  if (!response.ok) {
    throw new Error('REQUEST_FAILED');
  }

  const payload = await response.json() as PublicFavoritesResponse;
  if (payload.ok === false) {
    throw new Error('REQUEST_FAILED');
  }

  return payload;
}

export type AdminFallaUpdatePayload = {
  id: string;
  name: string;
  description: string;
  section_name: string;
  category: 'principal' | 'infantil' | 'experimental';
  address: string;
  neighborhood: string;
  latitude: string;
  longitude: string;
  artist_name: string;
  commission_name: string;
  prize_text: string;
  image_url: string;
  status: string;
  year: string;
};

export async function updateAdminFallaContent(data: AdminFallaUpdatePayload): Promise<Falla> {
  const response = await fetch(resolveApiUrl('admin/content.php'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'falla',
      data,
    }),
  }));

  if (response.status === 401) {
    throw new Error('SESSION_INVALID');
  }

  if (response.status === 403) {
    throw new Error('ADMIN_REQUIRED');
  }

  if (!response.ok) {
    throw new Error('REQUEST_FAILED');
  }

  const payload = await response.json() as { ok?: boolean; item?: PublicFallaItem; message?: string };
  if (payload.ok === false || !payload.item) {
    throw new Error(payload.message || 'REQUEST_FAILED');
  }

  return mapPublicFallaToDashboard(payload.item);
}
