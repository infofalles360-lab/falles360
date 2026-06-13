import crypto from 'node:crypto';

const CHANNEL_POST_TEMPLATES = {
  aviso: {
    heading: '\u{1F6A8} AVISO',
    footer: 'Consulta m\u00E1s detalles en la app.'
  },
  novedad: {
    heading: '\u{1F4F0} NOVEDAD',
    footer: '\u00C1brelas desde la app.'
  },
  ruta: {
    heading: '\u{1F4CD} RUTA RECOMENDADA',
    footer: 'Disponible en la app.'
  }
};

const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID
  || process.env.TELEGRAM_CHANNEL_CHAT_ID
  || process.env.TELEGRAM_CHANNEL_USERNAME
  || '@Falles360';

function getTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error('Falta TELEGRAM_BOT_TOKEN en el entorno del servidor.');
  }

  return token;
}

function getTelegramApiUrl() {
  return `https://api.telegram.org/bot${getTelegramToken()}`;
}

function normalizeChannelPostLines(content) {
  if (Array.isArray(content)) {
    return content
      .map((line) => String(line ?? '').trim())
      .filter(Boolean);
  }

  const normalized = String(content ?? '').trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeChannelPostText(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveChannelPostType(type) {
  const normalized = normalizeChannelPostText(type).toLowerCase();

  if (normalized === 'noticia') {
    return 'novedad';
  }

  if (normalized in CHANNEL_POST_TEMPLATES) {
    return normalized;
  }

  return 'novedad';
}

function getChannelChatId() {
  const configuredTarget = normalizeChannelPostText(CHANNEL_ID);

  if (!configuredTarget) {
    return '@Falles360';
  }

  if (configuredTarget.startsWith('@') || configuredTarget.startsWith('-')) {
    return configuredTarget;
  }

  return `@${configuredTarget}`;
}

function buildChannelReplyMarkup(buttonText, buttonUrl) {
  const text = normalizeChannelPostText(buttonText);
  const url = normalizeChannelPostText(buttonUrl);

  if (!text || !url) {
    return {};
  }

  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text,
            url
          }
        ]
      ]
    }
  };
}

function buildChannelMessage({ type, title, detail, location, footer }) {
  const templates = {
    aviso: { icon: '\u{1F6A8}', label: 'AVISO' },
    novedad: { icon: '\u{1F4F0}', label: 'NOVEDAD' },
    ruta: { icon: '\u{1F4CD}', label: 'RUTA RECOMENDADA' },
  };

  const selected = templates[type] || { icon: '\u{1F4E2}', label: 'INFORMACION' };
  const detailLines = normalizeChannelPostLines(detail);
  const normalizedLocation = normalizeChannelPostText(location);
  const normalizedFooter = normalizeChannelPostText(footer);
  const normalizedTitle = normalizeChannelPostText(title);
  let text = `${selected.icon} <b>${escapeHtml(selected.label)}</b>\n\n`;

  text += `<b>${escapeHtml(normalizedTitle)}</b>\n`;

  if (detailLines.length > 0) {
    text += `${detailLines.map((line) => escapeHtml(line)).join('\n')}\n`;
  }

  if (normalizedLocation) {
    text += `\u{1F4CD} ${escapeHtml(normalizedLocation)}\n`;
  }

  if (normalizedFooter) {
    text += `\n${escapeHtml(normalizedFooter)}`;
  }

  return text.trim();
}

function buildDirectAlertMessage({ type, title, detail, location, footer }) {
  const labels = {
    aviso: '\u{1F6A8} AVISO',
    novedad: '\u{1F4F0} NOVEDAD',
    ruta: '\u{1F4CD} RUTA RECOMENDADA',
  };

  const detailLines = normalizeChannelPostLines(detail);
  const normalizedLocation = normalizeChannelPostText(location);
  const normalizedFooter = normalizeChannelPostText(footer);
  const normalizedTitle = normalizeChannelPostText(title);
  let text = `${labels[type] || '\u{1F4E2} INFORMACION'}\n\n${normalizedTitle}\n`;

  if (detailLines.length > 0) {
    text += `${detailLines.join('\n')}\n`;
  }

  if (normalizedLocation) {
    text += `\u{1F4CD} ${normalizedLocation}\n`;
  }

  if (normalizedFooter) {
    text += `\n${normalizedFooter}`;
  }

  return text.trim();
}

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export async function telegramRequest(method, body = {}) {
  const response = await fetch(`${getTelegramApiUrl()}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const raw = await response.text();
  let data = null;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Telegram API error in ${method}: invalid JSON response`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram API error in ${method}: ${JSON.stringify(data)}`);
  }

  return data.result;
}

export async function sendTelegramMessage(chatId, text, extra = {}) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    ...extra
  });
}

export async function sendChannelInvite(chatId) {
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL;
  const channelName = process.env.TELEGRAM_CHANNEL_NAME || 'Falles360';

  return sendTelegramMessage(
    chatId,
    `\u{1F389} Telegram ya est\u00E1 conectado con tu cuenta.\n\n`
      + `Accede al canal oficial ${channelName} para enterarte de avisos, noticias y novedades generales de la app de Fallas.`,
    buildChannelReplyMarkup(`\u{1F4F2} Entrar en ${channelName}`, channelUrl)
  );
}

export function formatChannelPost(postOrType, content, options = {}) {
  if (typeof postOrType === 'object' && postOrType !== null && !Array.isArray(postOrType)) {
    const type = resolveChannelPostType(postOrType.type);
    const template = CHANNEL_POST_TEMPLATES[type];
    const lines = [];
    const title = normalizeChannelPostText(postOrType.title);
    const detailLines = normalizeChannelPostLines(postOrType.detail);
    const location = normalizeChannelPostText(postOrType.location);
    const footer = normalizeChannelPostText(postOrType.footer) || template.footer;

    if (title) {
      lines.push(title);
    }

    if (detailLines.length > 0) {
      lines.push(...detailLines);
    }

    if (location) {
      lines.push(`\u{1F4CD} ${location}`);
    }

    return [template.heading, lines.join('\n'), footer]
      .filter((section) => section.length > 0)
      .join('\n\n');
  }

  const type = resolveChannelPostType(postOrType);
  const template = CHANNEL_POST_TEMPLATES[type];
  const body = normalizeChannelPostLines(content).join('\n');
  const footer = normalizeChannelPostText(options.footer) || template.footer;

  return [template.heading, body, footer]
    .filter((section) => section.length > 0)
    .join('\n\n');
}

export async function sendStructuredChannelPost(type, content, options = {}) {
  return sendChannelPost(formatChannelPost(type, content, options));
}

export async function sendChannelPost(payload) {
  if (typeof payload === 'string') {
    return telegramRequest('sendMessage', {
      chat_id: getChannelChatId(),
      text: payload
    });
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload) && normalizeChannelPostText(payload.title)) {
    const extra = buildChannelReplyMarkup(payload?.buttonText, payload?.buttonUrl);

    return telegramRequest('sendMessage', {
      chat_id: getChannelChatId(),
      text: buildChannelMessage({
        type: payload.type,
        title: payload.title,
        detail: payload.detail,
        location: payload.location,
        footer: normalizeChannelPostText(payload.footer) || 'Consulta mas detalles en la app.'
      }),
      parse_mode: 'HTML',
      ...extra
    });
  }

  const text = formatChannelPost(payload);
  const extra = buildChannelReplyMarkup(payload?.buttonText, payload?.buttonUrl);

  return telegramRequest('sendMessage', {
    chat_id: getChannelChatId(),
    text,
    ...extra
  });
}

export async function setBotCommands() {
  return telegramRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'Iniciar el bot' },
      { command: 'hoy', description: 'Ver agenda fallera de hoy' },
      { command: 'mapa', description: 'Abrir mapa de la app' },
      { command: 'favoritas', description: 'Gestionar fallas favoritas' },
      { command: 'cendra', description: 'Buscar noticias de Cendra' },
      { command: 'canal', description: 'Preparar borrador para el canal' }
    ]
  });
}

export function generateLinkToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function sendDirectTelegramAlert(chatId, payload) {
  return sendTelegramMessage(
    chatId,
    buildDirectAlertMessage({
      ...payload,
      footer: normalizeChannelPostText(payload?.footer) || 'Consulta mas detalles en la app.'
    })
  );
}
