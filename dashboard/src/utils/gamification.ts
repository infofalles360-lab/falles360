import { resolveDashboardBasePath } from './publicApp';
import { ensureCsrfToken, withCsrfHeaders } from './security';

export interface GamificationLevel {
  number: number;
  name: string;
  progressPercent: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
}

export interface GamificationProfile {
  xpTotal: number;
  level: GamificationLevel;
  totals: {
    distinctFallasVisited: number;
    totalVisitEvents: number;
    routesCompleted: number;
    routesStarted: number;
    neighborhoodsExplored: number;
    neighborhoodsCompleted: number;
    badgesUnlocked: number;
    favoriteFallasCount: number;
    contentReadsCount: number;
    navigationUsesCount: number;
    visitedFallaIds: number[];
  };
  progress: {
    totalProgressPercent: number;
    fallasCompletionPercent: number;
  };
  catalogTotals: {
    totalFallas: number;
    totalBadges: number;
    totalRoutes: number;
    totalNeighborhoods: number;
    totalZones: number;
  };
  lastActivityAt: string | null;
}

export interface GamificationBadge {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  rarity: 'common' | 'special' | 'epic' | 'legendary';
  iconUrl: string | null;
  unlockConditionText: string;
  isActive: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
  sortOrder: number;
}

export interface GamificationRoute {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  minCompletionPercentage: number;
  totalFallas: number;
  visitedFallas: number;
  progressPercent: number;
  isCompleted: boolean;
  completedAt: string | null;
  lastEvaluatedAt: string | null;
}

export interface GamificationZone {
  id: number;
  name: string;
  slug: string;
  description: string;
  isEmblematic: boolean;
  totalFallas: number;
  visitedFallas: number;
  progressPercent: number;
  isCompleted: boolean;
}

export interface GamificationNeighborhood {
  neighborhood: string;
  totalFallas: number;
  visitedFallas: number;
  progressPercent: number;
  isCompleted: boolean;
  lastVisitAt: string | null;
}

export interface GamificationActivityItem {
  id: number;
  eventType: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  occurredAt: string | null;
  meta: Record<string, unknown>;
}

export interface GamificationNotification {
  type: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
}

export interface GamificationStats {
  profile: GamificationProfile;
  xpBreakdown: Array<{
    eventType: string;
    xpTotal: number;
    eventsTotal: number;
  }>;
  context: Record<string, number>;
}

export interface GamificationBundle {
  profile: GamificationProfile;
  routes: GamificationRoute[];
  zones: {
    curatedZones: GamificationZone[];
    completedZones: number;
  };
  neighborhoods: {
    items: GamificationNeighborhood[];
    completedNeighborhoods: number;
    exploredNeighborhoods: number;
  };
  recentActivity: GamificationActivityItem[];
  notifications: GamificationNotification[];
  newBadges: GamificationBadge[];
  newlyCompletedRoutes: GamificationRoute[];
}

interface ApiResponse {
  ok?: boolean;
  message?: string;
  profile?: unknown;
  routes?: unknown[];
  zones?: unknown;
  neighborhoods?: unknown;
  recent_activity?: unknown[];
  recentActivity?: unknown[];
  notifications?: unknown[];
  new_badges?: unknown[];
  newBadges?: unknown[];
  newly_completed_routes?: unknown[];
  newlyCompletedRoutes?: unknown[];
  items?: unknown[];
  xp_breakdown?: unknown[];
  xpBreakdown?: unknown[];
  context?: Record<string, number>;
  gamification?: ApiResponse;
}

function resolveGamificationApiUrl(fileName: string): string {
  return `${resolveDashboardBasePath() || ''}/api/gamification/${fileName}`;
}

function ensureOk(payload: ApiResponse): ApiResponse {
  if (payload.ok === false) {
    throw new Error(payload.message || 'REQUEST_FAILED');
  }

  return payload;
}

async function fetchGamificationJson<T extends ApiResponse>(url: string, init?: RequestInit): Promise<T> {
  const method = String(init?.method ?? 'GET').toUpperCase();
  const headers = withCsrfHeaders({
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  });

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = await ensureCsrfToken();

    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers,
  });

  if (response.status === 401) {
    throw new Error('SESSION_INVALID');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || 'REQUEST_FAILED');
  }

  return payload as T;
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapLevel(input: any): GamificationLevel {
  return {
    number: asNumber(input?.number),
    name: asString(input?.name) || 'Curioso',
    progressPercent: asNumber(input?.progress_percent ?? input?.progressPercent),
    currentLevelXp: asNumber(input?.current_level_xp ?? input?.currentLevelXp),
    nextLevelXp: input?.next_level_xp ?? input?.nextLevelXp ?? null,
  };
}

function mapProfile(input: any): GamificationProfile {
  return {
    xpTotal: asNumber(input?.xp_total ?? input?.xpTotal),
    level: mapLevel(input?.level),
    totals: {
      distinctFallasVisited: asNumber(input?.totals?.distinct_fallas_visited ?? input?.totals?.distinctFallasVisited),
      totalVisitEvents: asNumber(input?.totals?.total_visit_events ?? input?.totals?.totalVisitEvents),
      routesCompleted: asNumber(input?.totals?.routes_completed ?? input?.totals?.routesCompleted),
      routesStarted: asNumber(input?.totals?.routes_started ?? input?.totals?.routesStarted),
      neighborhoodsExplored: asNumber(input?.totals?.neighborhoods_explored ?? input?.totals?.neighborhoodsExplored),
      neighborhoodsCompleted: asNumber(input?.totals?.neighborhoods_completed ?? input?.totals?.neighborhoodsCompleted),
      badgesUnlocked: asNumber(input?.totals?.badges_unlocked ?? input?.totals?.badgesUnlocked),
      favoriteFallasCount: asNumber(input?.totals?.favorite_fallas_count ?? input?.totals?.favoriteFallasCount),
      contentReadsCount: asNumber(input?.totals?.content_reads_count ?? input?.totals?.contentReadsCount),
      navigationUsesCount: asNumber(input?.totals?.navigation_uses_count ?? input?.totals?.navigationUsesCount),
      visitedFallaIds: Array.isArray(input?.totals?.visited_falla_ids ?? input?.totals?.visitedFallaIds)
        ? (input.totals.visited_falla_ids ?? input.totals.visitedFallaIds).map((value: unknown) => asNumber(value))
        : [],
    },
    progress: {
      totalProgressPercent: asNumber(input?.progress?.total_progress_percent ?? input?.progress?.totalProgressPercent),
      fallasCompletionPercent: asNumber(input?.progress?.fallas_completion_percent ?? input?.progress?.fallasCompletionPercent),
    },
    catalogTotals: {
      totalFallas: asNumber(input?.catalog_totals?.total_fallas ?? input?.catalogTotals?.totalFallas),
      totalBadges: asNumber(input?.catalog_totals?.total_badges ?? input?.catalogTotals?.totalBadges),
      totalRoutes: asNumber(input?.catalog_totals?.total_routes ?? input?.catalogTotals?.totalRoutes),
      totalNeighborhoods: asNumber(input?.catalog_totals?.total_neighborhoods ?? input?.catalogTotals?.totalNeighborhoods),
      totalZones: asNumber(input?.catalog_totals?.total_zones ?? input?.catalogTotals?.totalZones),
    },
    lastActivityAt: input?.last_activity_at ?? input?.lastActivityAt ?? null,
  };
}

function mapBadge(input: any): GamificationBadge {
  return {
    id: asNumber(input?.id),
    name: asString(input?.name),
    slug: asString(input?.slug),
    description: asString(input?.description),
    category: asString(input?.category),
    rarity: (asString(input?.rarity) as GamificationBadge['rarity']) || 'common',
    iconUrl: input?.icon_url ?? input?.iconUrl ?? null,
    unlockConditionText: asString(input?.unlock_condition_text ?? input?.unlockConditionText),
    isActive: Boolean(input?.is_active ?? input?.isActive ?? true),
    isUnlocked: Boolean(input?.is_unlocked ?? input?.isUnlocked ?? false),
    unlockedAt: input?.unlocked_at ?? input?.unlockedAt ?? null,
    sortOrder: asNumber(input?.sort_order ?? input?.sortOrder),
  };
}

function mapRoute(input: any): GamificationRoute {
  return {
    id: asNumber(input?.id),
    name: asString(input?.name),
    slug: asString(input?.slug),
    description: asString(input?.description),
    category: asString(input?.category),
    minCompletionPercentage: asNumber(input?.min_completion_percentage ?? input?.minCompletionPercentage),
    totalFallas: asNumber(input?.total_fallas ?? input?.totalFallas),
    visitedFallas: asNumber(input?.visited_fallas ?? input?.visitedFallas),
    progressPercent: asNumber(input?.progress_percent ?? input?.progressPercent),
    isCompleted: Boolean(input?.is_completed ?? input?.isCompleted ?? false),
    completedAt: input?.completed_at ?? input?.completedAt ?? null,
    lastEvaluatedAt: input?.last_evaluated_at ?? input?.lastEvaluatedAt ?? null,
  };
}

function mapZone(input: any): GamificationZone {
  return {
    id: asNumber(input?.id),
    name: asString(input?.name),
    slug: asString(input?.slug),
    description: asString(input?.description),
    isEmblematic: Boolean(input?.is_emblematic ?? input?.isEmblematic ?? false),
    totalFallas: asNumber(input?.total_fallas ?? input?.totalFallas),
    visitedFallas: asNumber(input?.visited_fallas ?? input?.visitedFallas),
    progressPercent: asNumber(input?.progress_percent ?? input?.progressPercent),
    isCompleted: Boolean(input?.is_completed ?? input?.isCompleted ?? false),
  };
}

function mapNeighborhood(input: any): GamificationNeighborhood {
  return {
    neighborhood: asString(input?.neighborhood),
    totalFallas: asNumber(input?.total_fallas ?? input?.totalFallas),
    visitedFallas: asNumber(input?.visited_fallas ?? input?.visitedFallas),
    progressPercent: asNumber(input?.progress_percent ?? input?.progressPercent),
    isCompleted: Boolean(input?.is_completed ?? input?.isCompleted ?? false),
    lastVisitAt: input?.last_visit_at ?? input?.lastVisitAt ?? null,
  };
}

function mapActivity(input: any): GamificationActivityItem {
  return {
    id: asNumber(input?.id),
    eventType: asString(input?.event_type ?? input?.eventType),
    title: asString(input?.title),
    body: asString(input?.body),
    relatedEntityType: input?.related_entity_type ?? input?.relatedEntityType ?? null,
    relatedEntityId: input?.related_entity_id ?? input?.relatedEntityId ?? null,
    occurredAt: input?.occurred_at ?? input?.occurredAt ?? null,
    meta: typeof input?.meta === 'object' && input?.meta !== null ? input.meta : {},
  };
}

function mapNotification(input: any): GamificationNotification {
  return {
    type: asString(input?.type),
    title: asString(input?.title),
    message: asString(input?.message),
    payload: typeof input?.payload === 'object' && input?.payload !== null ? input.payload : {},
  };
}

export function mapGamificationBundle(payload: ApiResponse): GamificationBundle {
  return {
    profile: mapProfile(payload.profile),
    routes: Array.isArray(payload.routes) ? payload.routes.map(mapRoute) : [],
    zones: {
      curatedZones: Array.isArray((payload.zones as any)?.curated_zones ?? (payload.zones as any)?.curatedZones)
        ? (((payload.zones as any)?.curated_zones ?? (payload.zones as any)?.curatedZones) as unknown[]).map(mapZone)
        : [],
      completedZones: asNumber((payload.zones as any)?.completed_zones ?? (payload.zones as any)?.completedZones),
    },
    neighborhoods: {
      items: Array.isArray((payload.neighborhoods as any)?.items)
        ? ((payload.neighborhoods as any).items as unknown[]).map(mapNeighborhood)
        : [],
      completedNeighborhoods: asNumber((payload.neighborhoods as any)?.completed_neighborhoods ?? (payload.neighborhoods as any)?.completedNeighborhoods),
      exploredNeighborhoods: asNumber((payload.neighborhoods as any)?.explored_neighborhoods ?? (payload.neighborhoods as any)?.exploredNeighborhoods),
    },
    recentActivity: (Array.isArray(payload.recent_activity) ? payload.recent_activity : Array.isArray(payload.recentActivity) ? payload.recentActivity : []).map(mapActivity),
    notifications: (Array.isArray(payload.notifications) ? payload.notifications : []).map(mapNotification),
    newBadges: (Array.isArray(payload.new_badges) ? payload.new_badges : Array.isArray(payload.newBadges) ? payload.newBadges : []).map(mapBadge),
    newlyCompletedRoutes: (Array.isArray(payload.newly_completed_routes) ? payload.newly_completed_routes : Array.isArray(payload.newlyCompletedRoutes) ? payload.newlyCompletedRoutes : []).map(mapRoute),
  };
}

export async function fetchGamificationProfile(): Promise<GamificationBundle> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('profile.php')));
  return mapGamificationBundle(payload);
}

export async function fetchGamificationBadges(): Promise<GamificationBadge[]> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('badges.php')));
  return Array.isArray(payload.items) ? payload.items.map(mapBadge) : [];
}

export async function fetchGamificationStats(): Promise<GamificationStats> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('stats.php')));
  return {
    profile: mapProfile(payload.profile),
    xpBreakdown: (Array.isArray(payload.xp_breakdown) ? payload.xp_breakdown : Array.isArray(payload.xpBreakdown) ? payload.xpBreakdown : []).map((item: any) => ({
      eventType: asString(item?.event_type ?? item?.eventType),
      xpTotal: asNumber(item?.xp_total ?? item?.xpTotal),
      eventsTotal: asNumber(item?.events_total ?? item?.eventsTotal),
    })),
    context: typeof payload.context === 'object' && payload.context !== null ? payload.context : {},
  };
}

export async function recordFallaVisit(input: { fallaId: number; latitude: number; longitude: number; radiusMeters?: number; visitSource?: string; }): Promise<GamificationBundle & { distanceMeters: number; alreadyRecorded: boolean; }> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('visit.php'), {
    method: 'POST',
    body: JSON.stringify(input),
  }));
  const bundle = mapGamificationBundle(payload);

  return {
    ...bundle,
    distanceMeters: asNumber((payload as any).distance_meters ?? (payload as any).distanceMeters),
    alreadyRecorded: Boolean((payload as any).already_recorded ?? (payload as any).alreadyRecorded ?? false),
  };
}

export async function trackNavigationUse(input: { fallaId: number; mode?: string; }): Promise<GamificationBundle> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('navigation.php'), {
    method: 'POST',
    body: JSON.stringify(input),
  }));
  return mapGamificationBundle(payload);
}

export async function trackContentView(input: { fallaId: number; section?: string; }): Promise<GamificationBundle> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('content-view.php'), {
    method: 'POST',
    body: JSON.stringify(input),
  }));
  return mapGamificationBundle(payload);
}

export async function refreshGamificationRoutes(): Promise<GamificationBundle> {
  const payload = ensureOk(await fetchGamificationJson<ApiResponse>(resolveGamificationApiUrl('route-complete.php'), {
    method: 'POST',
  }));
  return mapGamificationBundle(payload);
}

export function extractGamificationFromFavoritePayload(payload: unknown): GamificationBundle | null {
  const response = payload as ApiResponse | null;
  if (!response?.gamification) {
    return null;
  }

  return mapGamificationBundle(response.gamification);
}
