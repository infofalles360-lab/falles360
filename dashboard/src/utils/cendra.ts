import type { TelegramAdminAlertPayload } from './telegram';
import { withCsrfRequestAsync } from './security';

export interface CendraSyncRun {
  id: number;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  newItems: number;
  notes: string | null;
}

export interface CendraRecentArticle {
  id: number;
  title: string;
  url: string;
  publishedAt: string | null;
  summary?: string;
  excerpt?: string;
  category: string;
  author: string;
  telegramSent: boolean;
  landingPublished: boolean;
  landingPublishedAt?: string | null;
  landingTitle?: string;
  landingExcerpt?: string;
}

export interface CendraSyncStatus {
  configured: boolean;
  sourceUrl: string | null;
  articlesTotal: number;
  pendingTelegramArticles: number;
  landingArticles: number;
  latestArticlePublishedAt: string | null;
  latestRun: CendraSyncRun | null;
  recentArticles: CendraRecentArticle[];
}

interface CendraSyncStatusResponse extends CendraSyncStatus {
  ok?: boolean;
  error?: string;
  message?: string;
}

interface CendraSyncResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  runId?: number;
  sourceUrl?: string | null;
  processedItems?: number;
  newItems?: number;
  updatedItems?: number;
  latestRun?: CendraSyncRun | null;
  articlesTotal?: number;
  pendingTelegramArticles?: number;
}

interface CendraDailySummaryResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  draft?: TelegramAdminAlertPayload;
  summaryDate?: string | null;
  mode?: string | null;
  articleCount?: number;
}

interface CendraDailySummaryTelegramResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  chatId?: string;
  summaryDate?: string | null;
  articleCount?: number;
}

interface CendraSearchResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  items?: CendraRecentArticle[];
  count?: number;
  query?: string;
}

interface CendraArticleActionResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  articleId?: number;
  title?: string;
  chatId?: string;
  landingPublished?: boolean;
}

export interface CendraSyncResult {
  runId: number;
  sourceUrl: string | null;
  processedItems: number;
  newItems: number;
  updatedItems: number;
  latestRun: CendraSyncRun | null;
  articlesTotal: number;
  pendingTelegramArticles: number;
}

export interface CendraDailySummaryDraft {
  draft: TelegramAdminAlertPayload;
  summaryDate: string | null;
  mode: string | null;
  articleCount: number;
}

export interface CendraDailySummaryTelegramResult {
  chatId: string;
  summaryDate: string | null;
  articleCount: number;
}

export interface CendraArticleActionResult {
  articleId: number;
  title: string;
  chatId?: string;
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

function resolveAdminCendraEndpoint(fileName: 'status.php' | 'sync.php', devRoute: 'status' | 'sync'): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return `/api/admin/cendra/${devRoute}`;
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/cendra/${fileName}`;
}

function resolveCendraSearchEndpoint(): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return '/api/cendra';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/cendra.php`;
}

function resolveAdminCendraDraftEndpoint(): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return '/api/admin/cendra/daily-summary';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/cendra/daily-summary.php`;
}

function resolveAdminCendraTelegramSendEndpoint(): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return '/api/admin/cendra/send-daily-summary';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/cendra/send-daily-summary.php`;
}

function resolveAdminCendraArticleActionEndpoint(fileName: 'publish-article.php' | 'send-article-to-me.php', devRoute: 'publish-article' | 'send-article-to-me'): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return `/api/admin/cendra/${devRoute}`;
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/cendra/${fileName}`;
}

function resolveAdminCendraLandingEndpoint(): string {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return '/api/admin/cendra/landing';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');
  const basePath = dashboardIndex === -1 ? '' : pathname.slice(0, dashboardIndex);

  return `${basePath || ''}/api/admin/cendra/landing.php`;
}

function mapRun(run: CendraSyncRun | null | undefined): CendraSyncRun | null {
  if (!run) {
    return null;
  }

  return {
    id: Number(run.id ?? 0),
    status: typeof run.status === 'string' ? run.status : '',
    startedAt: typeof run.startedAt === 'string' ? run.startedAt : null,
    finishedAt: typeof run.finishedAt === 'string' ? run.finishedAt : null,
    newItems: Number(run.newItems ?? 0),
    notes: typeof run.notes === 'string' ? run.notes : null,
  };
}

function mapStatus(payload: CendraSyncStatusResponse): CendraSyncStatus {
  return {
    configured: Boolean(payload.configured),
    sourceUrl: typeof payload.sourceUrl === 'string' ? payload.sourceUrl : null,
    articlesTotal: Number(payload.articlesTotal ?? 0),
    pendingTelegramArticles: Number(payload.pendingTelegramArticles ?? 0),
    landingArticles: Number(payload.landingArticles ?? 0),
    latestArticlePublishedAt: typeof payload.latestArticlePublishedAt === 'string' ? payload.latestArticlePublishedAt : null,
    latestRun: mapRun(payload.latestRun),
    recentArticles: Array.isArray(payload.recentArticles)
      ? payload.recentArticles.map((article) => ({
        id: Number(article.id ?? 0),
        title: typeof article.title === 'string' ? article.title : '',
        url: typeof article.url === 'string' ? article.url : '',
        publishedAt: typeof article.publishedAt === 'string' ? article.publishedAt : null,
        summary: typeof article.summary === 'string' ? article.summary : '',
        excerpt: typeof article.excerpt === 'string' ? article.excerpt : '',
        category: typeof article.category === 'string' ? article.category : '',
        author: typeof article.author === 'string' ? article.author : '',
        telegramSent: Boolean(article.telegramSent),
        landingPublished: Boolean(article.landingPublished),
        landingPublishedAt: typeof article.landingPublishedAt === 'string' ? article.landingPublishedAt : null,
        landingTitle: typeof article.landingTitle === 'string' ? article.landingTitle : '',
        landingExcerpt: typeof article.landingExcerpt === 'string' ? article.landingExcerpt : '',
      }))
      : [],
  };
}

function mapArticle(article: CendraRecentArticle): CendraRecentArticle {
  return {
    id: Number(article.id ?? 0),
    title: typeof article.title === 'string' ? article.title : '',
    url: typeof article.url === 'string' ? article.url : '',
    publishedAt: typeof article.publishedAt === 'string' ? article.publishedAt : null,
    summary: typeof article.summary === 'string' ? article.summary : '',
    excerpt: typeof article.excerpt === 'string' ? article.excerpt : '',
    category: typeof article.category === 'string' ? article.category : '',
    author: typeof article.author === 'string' ? article.author : '',
    telegramSent: Boolean(article.telegramSent),
    landingPublished: Boolean(article.landingPublished),
    landingPublishedAt: typeof article.landingPublishedAt === 'string' ? article.landingPublishedAt : null,
    landingTitle: typeof article.landingTitle === 'string' ? article.landingTitle : '',
    landingExcerpt: typeof article.landingExcerpt === 'string' ? article.landingExcerpt : '',
  };
}

export async function fetchCendraSyncStatus(): Promise<CendraSyncStatus> {
  const response = await fetch(resolveAdminCendraEndpoint('status.php', 'status'), {
    credentials: 'same-origin',
  });

  const payload = await response.json().catch(() => null) as CendraSyncStatusResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo cargar el estado de Cendra.'));
  }

  return mapStatus(payload);
}

export async function searchCendraArticles(query?: string | null, limit = 12): Promise<CendraRecentArticle[]> {
  const endpoint = resolveCendraSearchEndpoint();
  const params = new URLSearchParams();

  if (typeof query === 'string' && query.trim().length > 0) {
    params.set('q', query.trim());
  }

  params.set('limit', String(limit));

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    credentials: 'same-origin',
  });

  const payload = await response.json().catch(() => null) as CendraSearchResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo buscar en Cendra.'));
  }

  return Array.isArray(payload.items) ? payload.items.map(mapArticle) : [];
}

export async function runCendraSync(sourceUrl?: string | null): Promise<CendraSyncResult> {
  const response = await fetch(resolveAdminCendraEndpoint('sync.php', 'sync'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceUrl: typeof sourceUrl === 'string' && sourceUrl.trim().length > 0 ? sourceUrl.trim() : undefined,
    }),
  }));

  const payload = await response.json().catch(() => null) as CendraSyncResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo sincronizar Cendra.'));
  }

  return {
    runId: Number(payload.runId ?? 0),
    sourceUrl: typeof payload.sourceUrl === 'string' ? payload.sourceUrl : null,
    processedItems: Number(payload.processedItems ?? 0),
    newItems: Number(payload.newItems ?? 0),
    updatedItems: Number(payload.updatedItems ?? 0),
    latestRun: mapRun(payload.latestRun),
    articlesTotal: Number(payload.articlesTotal ?? 0),
    pendingTelegramArticles: Number(payload.pendingTelegramArticles ?? 0),
  };
}

export async function generateCendraDailySummaryDraft(date?: string | null): Promise<CendraDailySummaryDraft> {
  const response = await fetch(resolveAdminCendraDraftEndpoint(), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: typeof date === 'string' && date.trim().length > 0 ? date.trim() : undefined,
    }),
  }));

  const payload = await response.json().catch(() => null) as CendraDailySummaryResponse | null;

  if (!response.ok || !payload?.ok || !payload.draft) {
    throw new Error(resolveApiError(payload, 'No se pudo generar el resumen diario de Cendra.'));
  }

  return {
    draft: payload.draft,
    summaryDate: typeof payload.summaryDate === 'string' ? payload.summaryDate : null,
    mode: typeof payload.mode === 'string' ? payload.mode : null,
    articleCount: Number(payload.articleCount ?? 0),
  };
}

export async function sendCendraDailySummaryToMyTelegram(date?: string | null): Promise<CendraDailySummaryTelegramResult> {
  const response = await fetch(resolveAdminCendraTelegramSendEndpoint(), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: typeof date === 'string' && date.trim().length > 0 ? date.trim() : undefined,
    }),
  }));

  const payload = await response.json().catch(() => null) as CendraDailySummaryTelegramResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo enviar el resumen diario a tu Telegram.'));
  }

  return {
    chatId: typeof payload.chatId === 'string' ? payload.chatId : '',
    summaryDate: typeof payload.summaryDate === 'string' ? payload.summaryDate : null,
    articleCount: Number(payload.articleCount ?? 0),
  };
}

export async function sendCendraArticleToMyTelegram(articleId: number): Promise<CendraArticleActionResult> {
  const response = await fetch(resolveAdminCendraArticleActionEndpoint('send-article-to-me.php', 'send-article-to-me'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articleId }),
  }));

  const payload = await response.json().catch(() => null) as CendraArticleActionResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo enviar el articulo a tu bot.'));
  }

  return {
    articleId: Number(payload.articleId ?? 0),
    title: typeof payload.title === 'string' ? payload.title : '',
    chatId: typeof payload.chatId === 'string' ? payload.chatId : '',
  };
}

export async function publishCendraArticleToChannel(articleId: number): Promise<CendraArticleActionResult> {
  const response = await fetch(resolveAdminCendraArticleActionEndpoint('publish-article.php', 'publish-article'), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articleId }),
  }));

  const payload = await response.json().catch(() => null) as CendraArticleActionResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo publicar el articulo en el canal.'));
  }

  return {
    articleId: Number(payload.articleId ?? 0),
    title: typeof payload.title === 'string' ? payload.title : '',
  };
}

export async function setCendraArticleLandingPublication(articleId: number, published: boolean): Promise<CendraArticleActionResult & { landingPublished: boolean }> {
  const response = await fetch(resolveAdminCendraLandingEndpoint(), await withCsrfRequestAsync({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articleId, published }),
  }));

  const payload = await response.json().catch(() => null) as CendraArticleActionResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(resolveApiError(payload, 'No se pudo actualizar la publicacion en la landing.'));
  }

  return {
    articleId: Number(payload.articleId ?? 0),
    title: typeof payload.title === 'string' ? payload.title : '',
    landingPublished: Boolean(payload.landingPublished),
  };
}
