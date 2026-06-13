import fs from 'node:fs';
import path from 'node:path';

const MAX_PENDING_LINK_AGE_MS = 1000 * 60 * 60 * 6;

function createDefaultState() {
  return {
    lastUpdateId: 0,
    pendingLinks: {},
    linkedUsers: {},
  };
}

function normalizeUserId(userId) {
  const normalized = String(userId ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function ensureStateShape(value) {
  if (!value || typeof value !== 'object') {
    return createDefaultState();
  }

  return {
    lastUpdateId: Number.isFinite(Number(value.lastUpdateId)) ? Number(value.lastUpdateId) : 0,
    pendingLinks: value.pendingLinks && typeof value.pendingLinks === 'object' ? value.pendingLinks : {},
    linkedUsers: value.linkedUsers && typeof value.linkedUsers === 'object' ? value.linkedUsers : {},
  };
}

function readState(filePath) {
  if (!fs.existsSync(filePath)) {
    return createDefaultState();
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return ensureStateShape(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

function writeState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

function cleanupPendingLinks(state, now = Date.now()) {
  for (const [token, entry] of Object.entries(state.pendingLinks)) {
    const createdAt = typeof entry?.createdAt === 'string' ? Date.parse(entry.createdAt) : NaN;

    if (!Number.isFinite(createdAt) || now - createdAt > MAX_PENDING_LINK_AGE_MS) {
      delete state.pendingLinks[token];
    }
  }
}

export function createTelegramStore(filePath) {
  function loadState() {
    const state = readState(filePath);
    cleanupPendingLinks(state);
    return state;
  }

  function saveState(state) {
    cleanupPendingLinks(state);
    writeState(filePath, state);
  }

  function getLinkedRecord(userId) {
    const normalizedUserId = normalizeUserId(userId);

    if (!normalizedUserId) {
      return null;
    }

    const state = loadState();
    const record = state.linkedUsers[normalizedUserId];

    if (!record || typeof record !== 'object') {
      return null;
    }

    return {
      userId: normalizedUserId,
      chatId: record.chatId ?? null,
      telegramUsername: typeof record.telegramUsername === 'string' && record.telegramUsername.trim() !== ''
        ? record.telegramUsername
        : null,
      linkedAt: typeof record.linkedAt === 'string' ? record.linkedAt : null,
    };
  }

  return {
    getLinkStatus(userId) {
      const record = getLinkedRecord(userId);

      return {
        linked: Boolean(record?.chatId),
        telegramUsername: record?.telegramUsername ?? null,
        linkedAt: record?.linkedAt ?? null,
      };
    },

    getLinkedUser(userId) {
      return getLinkedRecord(userId);
    },

    createPendingLink(userId, token) {
      const normalizedUserId = normalizeUserId(userId);

      if (!normalizedUserId) {
        throw new Error('Falta un userId valido.');
      }

      const state = loadState();

      for (const [existingToken, entry] of Object.entries(state.pendingLinks)) {
        if (entry?.userId === normalizedUserId) {
          delete state.pendingLinks[existingToken];
        }
      }

      state.pendingLinks[token] = {
        userId: normalizedUserId,
        createdAt: new Date().toISOString(),
      };

      saveState(state);
    },

    consumePendingLink(token) {
      const normalizedToken = String(token ?? '').trim();

      if (normalizedToken.length === 0) {
        return null;
      }

      const state = loadState();
      const entry = state.pendingLinks[normalizedToken];

      if (!entry || typeof entry.userId !== 'string') {
        return null;
      }

      delete state.pendingLinks[normalizedToken];
      saveState(state);

      return entry.userId;
    },

    setLinkedUser(userId, payload) {
      const normalizedUserId = normalizeUserId(userId);

      if (!normalizedUserId) {
        throw new Error('Falta un userId valido.');
      }

      const state = loadState();

      for (const [existingUserId, record] of Object.entries(state.linkedUsers)) {
        if (String(record?.chatId ?? '') === String(payload.chatId)) {
          delete state.linkedUsers[existingUserId];
        }
      }

      state.linkedUsers[normalizedUserId] = {
        chatId: payload.chatId,
        telegramUsername: typeof payload.telegramUsername === 'string' ? payload.telegramUsername.trim() : '',
        linkedAt: new Date().toISOString(),
      };

      saveState(state);

      return this.getLinkedUser(normalizedUserId);
    },
  };
}
