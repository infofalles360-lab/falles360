import argparse
import json
import os
import urllib.parse
import urllib.request
from urllib.error import HTTPError
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRATIONS = ROOT / "runtime" / "waitlist_registrations.json"
STATE = ROOT / "runtime" / "waitlist_telegram_notified.json"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def send_message(token: str, chat_id: str, text: str) -> None:
    body = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": "true",
    }).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=body,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = json.loads(error.read().decode("utf-8", errors="replace"))
        raise RuntimeError(details.get("description", f"Telegram devolvio HTTP {error.code}")) from error
    if not payload.get("ok"):
        raise RuntimeError("Telegram no acepto la notificacion.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()

    env = {
        **load_env(ROOT.parent / ".env"),
        **load_env(ROOT.parent / ".env.local"),
        **load_env(ROOT / ".env.local"),
        **os.environ,
    }
    token = env.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = (
        env.get("TELEGRAM_ADMIN_CHAT_ID", "").strip()
        or env.get("TELEGRAM_CHAT_ID", "").strip()
    )
    if not token or not chat_id:
        raise SystemExit("Falta TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID.")

    if args.test:
        send_message(
            token,
            chat_id,
            "Fallerito ya esta conectado con la whitelist.\n\n"
            "Te avisare aqui cuando entre una nueva solicitud.",
        )
        print("Notificacion de prueba enviada.")
        return

    data = json.loads(REGISTRATIONS.read_text(encoding="utf-8"))
    records = data.get("records", [])
    current_emails = {str(record.get("email", "")).lower() for record in records if record.get("email")}

    if not STATE.exists():
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(
            json.dumps({"notified_emails": sorted(current_emails)}, indent=2),
            encoding="utf-8",
        )
        print(f"Estado inicial creado con {len(current_emails)} registros existentes.")
        return

    state = json.loads(STATE.read_text(encoding="utf-8"))
    notified = {str(value).lower() for value in state.get("notified_emails", [])}
    new_records = [
        record for record in records
        if str(record.get("email", "")).lower() not in notified
    ]

    for record in new_records:
        name = str(record.get("nombre", "Sin nombre"))
        address = str(record.get("email", ""))
        date = str(record.get("fecha_correo", ""))
        status = str(record.get("estado", "Valido"))
        send_message(
            token,
            chat_id,
            "Nueva alta en la whitelist de Falles360\n\n"
            f"Nombre: {name}\n"
            f"Email: {address}\n"
            f"Fecha: {date}\n"
            f"Estado: {status}",
        )
        notified.add(address.lower())

    STATE.write_text(
        json.dumps({"notified_emails": sorted(notified)}, indent=2),
        encoding="utf-8",
    )
    print(f"Notificaciones nuevas enviadas: {len(new_records)}")


if __name__ == "__main__":
    main()
