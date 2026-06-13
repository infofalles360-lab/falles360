#!/usr/bin/env node

const DEFAULT_LOCAL_ENDPOINT = "http://localhost/fallasgo/falles360/api/solicitudes.php";
const DEFAULT_FORMSUBMIT_ENDPOINT = "https://formsubmit.co/info.falles360@gmail.com";
const DEFAULT_FORMSUBMIT_REFERER = "https://infofalles360-lab.github.io/fallas360-whitelist/";
const DEFAULT_SUBJECT = "Nueva solicitud para la whitelist de Falles360";
const DEFAULT_AUTORESPONSE =
  "Gracias por apuntarte a la lista de espera de Falles360. Hemos recibido correctamente tu solicitud y te avisaremos por email antes de abrir el acceso anticipado.";

function printHelp() {
  console.log(`Uso:
  node ./scripts/whitelist-burst.mjs [opciones]

Opciones principales:
  --endpoint <url>         Endpoint a probar.
  --mode <auto|local|formsubmit>
  --total <n>              Total de peticiones. Por defecto: 10
  --concurrency <n>        Peticiones simultaneas. Por defecto: 5
  --source <texto>         Campo source. Por defecto: load_test_script
  --email-domain <dominio> Dominio para emails de prueba. Por defecto: example.test
  --name-prefix <texto>    Prefijo del nombre. Por defecto: Prueba Whitelist
  --timeout-ms <n>         Timeout por peticion. Por defecto: 15000
  --referer <url>          Referer a enviar.
  --origin <url>           Origin a enviar.
  --payload-format <json|form|auto>
  --session-strategy <shared|per-request>
  --fail-on-error          Sale con codigo 1 si alguna peticion falla.
  --verbose                Imprime el detalle de cada respuesta.
  --help                   Muestra esta ayuda.

Ejemplos:
  node ./scripts/whitelist-burst.mjs --mode local --total 8 --concurrency 4
  node ./scripts/whitelist-burst.mjs --mode formsubmit --total 20 --concurrency 10

Notas:
  - El endpoint local api/solicitudes.php exige CSRF y cookies de sesion.
  - Ese endpoint ademas limita a 10 envios por IP y 5 por sesion cada hora.
  - Si pruebas el endpoint local con concurrencia alta, veras 429 cuando entres en rate limit.
`);
}

function parseArgs(argv) {
  const options = {
    endpoint: "",
    mode: "auto",
    total: 10,
    concurrency: 5,
    source: "load_test_script",
    emailDomain: "example.test",
    namePrefix: "Prueba Whitelist",
    timeoutMs: 15000,
    referer: "",
    origin: "",
    payloadFormat: "auto",
    sessionStrategy: "per-request",
    failOnError: false,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--endpoint":
        options.endpoint = requireValue(arg, next);
        index += 1;
        break;
      case "--mode":
        options.mode = requireValue(arg, next);
        index += 1;
        break;
      case "--total":
        options.total = parsePositiveInt(requireValue(arg, next), arg);
        index += 1;
        break;
      case "--concurrency":
        options.concurrency = parsePositiveInt(requireValue(arg, next), arg);
        index += 1;
        break;
      case "--source":
        options.source = requireValue(arg, next);
        index += 1;
        break;
      case "--email-domain":
        options.emailDomain = requireValue(arg, next);
        index += 1;
        break;
      case "--name-prefix":
        options.namePrefix = requireValue(arg, next);
        index += 1;
        break;
      case "--timeout-ms":
        options.timeoutMs = parsePositiveInt(requireValue(arg, next), arg);
        index += 1;
        break;
      case "--referer":
        options.referer = requireValue(arg, next);
        index += 1;
        break;
      case "--origin":
        options.origin = requireValue(arg, next);
        index += 1;
        break;
      case "--payload-format":
        options.payloadFormat = requireValue(arg, next);
        index += 1;
        break;
      case "--session-strategy":
        options.sessionStrategy = requireValue(arg, next);
        index += 1;
        break;
      case "--fail-on-error":
        options.failOnError = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`Falta valor para ${flag}`);
  }
  return value;
}

function parsePositiveInt(rawValue, flag) {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} debe ser un entero positivo.`);
  }
  return value;
}

function inferMode(endpoint, requestedMode) {
  if (requestedMode !== "auto") {
    return requestedMode;
  }
  return endpoint.includes("formsubmit.co") ? "formsubmit" : "local";
}

function inferEndpoint(requestedEndpoint, mode) {
  if (requestedEndpoint) {
    return requestedEndpoint;
  }
  return mode === "formsubmit" ? DEFAULT_FORMSUBMIT_ENDPOINT : DEFAULT_LOCAL_ENDPOINT;
}

function inferOrigin(endpoint, explicitOrigin) {
  if (explicitOrigin) {
    return explicitOrigin;
  }
  return new URL(endpoint).origin;
}

function inferReferer(endpoint, mode, explicitReferer) {
  if (explicitReferer) {
    return explicitReferer;
  }

  if (mode === "formsubmit") {
    return DEFAULT_FORMSUBMIT_REFERER;
  }

  const url = new URL(endpoint);
  const nextPath = url.pathname.replace(/\/api\/solicitudes\.php$/i, "/whitelist/");
  return new URL(nextPath, url.origin).toString();
}

function inferPayloadFormat(mode, requestedPayloadFormat) {
  if (requestedPayloadFormat !== "auto") {
    return requestedPayloadFormat;
  }
  return mode === "formsubmit" ? "form" : "json";
}

function collectSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const fallback = headers.get("set-cookie");
  if (!fallback) {
    return [];
  }

  return fallback.split(/,(?=[^;,]+=)/g);
}

function updateCookieJar(cookieJar, headers) {
  for (const setCookie of collectSetCookies(headers)) {
    const pair = setCookie.split(";", 1)[0];
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (name) {
      cookieJar.set(name, value);
    }
  }
}

function cookieHeader(cookieJar) {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function findCsrfToken(cookieJar) {
  for (const [name, value] of cookieJar.entries()) {
    if (name.endsWith("_csrf")) {
      return value;
    }
  }
  return "";
}

async function fetchWithTimeout(url, init, timeoutMs) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function bootstrapLocalSession(config) {
  const cookieJar = new Map();
  const response = await fetchWithTimeout(
    config.endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: config.origin,
        Referer: config.referer,
        "User-Agent": config.userAgent,
      },
    },
    config.timeoutMs,
  );

  updateCookieJar(cookieJar, response.headers);

  const csrfToken = findCsrfToken(cookieJar);
  if (!csrfToken) {
    throw new Error("No se pudo obtener el token CSRF desde la sesion inicial.");
  }

  return { cookieJar, csrfToken };
}

function buildIdentity(index, options) {
  const serial = String(index + 1).padStart(4, "0");
  const stamp = Date.now();
  return {
    name: `${options.namePrefix} ${serial}`,
    email: `whitelist+${stamp}.${serial}@${options.emailDomain}`,
  };
}

function buildLocalPayload(identity, options) {
  return {
    name: identity.name,
    email: identity.email,
    source: options.source,
    _subject: DEFAULT_SUBJECT,
    _template: "table",
    _honey: "",
    _autoresponse: DEFAULT_AUTORESPONSE,
  };
}

function buildFormsubmitPayload(identity, options) {
  return {
    name: identity.name,
    email: identity.email,
    source: options.source,
    _subject: DEFAULT_SUBJECT,
    _template: "table",
    _captcha: "false",
    _autoresponse: DEFAULT_AUTORESPONSE,
    _next: options.referer,
    _url: options.referer,
    _honey: "",
  };
}

function encodeBody(payload, payloadFormat) {
  if (payloadFormat === "form") {
    return {
      body: new URLSearchParams(payload).toString(),
      contentType: "application/x-www-form-urlencoded;charset=UTF-8",
    };
  }

  return {
    body: JSON.stringify(payload),
    contentType: "application/json",
  };
}

async function performLocalRequest(index, options, sharedSession) {
  const session = sharedSession ?? (await bootstrapLocalSession(options));
  const identity = buildIdentity(index, options);
  const payload = buildLocalPayload(identity, options);
  const { body, contentType } = encodeBody(payload, options.payloadFormat);

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    options.endpoint,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": contentType,
        Cookie: cookieHeader(session.cookieJar),
        Origin: options.origin,
        Referer: options.referer,
        "User-Agent": options.userAgent,
        "X-CSRF-Token": session.csrfToken,
      },
      body,
    },
    options.timeoutMs,
  );

  const rawText = await response.text();
  let parsed = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  return {
    index,
    ok: response.ok && parsed?.ok !== false && parsed?.success !== false && parsed?.success !== "false",
    status: response.status,
    durationMs: Date.now() - startedAt,
    message: parsed?.message ?? rawText.slice(0, 180),
    email: identity.email,
  };
}

async function performFormsubmitRequest(index, options) {
  const identity = buildIdentity(index, options);
  const payload = buildFormsubmitPayload(identity, options);
  const { body, contentType } = encodeBody(payload, "form");

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    options.endpoint,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        Accept: "*/*",
        "Content-Type": contentType,
        Origin: options.origin,
        Referer: options.referer,
        "User-Agent": options.userAgent,
      },
      body,
    },
    options.timeoutMs,
  );

  const rawText = await response.text();
  const isRedirect = response.status >= 300 && response.status < 400;

  return {
    index,
    ok: response.ok || isRedirect,
    status: response.status,
    durationMs: Date.now() - startedAt,
    message: response.headers.get("location") || rawText.slice(0, 180) || "OK",
    email: identity.email,
  };
}

async function runPool(total, concurrency, worker) {
  const results = new Array(total);
  let cursor = 0;

  async function consume() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= total) {
        return;
      }

      try {
        results[current] = await worker(current);
      } catch (error) {
        results[current] = {
          index: current,
          ok: false,
          status: 0,
          durationMs: 0,
          message: error instanceof Error ? error.message : String(error),
          email: "",
        };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => consume());
  await Promise.all(workers);
  return results;
}

function summarize(results) {
  const byStatus = new Map();
  let success = 0;
  let failure = 0;

  for (const result of results) {
    const statusKey = String(result.status);
    byStatus.set(statusKey, (byStatus.get(statusKey) ?? 0) + 1);
    if (result.ok) {
      success += 1;
    } else {
      failure += 1;
    }
  }

  return { success, failure, byStatus };
}

function printSummary(results, options) {
  const { success, failure, byStatus } = summarize(results);
  console.log("");
  console.log("Resumen:");
  console.log(`  Exitos: ${success}`);
  console.log(`  Fallos: ${failure}`);
  console.log(`  Estados: ${Array.from(byStatus.entries()).map(([status, count]) => `${status}=${count}`).join(", ")}`);

  if (options.verbose || failure > 0) {
    console.log("");
    console.log("Detalle:");
    for (const result of results) {
      const marker = result.ok ? "OK " : "ERR";
      console.log(
        `  [${marker}] #${String(result.index + 1).padStart(3, "0")} status=${result.status} tiempo=${result.durationMs}ms ${result.message}`,
      );
    }
  }

  if (options.mode === "local") {
    console.log("");
    console.log("Aviso local:");
    console.log("  El endpoint local corta por rate limit a partir de 10 envios por IP y 5 por sesion cada hora.");
  }
}

async function main() {
  const rawOptions = parseArgs(process.argv.slice(2));
  const guessedEndpoint = inferEndpoint(rawOptions.endpoint, rawOptions.mode === "auto" ? "local" : rawOptions.mode);
  const mode = inferMode(guessedEndpoint, rawOptions.mode);
  const endpoint = inferEndpoint(rawOptions.endpoint, mode);
  const options = {
    ...rawOptions,
    mode,
    endpoint,
    origin: inferOrigin(endpoint, rawOptions.origin),
    referer: inferReferer(endpoint, mode, rawOptions.referer),
    payloadFormat: inferPayloadFormat(mode, rawOptions.payloadFormat),
    userAgent: "falles360-whitelist-burst/1.0",
  };

  if (!["local", "formsubmit"].includes(options.mode)) {
    throw new Error(`Modo no soportado: ${options.mode}`);
  }
  if (!["json", "form"].includes(options.payloadFormat)) {
    throw new Error(`payload-format no soportado: ${options.payloadFormat}`);
  }
  if (!["shared", "per-request"].includes(options.sessionStrategy)) {
    throw new Error(`session-strategy no soportada: ${options.sessionStrategy}`);
  }

  console.log("Configuracion:");
  console.log(`  mode=${options.mode}`);
  console.log(`  endpoint=${options.endpoint}`);
  console.log(`  total=${options.total}`);
  console.log(`  concurrency=${options.concurrency}`);
  console.log(`  payloadFormat=${options.payloadFormat}`);
  console.log(`  source=${options.source}`);
  console.log(`  origin=${options.origin}`);
  console.log(`  referer=${options.referer}`);
  console.log(`  sessionStrategy=${options.sessionStrategy}`);

  let sharedSession = null;
  if (options.mode === "local" && options.sessionStrategy === "shared") {
    sharedSession = await bootstrapLocalSession(options);
  }

  const results = await runPool(options.total, options.concurrency, (index) => {
    if (options.mode === "formsubmit") {
      return performFormsubmitRequest(index, options);
    }
    return performLocalRequest(index, options, sharedSession);
  });

  printSummary(results, options);

  const hasFailures = results.some((result) => !result.ok);
  if (hasFailures && options.failOnError) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
