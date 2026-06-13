import express from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  telegramRequest,
  sendChannelInvite,
  sendChannelPost,
  sendDirectTelegramAlert,
  sendTelegramMessage,
  setBotCommands,
  generateLinkToken
} from "./telegram.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.resolve(projectRoot, "..");
const workspaceRoot = path.resolve(appRoot, "..");

for (const envFile of [
  path.join(workspaceRoot, ".env"),
  path.join(workspaceRoot, ".env.local"),
  path.join(appRoot, ".env"),
  path.join(appRoot, ".env.local"),
  path.join(projectRoot, ".env"),
  path.join(projectRoot, ".env.local")
]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }
}

const app = express();
app.use(express.json());

const PORT = process.env.DASHBOARD_PORT || process.env.ASSISTANT_API_PORT || 3001;

/**
 * Sustituye esto por tu base de datos real.
 * Aqui lo dejo en memoria para que lo entiendas rapido.
 */
const pendingLinks = new Map(); // linkToken -> userId
const linkedUsers = new Map(); // userId -> { chatId, telegramUsername }

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({ error: "No autorizado" });
  }

  next();
}

async function handleTelegramUpdate(update) {
  if (!update.message) return;

  const message = update.message;
  const chatId = message.chat.id;
  const text = message.text || "";
  const username = message.from?.username || "";

  if (text.startsWith("/start")) {
    const param = text.split(" ")[1];

    if (param && param.startsWith("link_")) {
      const linkToken = param.replace("link_", "");
      const userId = pendingLinks.get(linkToken);

      if (!userId) {
        await sendTelegramMessage(chatId, "Ese enlace de vinculacion ya no es valido.");
        return;
      }

      linkedUsers.set(userId, {
        chatId,
        telegramUsername: username
      });

      pendingLinks.delete(linkToken);

      await sendTelegramMessage(
        chatId,
        "\u2705 Tu cuenta de Telegram se ha vinculado correctamente con Falles App.\n\nYa puedes recibir avisos, novedades y notificaciones importantes."
      );

      await sendChannelInvite(chatId);
      return;
    }

    await sendTelegramMessage(
      chatId,
      "Bienvenido al bot de la app de Fallas.\n\nUsa /hoy para ver la agenda o vincula tu cuenta desde la app."
    );
    return;
  }

  if (text === "/hoy") {
    await sendTelegramMessage(
      chatId,
      "Agenda de hoy:\n- Mascleta 14:00\n- Ofrenda 17:30\n- Castillo 23:59"
    );
    return;
  }

  if (text === "/mapa") {
    await sendTelegramMessage(
      chatId,
      `Abre el mapa aqui: ${process.env.APP_URL}/mapa`
    );
    return;
  }

  if (text === "/favoritas") {
    await sendTelegramMessage(
      chatId,
      "Gestiona tus fallas favoritas desde la app."
    );
    return;
  }
}

async function startPolling() {
  let offset = 0;

  while (true) {
    try {
      const updates = await telegramRequest("getUpdates", {
        timeout: 25,
        offset
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleTelegramUpdate(update);
      }
    } catch (error) {
      console.error("Polling error:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

/**
 * Endpoint para generar un enlace de vinculacion desde tu app.
 * Aqui simulo que el userId viene en el body.
 */
app.post("/api/telegram/link-token", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Falta userId" });
  }

  const token = generateLinkToken();
  pendingLinks.set(token, userId);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const telegramUrl = `https://t.me/${botUsername}?start=link_${token}`;

  res.json({ telegramUrl });
});

/**
 * Endpoint para enviar una notificacion a un usuario ya vinculado.
 */
app.post("/api/telegram/notify", async (req, res) => {
  try {
    const { userId, message } = req.body;

    const linked = linkedUsers.get(userId);

    if (!linked) {
      return res.status(404).json({ error: "Usuario no vinculado a Telegram" });
    }

    await sendTelegramMessage(linked.chatId, message);

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo enviar la notificacion" });
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  res.json({
    user: {
      id: req.session.user.id,
      username: req.session.user.username,
      role: req.session.user.role
    }
  });
});

app.post("/api/telegram/channel/aviso", async (req, res) => {
  try {
    const {
      title,
      detail,
      location,
      footer,
      buttonText,
      buttonUrl
    } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Falta title" });
    }

    await sendChannelPost({
      type: "aviso",
      title,
      detail,
      location,
      footer,
      buttonText:
        typeof buttonText === "string" && buttonText.trim().length > 0
          ? buttonText
          : "Abrir app",
      buttonUrl:
        typeof buttonUrl === "string" && buttonUrl.trim().length > 0
          ? buttonUrl
          : `${process.env.APP_URL}/agenda`
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo publicar el aviso" });
  }
});

app.post("/api/telegram/channel/post", async (req, res) => {
  try {
    const {
      type,
      title,
      detail,
      location,
      footer,
      buttonText,
      buttonUrl
    } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Falta title" });
    }

    await sendChannelPost({
      type,
      title,
      detail,
      location,
      footer,
      buttonText,
      buttonUrl
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo publicar en el canal" });
  }
});

app.post("/api/admin/telegram/send", requireAdmin, async (req, res) => {
  try {
    const { type, title, detail, location, footer, target } = req.body ?? {};

    if (!type || !title || !target) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (!["channel", "users", "both"].includes(target)) {
      return res.status(400).json({ error: "Target no valido" });
    }

    let sentChannel = false;
    let sentUsers = 0;

    if (target === "channel" || target === "both") {
      await sendChannelPost({
        type,
        title,
        detail,
        location,
        footer,
        buttonText: "Abrir app",
        buttonUrl: `${process.env.APP_URL}`
      });
      sentChannel = true;
    }

    if (target === "users" || target === "both") {
      const linkedRecipients = Array.from(linkedUsers.values()).filter((user) => user?.chatId);

      for (const user of linkedRecipients) {
        try {
          await sendDirectTelegramAlert(user.chatId, {
            type,
            title,
            detail,
            location,
            footer
          });
          sentUsers += 1;
        } catch (err) {
          console.error(`Error enviando a ${user.chatId}:`, err.message);
        }
      }
    }

    res.json({ ok: true, sent: { channel: sentChannel, users: sentUsers } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo enviar el aviso" });
  }
});

app.listen(PORT, async () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);

  try {
    await setBotCommands();
    console.log("Comandos del bot configurados");
  } catch (error) {
    console.error("No se pudieron configurar los comandos:", error.message);
  }

  startPolling();
});
