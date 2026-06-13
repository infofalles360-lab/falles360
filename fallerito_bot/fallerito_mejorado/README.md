# Fallerito Bot - Falles360 con IA local

Bot local para Falles360. Usa dos capas:

- Clasificador local entrenado con `scikit-learn` para detectar la intencion.
- Ollama local con `dolphin-llama3:8b` para redactar respuestas naturales con contexto de la app.

No usa Anthropic ni ninguna API externa.

## Requisitos

- Python 3.10 o superior.
- Ollama instalado y arrancado.
- Modelo local:

```bash
ollama pull dolphin-llama3:8b
```

Comprueba que existe:

```bash
ollama list
```

## Instalar dependencias

```bash
pip install -r requirements.txt
```

## Entrenar para Falles360

```bash
python entrenar.py
```

Esto genera `modelo_fallerito.pkl`.

El entrenamiento usa `datos_entrenamiento.json`. Ya incluye intenciones generales de Fallas y nuevas intenciones de la app:

- `marketplace_app`
- `pasaporte_app`
- `avisos_app`
- `admin_panel_app`
- `telegram_app`

## Ejecutar el bot

```bash
python bot.py
```

Comandos dentro del chat:

- `ayuda`: ver comandos.
- `debug`: ver intencion detectada, confianza y si responde Ollama o fallback.
- `ollama`: comprobar conexion con `dolphin-llama3:8b`.
- `limpiar`: limpiar terminal.
- `salir`: cerrar.

## Configuracion Ollama

Variables opcionales:

```bash
set FALLERITO_OLLAMA_MODEL=dolphin-llama3:8b
set FALLERITO_OLLAMA_URL=http://localhost:11434/api/chat
set FALLERITO_OLLAMA_TIMEOUT=120
set FALLERITO_USE_OLLAMA=1
```

Para probar solo el clasificador local sin Ollama:

```bash
set FALLERITO_USE_OLLAMA=0
python bot.py
```

## Como seguir entrenandolo para la app

1. Anade frases de usuario en `datos_entrenamiento.json`.
2. Anade respuestas base en `respuestas.json`.
3. Ejecuta:

```bash
python entrenar.py
```

Ejemplo:

```json
"marketplace_app": [
  "donde canjeo un cupon",
  "quiero ofertas cerca de mi falla",
  "como compro merchandising"
]
```

El LLM de Ollama no se fine-tunea aqui. Se guia con:

- La intencion detectada por el clasificador.
- La respuesta base entrenada.
- El historial reciente.
- Un prompt de sistema con contexto de Falles360 dentro de `bot.py`.

## Estructura

```text
fallerito_mejorado/
  bot.py
  entrenar.py
  datos_entrenamiento.json
  respuestas.json
  modelo_fallerito.pkl
  requirements.txt
  README.md
```
