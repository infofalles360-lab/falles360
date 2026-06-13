import { withCsrfRequestAsync } from './security';

export interface TelegramLinkStatus {
  linked: boolean;
  telegramUsername: string | null;
  linkedAt: string | null;
}

interface TelegramStatusResponse extends TelegramLinkStatus {
  ok?: boolean;
  message?: string;
  error?: string;
}

interface TelegramLinkResponse {
  ok?: boolean;
  telegramUrl?: string;
  message?: string;
  error?: string;
}

interface TelegramNotifyResponse {
  ok?: boolean;
  message?: string;
  error?: string;
}

interface TelegramAdminAlertResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  sent?: {
    channel?: boolean;
    users?: number;
  };
}

export interface TelegramAdminAlertPayload {
  type: 'aviso' | 'novedad' | 'ruta';
  title: string;
  detail: string;
  location: string;
  footer: string;
  target: 'channel' | 'users' | 'both';
}

export interface TelegramAdminAlertResult {
  channel: boolean;
  users: number;
}

function resolveTelegramEndpoint(endpoint: string): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return `/api/telegram/${endpoint}`;
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/telegram/${endpoint}`;
}

function resolveApiError(payload: { message?: string; error?: string } | null, fallbackMessage: string) {
  if (payload?.message && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (payload?.error && payload.error.trim().length > 0) {
    return payload.error;
  }

  return fallbackMessage;
}

function resolveAdminTelegramEndpoint(): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return '/api/admin/telegram/send';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/telegram/send.php`;
}

export async function fetchTelegramStatus(userId: string): Promise<TelegramLinkStatus> {
  const endpoint = resolveTelegramEndpoint(import.meta.env.DEV ? 'status' : 'status.php');
  const response = await fetch(`${endpoint}?userId=${encodeURIComponent(userId)}`, {
    credentials: 'same-origin',
  });

  const payload = await response.json().catch(() => null) as TelegramStatusResponse | null;

  if (!response.ok || !payload) {
    throw new Error(resolveApiError(payload, 'No se pudo comprobar el estado de Telegram.'));
  }

  return {
    linked: Boolean(payload.linked),
    telegramUsername: typeof payload.telegramUsername === 'string' ? payload.telegramUsername : null,
    linkedAt: typeof payload.linkedAt === 'string' ? payload.linkedAt : null,
  };
}

export async function createTelegramLink(userId: string): Promise<string> {
  const response = await fetch(resolveTelegramEndpoint(import.meta.env.DEV ? 'link-token' : 'link-token.php'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  }));

  const payload = await response.json().catch(() => null) as TelegramLinkResponse | null;

  if (!response.ok || !payload?.telegramUrl) {
    throw new Error(resolveApiError(payload, 'No se pudo generar el enlace de Telegram.'));
  }

  return payload.telegramUrl;
}

export async function sendTelegramNotification(userId: string, message: string): Promise<void> {
  const response = await fetch(resolveTelegramEndpoint(import.meta.env.DEV ? 'notify' : 'notify.php'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      message,
    }),
  }));

  const payload = await response.json().catch(() => null) as TelegramNotifyResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo enviar la notificacion a Telegram.'));
  }
}

export async function sendAdminTelegramAlert(payload: TelegramAdminAlertPayload): Promise<TelegramAdminAlertResult> {
  const response = await fetch(resolveAdminTelegramEndpoint(), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  const data = await response.json().catch(() => null) as TelegramAdminAlertResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(resolveApiError(data, 'No se pudo enviar el aviso de Telegram.'));
  }

  return {
    channel: Boolean(data.sent?.channel),
    users: Number(data.sent?.users ?? 0),
  };
}
