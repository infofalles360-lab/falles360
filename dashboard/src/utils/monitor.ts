import { withCsrfRequestAsync } from './security';

interface MonitorDailySummaryTelegramResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  chatId?: string;
  updateCount?: number;
}

export interface MonitorDailySummaryTelegramResult {
  chatId: string;
  updateCount: number;
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

function resolveAdminMonitorDailySummaryEndpoint(): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return '/api/admin/monitor/send-daily-summary';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/monitor/send-daily-summary.php`;
}

export async function sendMonitorDailySummaryToMyTelegram(): Promise<MonitorDailySummaryTelegramResult> {
  const response = await fetch(resolveAdminMonitorDailySummaryEndpoint(), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }));

  const payload = await response.json().catch(() => null) as MonitorDailySummaryTelegramResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo enviar el resumen del monitor a tu Telegram.'));
  }

  return {
    chatId: typeof payload.chatId === 'string' ? payload.chatId : '',
    updateCount: Number(payload.updateCount ?? 0),
  };
}
