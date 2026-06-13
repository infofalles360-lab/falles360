import type { Falla } from '../data';

export interface CachedAgendaEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  date: string;
  type: string;
  description: string;
  isLive?: boolean;
}

export interface CachedDailySignal {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string | null;
}

type CachedSection<T> = {
  updatedAt: string;
  value: T;
};

type DashboardBootstrapCache = {
  version: 1;
  savedAt: string;
  fallas?: CachedSection<Falla[]>;
  agendaEvents?: CachedSection<CachedAgendaEvent[]>;
  favorites?: CachedSection<string[]>;
  dailySignal?: CachedSection<CachedDailySignal | null>;
};

export interface DashboardBootstrapSnapshot {
  agendaEvents: CachedAgendaEvent[];
  dailySignal: CachedDailySignal | null;
  fallas: Falla[];
  favorites: string[];
  hasAnyData: boolean;
  isFresh: {
    agendaEvents: boolean;
    dailySignal: boolean;
    fallas: boolean;
    favorites: boolean;
  };
  savedAt: string | null;
}

export interface DashboardBootstrapCachePatch {
  agendaEvents?: CachedAgendaEvent[];
  dailySignal?: CachedDailySignal | null;
  fallas?: Falla[];
  favorites?: string[];
}

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleRequestWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: { timeout?: number }
  ) => number;
};

const STORAGE_KEY = 'falles360.dashboard-bootstrap.v1';
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const SECTION_TTL_MS = {
  agendaEvents: 1000 * 60 * 12,
  dailySignal: 1000 * 60 * 20,
  fallas: 1000 * 60 * 20,
  favorites: 1000 * 60 * 8,
} as const;

function emptySnapshot(): DashboardBootstrapSnapshot {
  return {
    fallas: [],
    agendaEvents: [],
    favorites: [],
    dailySignal: null,
    hasAnyData: false,
    isFresh: {
      fallas: false,
      agendaEvents: false,
      favorites: false,
      dailySignal: false,
    },
    savedAt: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRecentIsoDate(value: string | undefined, maxAgeMs: number): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs;
}

function sanitizeFallas(value: unknown): Falla[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Falla => (
    isRecord(item)
    && typeof item.id === 'string'
    && item.id.trim() !== ''
    && typeof item.name === 'string'
    && typeof item.section === 'string'
    && typeof item.category === 'string'
    && typeof item.lat === 'number'
    && Number.isFinite(item.lat)
    && typeof item.lng === 'number'
    && Number.isFinite(item.lng)
    && typeof item.description === 'string'
    && typeof item.artist === 'string'
    && typeof item.neighborhood === 'string'
    && typeof item.likes === 'number'
    && Number.isFinite(item.likes)
    && typeof item.visitors === 'number'
    && Number.isFinite(item.visitors)
  ));
}

function sanitizeAgendaEvents(value: unknown): CachedAgendaEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CachedAgendaEvent => (
    isRecord(item)
    && typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.time === 'string'
    && typeof item.location === 'string'
    && typeof item.date === 'string'
    && typeof item.type === 'string'
    && typeof item.description === 'string'
  ));
}

function sanitizeFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item !== '');
}

function sanitizeDailySignal(value: unknown): CachedDailySignal | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = Number(value.id ?? 0);
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const excerpt = typeof value.excerpt === 'string' ? value.excerpt.trim() : '';
  const category = typeof value.category === 'string' ? value.category.trim() : '';
  const publishedAt = typeof value.publishedAt === 'string' ? value.publishedAt : null;

  if (!Number.isFinite(id) || id <= 0 || title === '' || excerpt === '' || category === '') {
    return null;
  }

  return {
    id,
    title,
    excerpt,
    category,
    publishedAt,
  };
}

function readStoredCache(): DashboardBootstrapCache | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.savedAt !== 'string') {
      return null;
    }

    if (!isRecentIsoDate(parsed.savedAt, MAX_CACHE_AGE_MS)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const cache: DashboardBootstrapCache = {
      version: 1,
      savedAt: parsed.savedAt,
    };

    if (isRecord(parsed.fallas) && typeof parsed.fallas.updatedAt === 'string') {
      cache.fallas = {
        updatedAt: parsed.fallas.updatedAt,
        value: sanitizeFallas(parsed.fallas.value),
      };
    }

    if (isRecord(parsed.agendaEvents) && typeof parsed.agendaEvents.updatedAt === 'string') {
      cache.agendaEvents = {
        updatedAt: parsed.agendaEvents.updatedAt,
        value: sanitizeAgendaEvents(parsed.agendaEvents.value),
      };
    }

    if (isRecord(parsed.favorites) && typeof parsed.favorites.updatedAt === 'string') {
      cache.favorites = {
        updatedAt: parsed.favorites.updatedAt,
        value: sanitizeFavorites(parsed.favorites.value),
      };
    }

    if (isRecord(parsed.dailySignal) && typeof parsed.dailySignal.updatedAt === 'string') {
      cache.dailySignal = {
        updatedAt: parsed.dailySignal.updatedAt,
        value: sanitizeDailySignal(parsed.dailySignal.value),
      };
    }

    return cache;
  } catch {
    return null;
  }
}

function isSectionFresh(updatedAt: string | undefined, ttlMs: number): boolean {
  return isRecentIsoDate(updatedAt, ttlMs);
}

export function readDashboardBootstrapSnapshot(): DashboardBootstrapSnapshot {
  const cache = readStoredCache();
  if (!cache) {
    return emptySnapshot();
  }

  const snapshot: DashboardBootstrapSnapshot = {
    fallas: cache.fallas?.value ?? [],
    agendaEvents: cache.agendaEvents?.value ?? [],
    favorites: cache.favorites?.value ?? [],
    dailySignal: cache.dailySignal?.value ?? null,
    hasAnyData: false,
    isFresh: {
      fallas: isSectionFresh(cache.fallas?.updatedAt, SECTION_TTL_MS.fallas),
      agendaEvents: isSectionFresh(cache.agendaEvents?.updatedAt, SECTION_TTL_MS.agendaEvents),
      favorites: isSectionFresh(cache.favorites?.updatedAt, SECTION_TTL_MS.favorites),
      dailySignal: isSectionFresh(cache.dailySignal?.updatedAt, SECTION_TTL_MS.dailySignal),
    },
    savedAt: cache.savedAt,
  };

  snapshot.hasAnyData = snapshot.fallas.length > 0
    || snapshot.agendaEvents.length > 0
    || snapshot.favorites.length > 0
    || snapshot.dailySignal !== null;

  return snapshot;
}

export function writeDashboardBootstrapCache(patch: DashboardBootstrapCachePatch): void {
  if (typeof window === 'undefined') {
    return;
  }

  const nextTimestamp = new Date().toISOString();
  const current = readStoredCache() ?? {
    version: 1 as const,
    savedAt: nextTimestamp,
  };

  const nextCache: DashboardBootstrapCache = {
    ...current,
    savedAt: nextTimestamp,
  };

  if (Object.prototype.hasOwnProperty.call(patch, 'fallas')) {
    nextCache.fallas = {
      updatedAt: nextTimestamp,
      value: sanitizeFallas(patch.fallas),
    };
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'agendaEvents')) {
    nextCache.agendaEvents = {
      updatedAt: nextTimestamp,
      value: sanitizeAgendaEvents(patch.agendaEvents),
    };
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'favorites')) {
    nextCache.favorites = {
      updatedAt: nextTimestamp,
      value: sanitizeFavorites(patch.favorites),
    };
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'dailySignal')) {
    nextCache.dailySignal = {
      updatedAt: nextTimestamp,
      value: sanitizeDailySignal(patch.dailySignal),
    };
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCache));
  } catch {
    // La app sigue funcionando aunque no se pueda persistir el bootstrap local.
  }
}

export function scheduleDashboardIdleTask(task: () => void, timeout = 900): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const idleWindow = window as IdleRequestWindow;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => task(), { timeout });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, Math.max(120, timeout));
  return () => window.clearTimeout(handle);
}

export function warmDashboardImageUrls(urls: string[], limit = 8): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return;
  }

  Array.from(new Set(urls.map((item) => item.trim()).filter((item) => item !== '')))
    .slice(0, limit)
    .forEach((url) => {
      const image = new Image();
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.src = url;
    });
}
