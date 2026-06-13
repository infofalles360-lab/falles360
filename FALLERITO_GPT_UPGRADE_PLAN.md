# Fallerito GPT Upgrade Plan

## Objetivo

Convertir Fallerito de asistente tematico con reglas + RAG local en un agente multimodal con herramientas, memoria, recuperacion de conocimiento, busqueda externa y acciones dentro de Fallas 360.

No se busca "copiar ChatGPT" a ciegas. Se busca llevar Fallerito a un nivel comparable en capacidades utiles para este producto.

## Estado actual de Fallerito

Backend principal:

- `api/fallerito.php`
- `api/fallerito-memory-lib.php`
- `api/fallerito-memory.php`

Capacidades ya implementadas:

- Memoria persistente por usuario: idioma, preferencia andando, evitar multitudes, interes por comida y zonas habituales.
- RAG local sobre:
  - catalogo de fallas
  - agenda/eventos
  - marketplace
  - articulos de Cendra
  - documentos locales
- Modo planificador de ruta.
- Modo "cerca de mi" con GPS o zona.
- Respuestas especiales de transporte y emergencia.
- Analisis de documentos e imagenes adjuntas.
- Acciones de interfaz:
  - abrir mapa
  - abrir agenda
  - abrir marketplace
  - abrir perfil
  - abrir catalogo de fallas
  - abrir ruta a una falla
- Fallback conversacional con Ollama.

## Lo que le falta para parecerse a GPT

### 1. Orquestacion real de herramientas

Hoy Fallerito detecta intenciones y arma acciones a mano.

Objetivo:

- Definir herramientas formales para el modelo:
  - `search_fallas`
  - `search_events`
  - `search_marketplace`
  - `get_user_profile`
  - `get_user_memory`
  - `get_nearby_fallas`
  - `build_plan`
  - `open_tab`
  - `open_route`
  - `link_telegram`
  - `search_cendra`
  - `search_documents`
- Dejar que el modelo decida que herramienta llamar y en que orden.
- Responder con trazabilidad de herramientas usadas.

### 2. Conversacion mas larga y mejor memoria

Hoy la memoria es util, pero limitada.

Objetivo:

- Resumen automatico de conversaciones largas.
- Memoria separada en:
  - perfil persistente
  - preferencias temporales
  - contexto de sesion
  - resumen de hilo
- Recuperacion selectiva de memoria segun la consulta.

### 3. Busqueda externa con citas

Hoy no hay web search real dentro de Fallerito.

Objetivo:

- Buscar informacion actual cuando haga falta:
  - horarios especiales
  - noticias de ultima hora
  - incidencias
  - informacion oficial reciente
- Responder con citas y fuentes visibles.
- Limitar la web solo a dominios oficiales o fiables en temas sensibles.

### 4. Recuperacion documental seria

Hoy el RAG documental es local y simple.

Objetivo:

- Indexar PDFs, DOCX, hojas y contenido editorial en una base vectorial.
- Soportar preguntas de tipo:
  - "que dice el programa oficial sobre la Ofrenda"
  - "resumeme este PDF"
  - "compara este documento con la agenda"
- Mostrar fragmentos y fuentes.

### 5. Multimodalidad completa

Hoy puede procesar adjuntos y vision si hay modelo local.

Objetivo:

- Imagen:
  - explicar una foto de falla
  - detectar cartel, horario o ubicacion en una captura
  - comparar dos imagenes
- Voz:
  - entrada por voz
  - respuesta por audio opcional
- Archivo:
  - PDF, Word, imagen, captura y futuras notas del usuario

### 6. Salidas estructuradas

Hoy casi toda la respuesta es texto libre.

Objetivo:

- Respuestas JSON para UI:
  - plan
  - listado de fallas
  - listado de actos
  - recomendaciones
  - botones
  - mapas
- Separar:
  - `answer`
  - `actions`
  - `cards`
  - `citations`
  - `debug_trace`

### 7. Modo agente dentro de la app

Hoy Fallerito sugiere acciones; mañana debe poder ejecutar flujos.

Objetivo:

- Encadenar acciones:
  - abrir mapa
  - centrar zona
  - seleccionar falla
  - abrir ruta
  - abrir agenda del dia
  - abrir oferta cercana
- Resolver tareas del tipo:
  - "tengo 90 minutos, hazme un plan cerca de Colon"
  - "quiero una falla infantil y luego horchata cerca"
  - "quiero evitar multitudes y volver en metro"

### 8. Seguridad, evaluacion y control

Objetivo:

- Moderacion de entradas.
- Filtro de respuestas peligrosas o inventadas.
- Telemetria por herramienta.
- Evaluaciones automaticas sobre:
  - precision
  - utilidad
  - grounding
  - tasa de alucinacion

## Arquitectura objetivo

### Capa 1. Router de conversacion

Recibe mensaje, adjuntos, GPS, contexto de pantalla y memoria.

### Capa 2. Gestor de contexto

Compone:

- historial resumido
- memoria persistente
- estado de sesion
- contexto UI
- fuentes documentales

### Capa 3. Modelo con herramientas

El modelo decide:

- si responder directamente
- si buscar en datos internos
- si consultar documentos
- si hacer web search
- si llamar acciones UI

### Capa 4. Ejecutores

Implementan herramientas reales contra:

- base de datos
- agenda
- mapa
- marketplace
- documentos
- noticias
- perfil

### Capa 5. Renderer de respuesta

Entrega:

- texto final
- cards
- botones
- citas
- trazas opcionales

## Prioridad real para Falles 360

### Fase 1. Pasar de "chat con reglas" a "agente con herramientas"

Implementar primero:

- tool calling interno
- respuestas estructuradas
- mejor estado de sesion
- mas acciones UI

### Fase 2. Busqueda y conocimiento

- vector store documental
- busqueda con citas
- busqueda web para actualidad

### Fase 3. Multimodal y voz

- voz a texto
- texto a voz
- vision mejor integrada

### Fase 4. Calidad y producto

- evaluaciones
- analitica
- seguridad
- ranking de fuentes
- personalizacion avanzada

## Alcance recomendado para este proyecto

### Lo que si tiene sentido

- GPT con tools
- web search con citas
- file search sobre documentos oficiales y material interno
- vision
- memoria mejorada
- structured outputs
- acciones dentro de la app

### Lo que no es prioritario ahora

- code interpreter para usuario final fallero
- computer use tipo escritorio remoto
- generacion de imagenes dentro del chat como funcion central

## Decisiones tecnicas recomendadas

### Opcion A. Mantener Ollama como fallback

- OpenAI para modo premium/agente.
- Ollama como respaldo local.
- Misma interfaz de herramientas.

Ventaja:

- resiliencia
- costes controlables
- modo local si falla proveedor externo

### Opcion B. Migrar Fallerito principal a un stack tipo GPT

- Responses API
- tools
- file search
- web search
- structured outputs

Ventaja:

- arquitectura mas limpia
- menos codigo heuristico
- mas capacidades reales del modelo

## Primer sprint recomendado

1. Extraer herramientas internas desde `fallerito.php` a un catalogo formal.
2. Cambiar la salida del backend a formato estructurado.
3. Crear contexto de sesion resumido.
4. Activar web search solo para consultas de actualidad.
5. Activar file search para PDFs y programas oficiales.
6. Mantener planner, nearby y marketplace como herramientas invocables.

## Resultado esperado

Fallerito pasaria de ser:

- un chatbot tematico con buenas reglas

a ser:

- un agente fallero multimodal
- con memoria
- con herramientas
- con citas
- con acciones reales dentro de la app
- y mucho mas cercano a la experiencia de GPT

