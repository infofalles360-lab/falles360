function readCookies(): Record<string, string> {
  if (typeof document === 'undefined' || document.cookie.trim() === '') {
    return {};
  }

  return document.cookie
    .split(';')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .reduce<Record<string, string>>((accumulator, chunk) => {
      const separatorIndex = chunk.indexOf('=');
      const rawName = separatorIndex === -1 ? chunk : chunk.slice(0, separatorIndex);
      const rawValue = separatorIndex === -1 ? '' : chunk.slice(separatorIndex + 1);

      accumulator[decodeURIComponent(rawName)] = decodeURIComponent(rawValue);

      return accumulator;
    }, {});
}

export function readCsrfToken(): string | null {
  const cookies = readCookies();

  for (const [name, value] of Object.entries(cookies)) {
    if (name.endsWith('_csrf') && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveDashboardBasePath(): string {
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

function resolveCsrfBootstrapUrl(): string {
  return `${resolveDashboardBasePath() || ''}/api/me.php`;
}

let csrfBootstrapPromise: Promise<string | null> | null = null;

export async function ensureCsrfToken(): Promise<string | null> {
  const currentToken = readCsrfToken();

  if (currentToken) {
    return currentToken;
  }

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = fetch(resolveCsrfBootstrapUrl(), {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
    })
      .catch(() => null)
      .then(() => readCsrfToken())
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }

  return csrfBootstrapPromise;
}

export function withCsrfHeaders(headers?: HeadersInit): Headers {
  const resolvedHeaders = new Headers(headers ?? {});
  const csrfToken = readCsrfToken();

  if (csrfToken && !resolvedHeaders.has('X-CSRF-Token')) {
    resolvedHeaders.set('X-CSRF-Token', csrfToken);
  }

  return resolvedHeaders;
}

export async function withCsrfHeadersAsync(headers?: HeadersInit): Promise<Headers> {
  const resolvedHeaders = new Headers(headers ?? {});
  const csrfToken = (await ensureCsrfToken()) ?? readCsrfToken();

  if (csrfToken && !resolvedHeaders.has('X-CSRF-Token')) {
    resolvedHeaders.set('X-CSRF-Token', csrfToken);
  }

  return resolvedHeaders;
}

export function withCsrfRequest(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    credentials: init.credentials ?? 'same-origin',
    headers: withCsrfHeaders(init.headers),
  };
}

export async function withCsrfRequestAsync(init: RequestInit = {}): Promise<RequestInit> {
  return {
    ...init,
    credentials: init.credentials ?? 'same-origin',
    headers: await withCsrfHeadersAsync(init.headers),
  };
}
