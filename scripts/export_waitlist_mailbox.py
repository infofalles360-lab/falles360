import email
import imaplib
import json
import os
import re
from datetime import datetime, timezone
from email.header import decode_header
from email.message import Message
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "runtime" / "waitlist_registrations.json"


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


def decode_text(value: str | None) -> str:
    if not value:
        return ""
    parts = []
    for chunk, charset in decode_header(value):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(chunk)
    return "".join(parts)


def message_text(message: Message) -> str:
    plain_bodies: list[str] = []
    html_bodies: list[str] = []
    if message.is_multipart():
        for part in message.walk():
            if part.get_content_maintype() == "multipart":
                continue
            if part.get_content_disposition() == "attachment":
                continue
            content_type = part.get_content_type()
            if content_type not in {"text/plain", "text/html"}:
                continue
            payload = part.get_payload(decode=True)
            if payload:
                decoded = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                (plain_bodies if content_type == "text/plain" else html_bodies).append(decoded)
    else:
        payload = message.get_payload(decode=True)
        if payload:
            plain_bodies.append(payload.decode(message.get_content_charset() or "utf-8", errors="replace"))

    text = "\n".join(plain_bodies or html_bodies)
    text = re.sub(r"<[^>]+>", "\n", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"[ \t]+", " ", text)


def extract_field(text: str, labels: list[str]) -> str:
    lines = [re.sub(r"\s+", " ", line).strip(" |:") for line in text.splitlines()]
    normalized_labels = {label.lower() for label in labels}
    for index, line in enumerate(lines):
        for label in normalized_labels:
            prefix = label + ":"
            if line.lower().startswith(prefix):
                value = line[len(prefix):].strip()
                if value:
                    return value
        if line.lower() not in normalized_labels:
            continue
        for candidate in lines[index + 1:index + 6]:
            if candidate and candidate.lower() not in {"value", "valor"}:
                return candidate
    return ""


def main() -> None:
    env = {**load_env(ROOT / ".env.local"), **os.environ}
    username = env.get("FALLES_SMTP_USERNAME", "").strip()
    password = re.sub(r"\s+", "", env.get("FALLES_SMTP_PASSWORD", ""))
    if not username or not password:
        raise SystemExit("Falta la configuracion privada de Gmail.")

    mailbox = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    mailbox.login(username, password)
    mailbox.select('"[Gmail]/All Mail"', readonly=True)

    status, data = mailbox.search(
        None,
        'OR OR SUBJECT "Nueva solicitud" SUBJECT "submission" FROM "formsubmit.co"',
    )
    if status != "OK":
        raise SystemExit("No se pudieron buscar los correos.")

    records: dict[str, dict[str, str]] = {}
    for message_id in data[0].split():
        status, message_data = mailbox.fetch(message_id, "(RFC822)")
        if status != "OK" or not message_data or not isinstance(message_data[0], tuple):
            continue

        message = email.message_from_bytes(message_data[0][1])
        subject = decode_text(message.get("Subject"))
        text = message_text(message)
        candidate_email = extract_field(text, ["Email", "email"])
        email_match = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", candidate_email or text)
        if not email_match:
            continue

        address = email_match.group(0).lower()
        if address in {"info.falles360@gmail.com", username.lower()}:
            continue

        name = extract_field(text, ["Nombre", "Name", "name"]) or "Sin nombre"
        date_value = message.get("Date", "")
        previous = records.get(address, {})
        if name == "Sin nombre" and previous.get("nombre"):
            name = previous["nombre"]

        records[address] = {
            "nombre": name,
            "email": address,
            "fecha_correo": date_value,
            "asunto": subject,
            "origen": "FormSubmit",
            "estado": "Revisar posible errata" if address.endswith(".con") else "Valido",
        }

    mailbox.logout()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            {
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "records": sorted(records.values(), key=lambda item: item["email"]),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Registros encontrados: {len(records)}")
    print(str(OUTPUT))


if __name__ == "__main__":
    main()
