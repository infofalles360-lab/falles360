// Cómo enviar avisos reales desde la app
// Cuando ya tengas vinculado el chat_id, podrás lanzar mensajes como:

await fetch("/api/telegram/notify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    userId: 123,
    message: "🔥 Tu falla favorita empieza acto en 15 minutos."
  })
});
