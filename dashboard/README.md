<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8814a943-bdbe-474a-b3c9-e9fbb80b3d5c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Crea `.env.local` a partir de [.env.example](.env.example)
3. Añade `OPENROUTER_API_KEY` en `.env.local`
4. Si quieres cambiar de modelo, ajusta `OPENROUTER_MODEL` en `.env.local`
5. Run the app:
   `npm run dev`

`npm run dev` levanta la app Vite y el servidor local del asistente en paralelo.

## AI Assistant

El dashboard incluye un asistente IA conectado a `OpenRouter` mediante el endpoint local `POST /api/assistant`.

- El servidor del asistente vive en `server/index.mjs`
- La UI del asistente vive en `src/components/AIAssistant.tsx`
- En desarrollo, Vite hace proxy de `/api/*` hacia `http://localhost:3001`

## Production

1. Build the app:
   `npm run build`
2. Start the server:
   `npm run start`

El servidor servirá `dist/` y el endpoint `/api/assistant` desde el mismo proceso.
