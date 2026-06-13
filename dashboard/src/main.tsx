import {createRoot} from 'react-dom/client';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontro el contenedor root del dashboard.');
}

const root = createRoot(container);
let appRenderRequested = false;

function resolveDashboardBasePath(): string {
  const dashboardIndex = window.location.pathname.indexOf('/dashboard');
  return dashboardIndex === -1 ? '' : window.location.pathname.slice(0, dashboardIndex);
}

function installSessionRedirectInterceptor() {
  const originalFetch = window.fetch.bind(window);
  let redirecting = false;

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const resolvedUrl = new URL(requestUrl, window.location.href);

    if (
      response.status === 401
      && resolvedUrl.origin === window.location.origin
      && !redirecting
      && !window.location.pathname.endsWith('/login.php')
    ) {
      redirecting = true;
      window.location.replace(`${resolveDashboardBasePath() || ''}/login.php`);
    }

    return response;
  };
}

function renderFatalError(message: string) {
  container.innerHTML = `
    <div style="min-height:100vh;background:#f7f4f1;padding:40px 24px;color:#1a110a;font-family:'Poppins',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:700;">
      <div style="max-width:720px;margin:0 auto;border:1px solid rgba(0,0,0,.08);border-radius:24px;background:#fff;padding:28px 24px;box-shadow:0 24px 60px rgba(15,23,42,.08);">
        <div style="font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#f05a28;">Dashboard error</div>
        <h1 style="margin:14px 0 0;font-size:32px;line-height:1.05;">La app no ha podido arrancar.</h1>
        <p style="margin:14px 0 0;font-size:14px;line-height:1.75;color:#6b5b52;">${message}</p>
      </div>
    </div>
  `;
}

installSessionRedirectInterceptor();

window.addEventListener('error', (event) => {
  console.error('Dashboard runtime error', event.error ?? event.message);
  renderFatalError(event.message || 'Se ha producido un error inesperado al cargar el dashboard.');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Error desconocido');
  console.error('Dashboard unhandled rejection', event.reason);

  if (appRenderRequested) {
    return;
  }

  renderFatalError(reason);
});

import('react').then(({ StrictMode }) =>
  import('./App.tsx').then(({ default: App }) => {
    appRenderRequested = true;
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
).catch((error) => {
  console.error('Dashboard bootstrap failed', error);
  renderFatalError(error instanceof Error ? error.message : 'No se pudo inicializar la aplicacion.');
});
