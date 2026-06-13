import { resolveDashboardBasePath } from './publicApp';
import { withCsrfRequestAsync } from './security';

type ActivityEventType = 'detail_open' | 'favorite_toggle' | 'marker_open' | 'route_prepare';

interface TrackActivityEventInput {
  eventType: ActivityEventType;
  fallaId?: string | number | null;
  latitude: number;
  longitude: number;
}

function resolveActivityEndpoint(): string {
  if (import.meta.env.DEV) {
    return '/api/activity/event';
  }

  return `${resolveDashboardBasePath() || ''}/api/activity/event.php`;
}

export function trackActivityEvent(input: TrackActivityEventInput): void {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const eventType = String(input.eventType || '').trim();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude === 0 || longitude === 0 || eventType === '') {
    return;
  }

  void withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      falla_id: input.fallaId ? Number(input.fallaId) : null,
      event_type: eventType,
      latitude,
      longitude,
    }),
  })
    .then((requestInit) => fetch(resolveActivityEndpoint(), requestInit))
    .catch(() => {
      // El heatmap no debe interrumpir la experiencia si falla el tracking.
    });
}
