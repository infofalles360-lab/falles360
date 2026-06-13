import json
import os
import pickle
import random
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent
RUTA_MODELO = BASE_DIR / "modelo_fallerito.pkl"
RUTA_RESPUESTAS = BASE_DIR / "respuestas.json"

MODO_DEBUG = False
UMBRAL_CONFIANZA = 0.30
MAX_HISTORIAL = 6
NOMBRE_BOT = "Fallerito"

OLLAMA_MODEL = os.getenv("FALLERITO_OLLAMA_MODEL", "dolphin-llama3:8b")
OLLAMA_URL = os.getenv("FALLERITO_OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_TIMEOUT = float(os.getenv("FALLERITO_OLLAMA_TIMEOUT", "120"))
OLLAMA_ENABLED = os.getenv("FALLERITO_USE_OLLAMA", "1").strip().lower() not in {"0", "false", "no"}

APP_CONTEXT = """
Eres Fallerito, asistente local de Falles360/Fallas 360.
Respondes en espanol claro, cercano y practico, con frases cortas.
No inventes datos en tiempo real. Si no sabes un horario exacto, di que debe revisarse en la agenda de la app.

Contexto de la app:
- Mapa interactivo de fallas de Valencia con ubicacion, favoritos, detalle de monumentos y rutas.
- Agenda para actos falleros, mascletas, ofrenda, crema, castillos y eventos destacados.
- Pasaporte Fallero/gamificacion: visitas, insignias, niveles y progreso.
- Marketplace: restaurantes, cupones QR, productos, experiencias y sponsors cerca de la ruta.
- Avisos del panel: los admins pueden publicar avisos que aparecen como popup y quedan arriba como indicador.
- Telegram: usuarios vinculados pueden recibir avisos y novedades.
- Admin: panel para gestionar comisiones, eventos, galeria, sponsors, avisos y aprobaciones.

Reglas:
- Prioriza acciones dentro de la app: mapa, agenda, favoritos, marketplace, perfil y avisos.
- Si el usuario pide una ruta, da una propuesta por zonas y pregunta por tiempo/ubicacion si falta.
- Si pregunta por cupones o comer, dirige al Marketplace.
- Si pregunta por progreso, visitas o insignias, dirige al Pasaporte Fallero/perfil.
- Si pregunta por avisos, explica que aparecen en popup y luego en el indicador superior.
- No menciones Anthropic, OpenAI ni APIs externas.
""".strip()


class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    ROJO = "\033[91m"
    VERDE = "\033[92m"
    AMARILLO = "\033[93m"
    AZUL = "\033[94m"
    CYAN = "\033[96m"
    GRIS = "\033[90m"


def normalizar(texto: str) -> str:
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^\w\s]", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def cargar_modelo():
    if not RUTA_MODELO.exists():
        raise FileNotFoundError(
            f"{C.ROJO}No existe modelo_fallerito.pkl. Ejecuta: python entrenar.py{C.RESET}"
        )
    with open(RUTA_MODELO, "rb") as f:
        return pickle.load(f)


def cargar_respuestas():
    if not RUTA_RESPUESTAS.exists():
        raise FileNotFoundError(f"{C.ROJO}No existe respuestas.json{C.RESET}")
    with open(RUTA_RESPUESTAS, "r", encoding="utf-8") as f:
        return json.load(f)


def detectar_intencion(modelo, mensaje: str):
    msg_norm = normalizar(mensaje)
    intencion = modelo.predict([msg_norm])[0]
    probs = modelo.predict_proba([msg_norm])[0]
    confianza = max(probs)
    return intencion, confianza


def seleccionar_respuesta(respuestas: dict, intencion: str, historial: list) -> str:
    opciones = respuestas.get(intencion, respuestas.get("desconocido", ["No te he entendido."]))
    if len(opciones) <= 1:
        return opciones[0]
    ultima = historial[-1]["respuesta"] if historial else None
    candidatos = [respuesta for respuesta in opciones if respuesta != ultima]
    return random.choice(candidatos if candidatos else opciones)


def historial_para_prompt(historial: list) -> str:
    if not historial:
        return "Sin historial previo."

    lineas = []
    for turno in historial[-MAX_HISTORIAL:]:
        lineas.append(f"Usuario: {turno['mensaje']}")
        lineas.append(f"Fallerito: {turno['respuesta']}")
    return "\n".join(lineas)


def construir_prompt_ollama(mensaje: str, intencion: str, confianza: float, respuesta_base: str, historial: list) -> list:
    return [
        {"role": "system", "content": APP_CONTEXT},
        {
            "role": "user",
            "content": (
                "Genera la mejor respuesta final para el usuario.\n"
                f"Intencion detectada: {intencion}\n"
                f"Confianza: {confianza:.2f}\n"
                f"Respuesta base entrenada: {respuesta_base}\n"
                f"Historial reciente:\n{historial_para_prompt(historial)}\n\n"
                f"Mensaje del usuario: {mensaje}\n\n"
                "Devuelve solo la respuesta final, maximo 5 frases. "
                "Debe ser util, concreta y adaptada a Falles360."
            ),
        },
    ]


def generar_con_ollama(mensaje: str, intencion: str, confianza: float, respuesta_base: str, historial: list) -> str | None:
    if not OLLAMA_ENABLED:
        return None

    payload = {
        "model": OLLAMA_MODEL,
        "messages": construir_prompt_ollama(mensaje, intencion, confianza, respuesta_base, historial),
        "stream": False,
        "options": {
            "temperature": 0.45,
            "top_p": 0.9,
            "num_ctx": 4096,
            "num_predict": 180,
        },
    }

    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
        if MODO_DEBUG:
            print(f"{C.GRIS}[DEBUG] Ollama no disponible: {error}{C.RESET}")
        return None

    content = data.get("message", {}).get("content", "")
    content = str(content).strip()
    return content or None


def responder(modelo, respuestas: dict, mensaje: str, historial: list) -> tuple:
    intencion, confianza = detectar_intencion(modelo, mensaje)

    if confianza < UMBRAL_CONFIANZA or intencion not in respuestas:
        intencion = "desconocido"

    respuesta_base = seleccionar_respuesta(respuestas, intencion, historial)
    respuesta_ollama = generar_con_ollama(mensaje, intencion, confianza, respuesta_base, historial)
    texto = respuesta_ollama or respuesta_base

    if MODO_DEBUG:
        origen = "ollama" if respuesta_ollama else "fallback"
        print(f"{C.GRIS}[DEBUG] intencion={intencion} confianza={confianza:.2f} origen={origen}{C.RESET}")

    return texto, intencion, confianza


def actualizar_historial(historial: list, mensaje: str, respuesta: str, intencion: str):
    historial.append({"mensaje": mensaje, "respuesta": respuesta, "intencion": intencion})
    if len(historial) > MAX_HISTORIAL:
        historial.pop(0)


COMANDOS_SALIDA = {"salir", "exit", "cerrar", "adios", "adios", "bye", "chao"}
COMANDOS_AYUDA = {"ayuda", "help", "?", "comandos"}
COMANDOS_LIMPIAR = {"limpiar", "clear", "cls"}


def procesar_comando_especial(msg: str) -> str | None:
    limpio = normalizar(msg)
    if limpio in COMANDOS_SALIDA:
        return "salir"
    if limpio in COMANDOS_AYUDA:
        return "ayuda"
    if limpio == "debug":
        return "debug"
    if limpio in COMANDOS_LIMPIAR:
        return "limpiar"
    if limpio == "ollama":
        return "ollama"
    return None


def comprobar_ollama() -> bool:
    payload = {"model": OLLAMA_MODEL, "messages": [{"role": "user", "content": "Responde OK"}], "stream": False}
    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
        return bool(str(data.get("message", {}).get("content", "")).strip())
    except Exception as error:
        if MODO_DEBUG:
            print(f"{C.GRIS}[DEBUG] Test Ollama fallido: {error}{C.RESET}")
        return False


def imprimir_bienvenida():
    print()
    print(f"{C.AMARILLO}{'=' * 60}{C.RESET}")
    print(f"{C.BOLD}{C.ROJO}  {NOMBRE_BOT} - Guia local de Falles360 con Ollama{C.RESET}")
    print(f"{C.AMARILLO}{'=' * 60}{C.RESET}")
    print(f"{C.CYAN}  Modelo LLM local: {OLLAMA_MODEL}")
    print(f"  Puedo ayudarte con mapa, rutas, agenda, marketplace, pasaporte y avisos.")
    print(f"  Escribe 'ayuda' para ver comandos. Escribe 'ollama' para comprobar el modelo.{C.RESET}")
    print(f"{C.AMARILLO}{'-' * 60}{C.RESET}")
    print()


def imprimir_ayuda():
    print(f"\n{C.CYAN}COMANDOS")
    print("  ayuda          -> Ver esta ayuda")
    print("  debug          -> Activar/desactivar debug")
    print("  ollama         -> Comprobar conexion con Ollama")
    print("  limpiar        -> Limpiar pantalla")
    print("  salir / adios  -> Cerrar el bot")
    print("\nPUEDES PREGUNTARME")
    print("  Que falla veo ahora")
    print("  Hazme una ruta rapida")
    print("  Donde uso cupones del marketplace")
    print("  Como funciona el pasaporte fallero")
    print("  Como aparecen los avisos del panel")
    print(f"{C.RESET}")


def iniciar_chat():
    global MODO_DEBUG

    modelo = cargar_modelo()
    respuestas = cargar_respuestas()
    historial = []

    imprimir_bienvenida()

    while True:
        try:
            mensaje = input(f"{C.BOLD}{C.AZUL}Tu:{C.RESET} ").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{C.AMARILLO}{NOMBRE_BOT}: Hasta pronto. Visca les Falles.{C.RESET}\n")
            break

        if not mensaje:
            print(f"{C.AMARILLO}{NOMBRE_BOT}:{C.RESET} Escribeme algo y te ayudo.\n")
            continue

        accion = procesar_comando_especial(mensaje)

        if accion == "salir":
            texto = seleccionar_respuesta(respuestas, "despedida", historial)
            print(f"{C.AMARILLO}{NOMBRE_BOT}:{C.RESET} {texto}\n")
            break
        if accion == "ayuda":
            imprimir_ayuda()
            continue
        if accion == "debug":
            MODO_DEBUG = not MODO_DEBUG
            estado = f"{C.VERDE}activado{C.RESET}" if MODO_DEBUG else f"{C.ROJO}desactivado{C.RESET}"
            print(f"{C.GRIS}[SISTEMA] Modo debug {estado}{C.RESET}\n")
            continue
        if accion == "ollama":
            ok = comprobar_ollama()
            estado = "conectado" if ok else "no disponible"
            print(f"{C.AMARILLO}{NOMBRE_BOT}:{C.RESET} Ollama {estado} con modelo {OLLAMA_MODEL}.\n")
            continue
        if accion == "limpiar":
            os.system("cls" if os.name == "nt" else "clear")
            imprimir_bienvenida()
            continue

        respuesta, intencion, confianza = responder(modelo, respuestas, mensaje, historial)
        actualizar_historial(historial, mensaje, respuesta, intencion)

        print(f"{C.AMARILLO}{NOMBRE_BOT}:{C.RESET} {respuesta}\n")


if __name__ == "__main__":
    iniciar_chat()
