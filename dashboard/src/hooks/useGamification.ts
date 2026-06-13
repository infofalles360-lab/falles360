import { useEffect, useRef, useState } from 'react';
import type { GamificationBadge, GamificationBundle, GamificationNotification, GamificationStats } from '../utils/gamification';
import {
  extractGamificationFromFavoritePayload,
  fetchGamificationBadges,
  fetchGamificationProfile,
  fetchGamificationStats,
  recordFallaVisit,
  refreshGamificationRoutes,
  trackContentView,
  trackNavigationUse,
} from '../utils/gamification';

const PASSPORT_SHOWCASE_VIEWER_KEYS = new Set(['marc-baixauli']);

export interface QueuedGamificationNotification extends GamificationNotification {
  id: string;
}

export interface QueuedGamificationCelebration extends Omit<GamificationBadge, 'id'> {
  badgeId: number;
  id: string;
}

function nextNotificationId(seed: number): string {
  return `gamification-${Date.now()}-${seed}`;
}

function seenBadgesStorageKey(viewerKey: string): string {
  return `falles360.gamification.seen-badges.v1.${viewerKey}`;
}

function readSeenBadgeSlugs(viewerKey: string): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(seenBadgesStorageKey(viewerKey));
    const parsed = raw ? JSON.parse(raw) : [];

    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    );
  } catch {
    return new Set();
  }
}

function writeSeenBadgeSlugs(viewerKey: string, slugs: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      seenBadgesStorageKey(viewerKey),
      JSON.stringify(Array.from(new Set(slugs)))
    );
  } catch {
    // La gamificacion sigue funcionando aunque falle la persistencia local.
  }
}

function mergeUnlockedBadges(current: GamificationBadge[], unlocked: GamificationBadge[]): GamificationBadge[] {
  if (unlocked.length === 0) {
    return current;
  }

  const unlockedBySlug = new Map(unlocked.map((badge) => [badge.slug, badge]));

  return current.map((badge) => unlockedBySlug.get(badge.slug) ?? badge);
}

function shouldUseFullPassportShowcase(viewerKey: string): boolean {
  return PASSPORT_SHOWCASE_VIEWER_KEYS.has(viewerKey);
}

function unlockAllBadges(items: GamificationBadge[]): GamificationBadge[] {
  const unlockedAt = new Date().toISOString();

  return items.map((item) => ({
    ...item,
    isUnlocked: true,
    unlockedAt: item.unlockedAt ?? unlockedAt,
  }));
}

function passportCompletionPercent(bundle: GamificationBundle): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        bundle.profile.level.progressPercent
        ?? bundle.profile.progress.totalProgressPercent
        ?? 0
      )
    )
  );
}

function unlockBadgesForProgress(items: GamificationBadge[], percent: number): GamificationBadge[] {
  if (items.length === 0 || percent <= 0) {
    return items;
  }

  const unlockedAt = new Date().toISOString();
  const targetUnlockedCount = Math.min(items.length, Math.ceil((items.length * percent) / 100));
  const alreadyUnlockedCount = items.filter((item) => item.isUnlocked).length;

  if (alreadyUnlockedCount >= targetUnlockedCount) {
    return items;
  }

  return items
    .map((item, index) => ({
      ...item,
      isUnlocked: item.isUnlocked || index < targetUnlockedCount,
      unlockedAt: item.isUnlocked ? item.unlockedAt : (index < targetUnlockedCount ? unlockedAt : item.unlockedAt),
    }));
}

function normalizeBundleBadgeTotals(bundle: GamificationBundle, displayedBadges: GamificationBadge[]): GamificationBundle {
  const badgesUnlocked = displayedBadges.filter((item) => item.isUnlocked).length;
  const totalBadges = displayedBadges.length || bundle.profile.catalogTotals.totalBadges;

  return {
    ...bundle,
    profile: {
      ...bundle.profile,
      totals: {
        ...bundle.profile.totals,
        badgesUnlocked: Math.max(bundle.profile.totals.badgesUnlocked, badgesUnlocked),
      },
      catalogTotals: {
        ...bundle.profile.catalogTotals,
        totalBadges,
      },
    },
  };
}

function completeBadgeTotals(bundle: GamificationBundle, totalBadges: number): GamificationBundle {
  return {
    ...bundle,
    profile: {
      ...bundle.profile,
      totals: {
        ...bundle.profile.totals,
        badgesUnlocked: totalBadges,
      },
      progress: {
        ...bundle.profile.progress,
        totalProgressPercent: Math.max(bundle.profile.progress.totalProgressPercent, 100),
      },
      catalogTotals: {
        ...bundle.profile.catalogTotals,
        totalBadges,
      },
    },
  };
}

export function useGamification(enabled: boolean, viewerKey?: string | null) {
  const [bundle, setBundle] = useState<GamificationBundle | null>(null);
  const [badges, setBadges] = useState<GamificationBadge[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<QueuedGamificationNotification[]>([]);
  const [celebrations, setCelebrations] = useState<QueuedGamificationCelebration[]>([]);
  const notificationSeedRef = useRef(0);
  const normalizedViewerKey = viewerKey?.trim() || 'default';
  const usesFullPassportShowcase = shouldUseFullPassportShowcase(normalizedViewerKey);

  const queueNotifications = (items: GamificationNotification[]) => {
    const visibleItems = items.filter((item) => item.type !== 'navigation_start');

    if (visibleItems.length === 0) {
      return;
    }

    setNotifications((current) => [
      ...current,
      ...visibleItems.map((item) => {
        notificationSeedRef.current += 1;
        return {
          ...item,
          id: nextNotificationId(notificationSeedRef.current),
        };
      }),
    ]);
  };

  const queueCelebrations = (items: GamificationBadge[]) => {
    if (items.length === 0) {
      return;
    }

    setCelebrations((current) => [
      ...current,
      ...items.map((item) => {
        notificationSeedRef.current += 1;
        return {
          ...item,
          badgeId: item.id,
          id: nextNotificationId(notificationSeedRef.current),
        };
      }),
    ]);
  };

  const queueNotification = (item: GamificationNotification) => {
    queueNotifications([item]);
  };

  const markBadgesAsSeen = (items: GamificationBadge[]) => {
    if (items.length === 0) {
      return;
    }

    const seen = readSeenBadgeSlugs(normalizedViewerKey);
    items.forEach((item) => {
      if (item.slug) {
        seen.add(item.slug);
      }
    });
    writeSeenBadgeSlugs(normalizedViewerKey, Array.from(seen));
  };

  const hydrateUnlockedBadgeCelebrations = (items: GamificationBadge[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    const unlockedBadges = [...items]
      .filter((item) => item.isUnlocked)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    if (unlockedBadges.length === 0) {
      return;
    }

    if (usesFullPassportShowcase) {
      queueCelebrations(unlockedBadges);
      return;
    }

    const storageKey = seenBadgesStorageKey(normalizedViewerKey);
    const hasStoredState = window.localStorage.getItem(storageKey) !== null;

    if (!hasStoredState) {
      writeSeenBadgeSlugs(
        normalizedViewerKey,
        unlockedBadges.map((item) => item.slug)
      );

      const preferredBadge = unlockedBadges.find((item) => item.slug === 'primera-falla') ?? unlockedBadges[0];
      if (preferredBadge) {
        queueCelebrations([preferredBadge]);
      }
      return;
    }

    const seen = readSeenBadgeSlugs(normalizedViewerKey);
    const unseen = unlockedBadges.filter((item) => !seen.has(item.slug));

    if (unseen.length === 0) {
      return;
    }

    writeSeenBadgeSlugs(
      normalizedViewerKey,
      [...Array.from(seen), ...unlockedBadges.map((item) => item.slug)]
    );
    queueCelebrations(unseen);
  };

  const applyBundle = (nextBundle: GamificationBundle) => {
    const progressPercent = passportCompletionPercent(nextBundle);
    const displayedBadges = usesFullPassportShowcase ? unlockAllBadges(badges) : unlockBadgesForProgress(badges, progressPercent);
    const displayedBundle = usesFullPassportShowcase
      ? completeBadgeTotals(nextBundle, displayedBadges.length || nextBundle.profile.catalogTotals.totalBadges)
      : normalizeBundleBadgeTotals(nextBundle, displayedBadges);

    setBundle(displayedBundle);
    setStats((current) => (
      current
        ? {
            ...current,
            profile: displayedBundle.profile,
          }
        : current
    ));
    setBadges((current) => {
      const merged = mergeUnlockedBadges(current, nextBundle.newBadges);
      return usesFullPassportShowcase ? unlockAllBadges(merged) : unlockBadgesForProgress(merged, progressPercent);
    });
    queueNotifications(displayedBundle.notifications);

    if (nextBundle.newBadges.length > 0) {
      markBadgesAsSeen(nextBundle.newBadges);
      queueCelebrations(nextBundle.newBadges);
    }
  };

  const refresh = async () => {
    if (!enabled) {
      setBundle(null);
      setBadges([]);
      setStats(null);
      setCelebrations([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextBundle = await fetchGamificationProfile();
      const [nextBadges, nextStats] = await Promise.all([
        fetchGamificationBadges(),
        fetchGamificationStats(),
      ]);
      const progressPercent = passportCompletionPercent(nextBundle);
      const displayedBadges = usesFullPassportShowcase ? unlockAllBadges(nextBadges) : unlockBadgesForProgress(nextBadges, progressPercent);
      const displayedBundle = usesFullPassportShowcase
        ? completeBadgeTotals(nextBundle, displayedBadges.length)
        : normalizeBundleBadgeTotals(nextBundle, displayedBadges);
      const displayedStats = usesFullPassportShowcase
        ? {
            ...nextStats,
            profile: completeBadgeTotals({ ...nextBundle, profile: nextStats.profile }, displayedBadges.length).profile,
          }
        : {
            ...nextStats,
            profile: normalizeBundleBadgeTotals({ ...nextBundle, profile: nextStats.profile }, displayedBadges).profile,
          };

      setBundle(displayedBundle);
      setBadges(displayedBadges);
      setStats(displayedStats);
      queueNotifications(displayedBundle.notifications);
      hydrateUnlockedBadgeCelebrations(displayedBadges);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la gamificacion.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [enabled, normalizedViewerKey]);

  const refreshSupplementary = async () => {
    if (!enabled) {
      return;
    }

    try {
      const [nextBadges, nextStats] = await Promise.all([
        fetchGamificationBadges(),
        fetchGamificationStats(),
      ]);
      const progressPercent = bundle ? passportCompletionPercent(bundle) : nextStats.profile.progress.totalProgressPercent;
      const displayedBadges = usesFullPassportShowcase ? unlockAllBadges(nextBadges) : unlockBadgesForProgress(nextBadges, progressPercent);
      setBadges(displayedBadges);
      setStats(usesFullPassportShowcase
        ? {
            ...nextStats,
            profile: {
              ...nextStats.profile,
              totals: {
                ...nextStats.profile.totals,
                badgesUnlocked: displayedBadges.length,
              },
              progress: {
                ...nextStats.profile.progress,
                totalProgressPercent: Math.max(nextStats.profile.progress.totalProgressPercent, 100),
              },
              catalogTotals: {
                ...nextStats.profile.catalogTotals,
                totalBadges: displayedBadges.length,
              },
            },
          }
        : {
            ...nextStats,
            profile: normalizeBundleBadgeTotals({ ...bundle, profile: nextStats.profile } as GamificationBundle, displayedBadges).profile,
          });
    } catch {
      // Mantiene los datos actuales si la refrescada secundaria falla.
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const dismissCelebration = (id: string) => {
    setCelebrations((current) => current.filter((item) => item.id !== id));
  };

  const replayUnlockedBadgeCelebrations = () => {
    const unlockedBadges = [...badges]
      .filter((item) => item.isUnlocked)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    queueCelebrations(unlockedBadges);
  };

  const applyFavoritePayload = (payload: unknown) => {
    const nextBundle = extractGamificationFromFavoritePayload(payload);
    if (!nextBundle) {
      return;
    }

    applyBundle(nextBundle);
    void refreshSupplementary();
  };

  const registerVisit = async (input: { fallaId: number; latitude: number; longitude: number; radiusMeters?: number; visitSource?: string; }) => {
    const nextBundle = await recordFallaVisit(input);
    applyBundle(nextBundle);
    void refreshSupplementary();
    return nextBundle;
  };

  const trackNavigationEvent = async (input: { fallaId: number; mode?: string; }) => {
    const nextBundle = await trackNavigationUse(input);
    applyBundle(nextBundle);
    void refreshSupplementary();
    return nextBundle;
  };

  const trackContentRead = async (input: { fallaId: number; section?: string; }) => {
    const nextBundle = await trackContentView(input);
    applyBundle(nextBundle);
    void refreshSupplementary();
    return nextBundle;
  };

  const refreshRoutes = async () => {
    const nextBundle = await refreshGamificationRoutes();
    applyBundle(nextBundle);
    void refreshSupplementary();
    return nextBundle;
  };

  return {
    bundle,
    badges,
    stats,
    isLoading,
    error,
    notifications,
    celebrations,
    refresh,
    refreshRoutes,
    applyFavoritePayload,
    registerVisit,
    trackNavigationEvent,
    trackContentRead,
    dismissNotification,
    dismissCelebration,
    replayUnlockedBadgeCelebrations,
    queueNotification,
  };
}
