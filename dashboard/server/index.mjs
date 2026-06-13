import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTelegramStore } from './telegram-store.js';
import {
  generateLinkToken,
  isTelegramConfigured,
  sendChannelInvite,
  sendChannelPost,
  sendTelegramMessage,
  setBotCommands,
  telegramRequest,
} from './telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appRoot = path.resolve(projectRoot, '..');
const workspaceRoot = path.resolve(appRoot, '..');
const distDir = path.join(projectRoot, 'dist');
const telegramStore = createTelegramStore(path.join(__dirname, 'runtime', 'telegram-store.json'));
const phpTelegramUpdateScript = path.join(appRoot, 'backend', 'process_telegram_update.php');

function loadEnvFiles() {
  const candidates = [
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(appRoot, '.env'),
    path.join(appRoot, '.env.local'),
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
  ];

  for (const envFile of [...new Set(candidates)]) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile, override: true });
    }
  }
}

loadEnvFiles();

const app = express();
const port = Number(process.env.DASHBOARD_PORT || process.env.ASSISTANT_API_PORT || 3001);

app.use(express.json({ limit: '1mb' }));

function isMessage(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    (value.role === 'user' || value.role === 'assistant' || value.role === 'system')
    && typeof value.content === 'string'
    && value.content.trim().length > 0
  );
}

function buildSystemPrompt(context) {
  const contextLines = [
    context.activeTab ? `Pestana activa: ${context.activeTab}.` : null,
    context.selectedDateLabel ? `Fecha seleccionada: ${context.selectedDateLabel}.` : null,
    context.selectedDate ? `Fecha ISO seleccionada: ${context.selectedDate}.` : null,
  ].filter(Boolean);

  return [
    'Eres el asistente IA de Falles360.',
    'Responde en espanol de forma breve, util y accionable.',
    'Da recomendaciones pensadas para Fallas en Valencia.',
    'Si propones un plan, ordinalo en una secuencia clara y practica.',
    contextLines.length > 0 ? `Contexto actual de la interfaz: ${contextLines.join(' ')}` : null,
  ].filter(Boolean).join(' ');
}

function isMapPoint(value) {
  return (
    Array.isArray(value)
    && value.length === 2
    && value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  );
}

function distanceBetweenPoints(origin, destination) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const [originLat, originLng] = origin;
  const [destinationLat, destinationLng] = destination;
  const deltaLat = toRadians(destinationLat - originLat);
  const deltaLng = toRadians(destinationLng - originLng);
  const normalizedOriginLat = toRadians(originLat);
  const normalizedDestinationLat = toRadians(destinationLat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(normalizedOriginLat) * Math.cos(normalizedDestinationLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildDirectRoutePayload(origin, destination) {
  const distanceMeters = distanceBetweenPoints(origin, destination);
  const durationSeconds = Math.max(60, distanceMeters / 1.35);

  return {
    geometry: [origin, destination],
    distanceMeters,
    durationSeconds,
    steps: [{
      instruction: 'Sigue la ruta marcada hasta la falla.',
      distanceMeters,
      durationSeconds,
      streetName: 'Ruta marcada',
    }],
  };
}

const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const ROUTE_CACHE_MAX_ENTRIES = 128;
const routeCache = new Map();
const routePendingRequests = new Map();

function normalizeRouteProfile(value) {
  return value === 'driving' ? 'driving' : 'walking';
}

function buildRouteCacheKey(waypoints, profile) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return null;
  }

  return `${profile}|${waypoints.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join('|')}`;
}

function setCachedRoute(key, payload) {
  if (!key) {
    return;
  }

  if (routeCache.has(key)) {
    routeCache.delete(key);
  }

  routeCache.set(key, {
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    payload,
  });

  while (routeCache.size > ROUTE_CACHE_MAX_ENTRIES) {
    const oldestKey = routeCache.keys().next().value;

    if (typeof oldestKey !== 'string') {
      break;
    }

    routeCache.delete(oldestKey);
  }
}

function getCachedRoute(key) {
  if (!key) {
    return null;
  }

  const cached = routeCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    routeCache.delete(key);
    return null;
  }

  return cached.payload;
}

function buildDirectRoutePayloadForWaypoints(waypoints) {
  const validWaypoints = waypoints.filter(isMapPoint);

  if (validWaypoints.length < 2) {
    return null;
  }

  if (validWaypoints.length === 2) {
    return buildDirectRoutePayload(validWaypoints[0], validWaypoints[1]);
  }

  const geometry = [...validWaypoints];
  const distanceMeters = validWaypoints.slice(1).reduce(
    (total, destination, index) => total + distanceBetweenPoints(validWaypoints[index], destination),
    0
  );
  const durationSeconds = Math.max(60, distanceMeters / 1.35);

  return {
    geometry,
    distanceMeters,
    durationSeconds,
    steps: [{
      instruction: validWaypoints.length > 2
        ? 'Sigue la ruta marcada pasando por las paradas seleccionadas.'
        : 'Sigue la ruta marcada hasta la falla.',
      distanceMeters,
      durationSeconds,
      streetName: 'Ruta marcada',
    }],
  };
}

function buildRoutePayloadFromOsrm(payload, origin, destination) {
  const bestRoute = payload?.routes?.[0];

  if (!Array.isArray(bestRoute?.geometry?.coordinates)) {
    return null;
  }

  const steps = Array.isArray(bestRoute.legs)
    ? bestRoute.legs.flatMap((leg) =>
        Array.isArray(leg?.steps)
          ? leg.steps.map((step) => ({
              instruction: buildRouteInstruction(step),
              distanceMeters: Number(step.distance) || 0,
              durationSeconds: Number(step.duration) || 0,
              streetName: formatStreetName(step),
              location: Array.isArray(step?.maneuver?.location)
                ? [Number(step.maneuver.location[1]), Number(step.maneuver.location[0])]
                : null,
            }))
          : []
      )
    : [];

  const geometry = bestRoute.geometry.coordinates
    .map((point) => (Array.isArray(point) ? [Number(point[1]), Number(point[0])] : null))
    .filter((point) => isMapPoint(point));

  if (geometry.length < 2) {
    return null;
  }

  if (distanceBetweenPoints(origin, geometry[0]) > 8) {
    geometry.unshift(origin);
  }

  if (distanceBetweenPoints(geometry[geometry.length - 1], destination) > 8) {
    geometry.push(destination);
  }

  return {
    geometry,
    distanceMeters: Number(bestRoute.distance) || 0,
    durationSeconds: Number(bestRoute.duration) || 0,
    steps,
  };
}

const DEV_HEAT_FALLAS = [
  { id: '1', name: 'Convent de Jerusalem', sectionName: 'Especial', neighborhood: 'La Roqueta', lat: 39.46619, lng: -0.379781 },
  { id: '2', name: 'Monestir de Poblet', sectionName: 'Especial', neighborhood: 'Campanar', lat: 39.48374, lng: -0.39714 },
  { id: '3', name: 'Na Jordana', sectionName: 'Especial', neighborhood: 'El Carme', lat: 39.480356, lng: -0.380206 },
  { id: '4', name: 'Plaça del Pilar', sectionName: 'Especial', neighborhood: 'Velluters', lat: 39.47147, lng: -0.38293 },
  { id: '5', name: 'Sueca - Literat Azorín', sectionName: 'Especial', neighborhood: 'Russafa', lat: 39.46043, lng: -0.37428 },
  { id: '6', name: 'A. Regne de València', sectionName: 'Especial', neighborhood: 'Russafa', lat: 39.46359, lng: -0.36642 },
  { id: '7', name: 'Exposició - Misser Mascó', sectionName: 'Especial', neighborhood: 'Exposició', lat: 39.474989, lng: -0.362305 },
  { id: '8', name: 'Almirall Cadarso', sectionName: 'Especial', neighborhood: 'Gran Via', lat: 39.465781, lng: -0.368039 },
  { id: '9', name: 'Cuba - Literat Azorín', sectionName: 'Especial', neighborhood: 'Russafa', lat: 39.45991, lng: -0.37552 },
];
const DEV_EVENT_WEIGHTS = {
  marker_open: 2,
  detail_open: 3,
  route_prepare: 5,
  favorite_toggle: 2,
  share_open: 1,
};
const DEV_ACTIVITY_EVENTS = [];

for (const falla of DEV_HEAT_FALLAS) {
  const now = Date.now();
  const baseWeight = falla.id === '5' || falla.id === '9' ? 4 : falla.id === '4' ? 3 : 2;
  for (let index = 0; index < baseWeight; index += 1) {
    DEV_ACTIVITY_EVENTS.push({
      user_id: null,
      falla_id: falla.id,
      event_type: 'marker_open',
      weight: DEV_EVENT_WEIGHTS.marker_open,
      latitude: falla.lat,
      longitude: falla.lng,
      created_at: new Date(now - ((index + 1) * 6 * 60 * 1000)).toISOString(),
    });
  }
}

function parseHeatBBox(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return null;
  }

  const parts = raw.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  let [south, west, north, east] = parts;
  if (south > north) {
    [south, north] = [north, south];
  }
  if (west > east) {
    [west, east] = [east, west];
  }

  return { south, west, north, east };
}

function normalizeHeatZoom(value) {
  return Math.max(10, Math.min(18, Number.isFinite(value) ? Math.round(value) : 13));
}

function heatRangeMs(range) {
  switch (String(range || '').trim().toLowerCase()) {
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '12h':
      return 12 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

function heatPrecisionForZoom(zoom) {
  if (zoom >= 16) {
    return 4;
  }
  if (zoom >= 14) {
    return 3;
  }
  return 2;
}

function buildDevHeatmapPayload(bbox, zoom, range = '1h') {
  const threshold = Date.now() - heatRangeMs(range);
  const visibleRows = DEV_ACTIVITY_EVENTS.filter((event) => {
    const createdAt = new Date(event.created_at).getTime();
    return (
      Number.isFinite(createdAt)
      && createdAt >= threshold
      && event.latitude >= bbox.south
      && event.latitude <= bbox.north
      && event.longitude >= bbox.west
      && event.longitude <= bbox.east
    );
  });

  if (visibleRows.length === 0) {
    return {
      heatpoints: [],
      top_fallas: [],
      updated_at: new Date().toISOString(),
      highlights: {
        hottest_zone_label: null,
        top_falla: null,
        top_neighborhood: null,
      },
    };
  }

  const precision = heatPrecisionForZoom(zoom);
  const cells = new Map();
  const trending = new Map();
  const neighborhoods = new Map();

  for (const row of visibleRows) {
    const key = `${Number(row.latitude).toFixed(precision)}:${Number(row.longitude).toFixed(precision)}`;
    const cell = cells.get(key) ?? {
      lat: Number(Number(row.latitude).toFixed(precision)),
      lng: Number(Number(row.longitude).toFixed(precision)),
      score: 0,
    };
    cell.score += Number(row.weight) || 0;
    cells.set(key, cell);

    const falla = DEV_HEAT_FALLAS.find((item) => item.id === String(row.falla_id));
    if (falla) {
      const currentTrending = trending.get(falla.id) ?? {
        id: falla.id,
        name: falla.name,
        section_name: falla.sectionName,
        score: 0,
      };
      currentTrending.score += Number(row.weight) || 0;
      trending.set(falla.id, currentTrending);

      const currentNeighborhood = neighborhoods.get(falla.neighborhood) ?? {
        name: falla.neighborhood,
        score: 0,
      };
      currentNeighborhood.score += Number(row.weight) || 0;
      neighborhoods.set(falla.neighborhood, currentNeighborhood);
    }
  }

  const maxScore = Math.max(1, ...Array.from(cells.values()).map((cell) => cell.score));

  const heatpoints = Array.from(cells.values())
    .map((cell) => ({
      lat: cell.lat,
      lng: cell.lng,
      intensity: Math.min(cell.score / maxScore, 1),
    }))
    .sort((left, right) => right.intensity - left.intensity);

  const trendingList = Array.from(trending.values()).sort((left, right) => right.score - left.score);
  const neighborhoodList = Array.from(neighborhoods.values()).sort((left, right) => right.score - left.score);
  const topFalla = trendingList[0] ?? null;
  const topNeighborhood = neighborhoodList[0] ?? null;

  return {
    heatpoints,
    top_fallas: trendingList.slice(0, 8).map((falla) => falla.id),
    updated_at: new Date().toISOString(),
    highlights: {
      hottest_zone_label: topNeighborhood?.name ?? topFalla?.name ?? null,
      top_falla: topFalla,
      top_neighborhood: topNeighborhood,
    },
  };
}

function formatStreetName(step) {
  if (typeof step?.name === 'string' && step.name.trim().length > 0) {
    return step.name.trim();
  }

  if (typeof step?.ref === 'string' && step.ref.trim().length > 0) {
    return step.ref.trim();
  }

  return 'la via indicada';
}

function buildRouteInstruction(step) {
  const streetName = formatStreetName(step);
  const maneuver = step?.maneuver ?? {};
  const modifier = typeof maneuver.modifier === 'string' ? maneuver.modifier : '';
  const type = typeof maneuver.type === 'string' ? maneuver.type : '';

  if (type === 'depart') {
    return `Sal de tu posicion y avanza por ${streetName}.`;
  }

  if (type === 'arrive') {
    return 'Has llegado a tu destino.';
  }

  if (type === 'roundabout' || type === 'rotary') {
    return `En la rotonda, sigue las indicaciones hacia ${streetName}.`;
  }

  if (type === 'continue' || type === 'new name') {
    return `Continua por ${streetName}.`;
  }

  if (type === 'fork') {
    if (modifier === 'left') {
      return `Mantente a la izquierda hacia ${streetName}.`;
    }

    if (modifier === 'right') {
      return `Mantente a la derecha hacia ${streetName}.`;
    }

    return `Sigue el desvio hacia ${streetName}.`;
  }

  if (type === 'merge') {
    return `Incorporate hacia ${streetName}.`;
  }

  if (type === 'end of road') {
    if (modifier === 'left') {
      return `Al final de la via, gira a la izquierda hacia ${streetName}.`;
    }

    if (modifier === 'right') {
      return `Al final de la via, gira a la derecha hacia ${streetName}.`;
    }
  }

  if (type === 'turn') {
    if (modifier === 'left' || modifier === 'slight left' || modifier === 'sharp left') {
      return `Gira a la izquierda hacia ${streetName}.`;
    }

    if (modifier === 'right' || modifier === 'slight right' || modifier === 'sharp right') {
      return `Gira a la derecha hacia ${streetName}.`;
    }

    if (modifier === 'uturn') {
      return `Haz un cambio de sentido hacia ${streetName}.`;
    }

    return `Gira hacia ${streetName}.`;
  }

  return `Sigue hacia ${streetName}.`;
}

function resolveTelegramUserId(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function buildTelegramStatus(userId) {
  const status = telegramStore.getLinkStatus(userId);

  return {
    ok: true,
    linked: status.linked,
    telegramUsername: status.telegramUsername,
    linkedAt: status.linkedAt,
  };
}

function getTelegramCommand(text) {
  const normalizedText = typeof text === 'string' ? text.trim() : '';

  if (!normalizedText.startsWith('/')) {
    return {
      command: '',
      param: '',
    };
  }

  const parts = normalizedText.split(/\s+/);

  return {
    command: parts[0]?.split('@')[0] ?? '',
    param: parts[1] ?? '',
  };
}

function resolvePhpBinary() {
  const configuredPhp = typeof process.env.PHP_BIN === 'string' ? process.env.PHP_BIN.trim() : '';

  if (configuredPhp) {
    return configuredPhp;
  }

  if (process.platform === 'win32') {
    return 'C:\\xampp\\php\\php.exe';
  }

  return 'php';
}

async function handleTelegramUpdate(update) {
  const result = spawnSync(resolvePhpBinary(), [phpTelegramUpdateScript], {
    input: JSON.stringify(update ?? {}),
    encoding: 'utf8',
    cwd: appRoot,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new Error(stderr || 'No se pudo procesar el update de Telegram desde PHP.');
  }
}

async function handleLegacyTelegramUpdate(update) {
  if (!update?.message) {
    return;
  }

  const message = update.message;
  const chatId = message.chat?.id;
  const text = typeof message.text === 'string' ? message.text : '';
  const username = typeof message.from?.username === 'string' ? message.from.username : '';
  const { command, param } = getTelegramCommand(text);

  if (!chatId || !command) {
    return;
  }

  if (command === '/start') {
    if (param && param.startsWith('link_')) {
      const linkToken = param.slice('link_'.length);
      const userId = telegramStore.consumePendingLink(linkToken);

      if (!userId) {
        await sendTelegramMessage(chatId, 'Ese enlace de vinculacion ya no es valido.');
        return;
      }

      telegramStore.setLinkedUser(userId, {
        chatId,
        telegramUsername: username,
      });

      await sendTelegramMessage(
        chatId,
        '✅ Tu cuenta de Telegram se ha vinculado correctamente con Falles App.\n\nYa puedes recibir avisos, novedades y notificaciones importantes.'
      );

      await sendChannelInvite(chatId);
      return;
    }

    await sendTelegramMessage(
      chatId,
      'Bienvenido al bot de la app de Fallas.\n\nUsa /hoy para ver la agenda o vincula tu cuenta desde la app.'
    );
    return;
  }

  if (command === '/hoy') {
    await sendTelegramMessage(
      chatId,
      'Agenda de hoy:\n- Mascleta 14:00\n- Ofrenda 17:30\n- Castillo 23:59'
    );
    return;
  }

  if (command === '/mapa') {
    await sendTelegramMessage(
      chatId,
      `Abre el mapa aqui: ${(process.env.APP_URL || 'http://localhost:3000')}/mapa`
    );
    return;
  }

  if (command === '/favoritas') {
    await sendTelegramMessage(
      chatId,
      'Gestiona tus fallas favoritas desde la app.'
    );
  }
}

async function startTelegramPolling() {
  if (!isTelegramConfigured()) {
    return;
  }

  let offset = 0;

  while (true) {
    try {
      const updates = await telegramRequest('getUpdates', {
        timeout: 25,
        offset,
      });

      for (const update of updates) {
        offset = Number(update.update_id) + 1;
        await handleTelegramUpdate(update);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown polling error';
      console.error('Telegram polling error:', message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

app.post('/api/assistant', async (request, response) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const messages = Array.isArray(request.body?.messages) ? request.body.messages.filter(isMessage) : [];
  const context = request.body?.context ?? {};

  if (!apiKey) {
    response.status(500).json({
      message: 'Falta OPENROUTER_API_KEY en el entorno del servidor.',
    });
    return;
  }

  if (messages.length === 0) {
    response.status(400).json({
      message: 'Debes enviar al menos un mensaje.',
    });
    return;
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Falles360 Dashboard Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...messages,
        ],
      }),
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      response.status(upstream.status).json({
        message: payload?.error?.message || payload?.message || 'No se pudo completar la solicitud a OpenRouter.',
      });
      return;
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim() === '') {
      response.status(502).json({
        message: 'OpenRouter no devolvio contenido utilizable.',
      });
      return;
    }

    response.json({
      content,
      model: payload?.model || model,
    });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Error inesperado al consultar OpenRouter.',
    });
  }
});

app.post('/api/route', async (request, response) => {
  const requestWaypoints = Array.isArray(request.body?.waypoints) ? request.body.waypoints.filter(isMapPoint) : [];
  const origin = request.body?.origin;
  const destination = request.body?.destination;
  const waypoints = requestWaypoints.length >= 2
    ? requestWaypoints
    : (isMapPoint(origin) && isMapPoint(destination) ? [origin, destination] : []);
  const profile = normalizeRouteProfile(request.body?.profile);

  if (waypoints.length < 2) {
    response.status(400).json({
      message: 'Debes enviar al menos dos puntos de ruta validos.',
    });
    return;
  }

  const routeOrigin = waypoints[0];
  const routeDestination = waypoints[waypoints.length - 1];
  const cacheKey = buildRouteCacheKey(waypoints, profile);
  const cachedRoute = getCachedRoute(cacheKey);

  if (cachedRoute) {
    response.json(cachedRoute);
    return;
  }

  const pendingRequest = cacheKey ? routePendingRequests.get(cacheKey) : null;

  if (pendingRequest) {
    response.json(await pendingRequest);
    return;
  }

  const osrmProfile = profile === 'driving' ? 'driving' : 'foot';
  const coordinates = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const upstreamUrl = new URL(
    `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}`
  );
  upstreamUrl.searchParams.set('overview', 'full');
  upstreamUrl.searchParams.set('geometries', 'geojson');
  upstreamUrl.searchParams.set('steps', 'true');

  const loadRoute = async () => {
    try {
      const upstream = await fetch(upstreamUrl);
      const payload = await upstream.json().catch(() => null);

      if (!upstream.ok || payload?.code !== 'Ok') {
        return buildDirectRoutePayloadForWaypoints(waypoints);
      }

      return buildRoutePayloadFromOsrm(payload, routeOrigin, routeDestination) ?? buildDirectRoutePayloadForWaypoints(waypoints);
    } catch (error) {
      return buildDirectRoutePayloadForWaypoints(waypoints);
    }
  };

  if (cacheKey) {
    routePendingRequests.set(cacheKey, loadRoute());
  }

  try {
    const routePayload = cacheKey
      ? await routePendingRequests.get(cacheKey)
      : await loadRoute();

    if (cacheKey) {
      setCachedRoute(cacheKey, routePayload);
    }

    response.json(routePayload);
  } finally {
    if (cacheKey) {
      routePendingRequests.delete(cacheKey);
    }
  }
});

app.get('/api/map/heat', (request, response) => {
  const bbox = parseHeatBBox(typeof request.query?.bbox === 'string' ? request.query.bbox : '');
  if (!bbox) {
    response.status(422).json({
      ok: false,
      message: 'bbox no valido.',
    });
    return;
  }

  const zoom = normalizeHeatZoom(Number(request.query?.zoom ?? 13));
  const range = typeof request.query?.range === 'string' ? request.query.range : '1h';

  response.json({
    ok: true,
    ...buildDevHeatmapPayload(bbox, zoom, range),
  });
});

app.post('/api/activity/event', (request, response) => {
  const eventType = String(request.body?.event_type ?? '').trim();
  const weight = DEV_EVENT_WEIGHTS[eventType] ?? 1;
  const latitude = Number(request.body?.latitude ?? 0);
  const longitude = Number(request.body?.longitude ?? 0);

  if (!eventType || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude === 0 || longitude === 0) {
    response.status(422).json({
      ok: false,
      message: 'Payload no valido.',
    });
    return;
  }

  DEV_ACTIVITY_EVENTS.push({
    user_id: request.body?.user_id ?? null,
    falla_id: request.body?.falla_id ? String(request.body.falla_id) : null,
    event_type: eventType,
    weight,
    latitude,
    longitude,
    created_at: new Date().toISOString(),
  });

  if (DEV_ACTIVITY_EVENTS.length > 2500) {
    DEV_ACTIVITY_EVENTS.splice(0, DEV_ACTIVITY_EVENTS.length - 2500);
  }

  response.json({ ok: true });
});

function handleTelegramStatusRequest(request, response) {
  const userId = resolveTelegramUserId(request.query.userId);

  if (!userId) {
    response.status(400).json({
      ok: false,
      message: 'Falta userId.',
    });
    return;
  }

  response.json(buildTelegramStatus(userId));
}

function handleTelegramLinkTokenRequest(request, response) {
  if (!isTelegramConfigured()) {
    response.status(503).json({
      ok: false,
      message: 'El bot de Telegram no esta configurado todavia.',
    });
    return;
  }

  const userId = resolveTelegramUserId(request.body?.userId);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();

  if (!userId) {
    response.status(400).json({
      ok: false,
      message: 'Falta userId.',
    });
    return;
  }

  if (!botUsername) {
    response.status(500).json({
      ok: false,
      message: 'Falta TELEGRAM_BOT_USERNAME en el entorno del servidor.',
    });
    return;
  }

  const token = generateLinkToken();
  telegramStore.createPendingLink(userId, token);

  response.json({
    ok: true,
    telegramUrl: `https://t.me/${botUsername}?start=link_${token}`,
  });
}

async function handleTelegramNotifyRequest(request, response) {
  if (!isTelegramConfigured()) {
    response.status(503).json({
      ok: false,
      message: 'El bot de Telegram no esta configurado todavia.',
    });
    return;
  }

  const userId = resolveTelegramUserId(request.body?.userId);
  const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';

  if (!userId) {
    response.status(400).json({
      ok: false,
      message: 'Falta userId.',
    });
    return;
  }

  if (message.length === 0) {
    response.status(400).json({
      ok: false,
      message: 'Falta message.',
    });
    return;
  }

  const linkedUser = telegramStore.getLinkedUser(userId);

  if (!linkedUser?.chatId) {
    response.status(404).json({
      ok: false,
      message: 'Usuario no vinculado a Telegram.',
    });
    return;
  }

  try {
    await sendTelegramMessage(linkedUser.chatId, message);

    response.json({
      ok: true,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo enviar la notificacion.',
    });
  }
}

async function handleTelegramChannelAvisoRequest(request, response) {
  if (!isTelegramConfigured()) {
    response.status(503).json({
      ok: false,
      message: 'El bot de Telegram no esta configurado todavia.',
    });
    return;
  }

  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
  const detail = request.body?.detail;
  const location = request.body?.location;
  const footer = request.body?.footer;
  const buttonText = typeof request.body?.buttonText === 'string' && request.body.buttonText.trim().length > 0
    ? request.body.buttonText.trim()
    : 'Abrir app';
  const buttonUrl = typeof request.body?.buttonUrl === 'string' && request.body.buttonUrl.trim().length > 0
    ? request.body.buttonUrl.trim()
    : `${process.env.APP_URL || 'http://localhost:3000'}/agenda`;

  if (title.length === 0) {
    response.status(400).json({
      ok: false,
      message: 'Falta title.',
    });
    return;
  }

  try {
    await sendChannelPost({
      type: 'aviso',
      title,
      detail,
      location,
      footer,
      buttonText,
      buttonUrl,
    });

    response.json({
      ok: true,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo publicar el aviso.',
    });
  }
}

async function handleTelegramChannelPostRequest(request, response) {
  if (!isTelegramConfigured()) {
    response.status(503).json({
      ok: false,
      message: 'El bot de Telegram no esta configurado todavia.',
    });
    return;
  }

  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';

  if (title.length === 0) {
    response.status(400).json({
      ok: false,
      message: 'Falta title.',
    });
    return;
  }

  try {
    await sendChannelPost({
      type: request.body?.type,
      title,
      detail: request.body?.detail,
      location: request.body?.location,
      footer: request.body?.footer,
      buttonText: request.body?.buttonText,
      buttonUrl: request.body?.buttonUrl,
    });

    response.json({
      ok: true,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo publicar en el canal.',
    });
  }
}

async function handleTelegramWebhookRequest(request, response) {
  if (!isTelegramConfigured()) {
    response.status(503).json({
      ok: false,
      message: 'El bot de Telegram no esta configurado todavia.',
    });
    return;
  }

  try {
    await handleTelegramUpdate(request.body ?? {});

    response.json({
      ok: true,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo procesar el webhook de Telegram.',
    });
  }
}

app.get('/api/telegram/status', handleTelegramStatusRequest);
app.get('/api/telegram/status.php', handleTelegramStatusRequest);
app.post('/api/telegram/link-token', handleTelegramLinkTokenRequest);
app.post('/api/telegram/link-token.php', handleTelegramLinkTokenRequest);
app.post('/api/telegram/notify', handleTelegramNotifyRequest);
app.post('/api/telegram/notify.php', handleTelegramNotifyRequest);
app.post('/api/telegram/channel/aviso', handleTelegramChannelAvisoRequest);
app.post('/api/telegram/channel/aviso.php', handleTelegramChannelAvisoRequest);
app.post('/api/telegram/channel/post', handleTelegramChannelPostRequest);
app.post('/api/telegram/channel/post.php', handleTelegramChannelPostRequest);
app.post('/api/telegram/webhook.php', handleTelegramWebhookRequest);

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      next();
      return;
    }

    response.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, async () => {
  console.log(`Assistant server listening on http://localhost:${port}`);

  if (!isTelegramConfigured()) {
    console.log('Telegram bot disabled: missing TELEGRAM_BOT_TOKEN.');
    return;
  }

  try {
    await setBotCommands();
    console.log('Telegram bot commands configured.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Telegram setup error';
    console.error('No se pudieron configurar los comandos de Telegram:', message);
  }

  void startTelegramPolling();
});
