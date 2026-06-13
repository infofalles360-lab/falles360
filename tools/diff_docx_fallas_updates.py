from __future__ import annotations

import csv
import json
from pathlib import Path

RUNTIME = Path("runtime")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def read_tsv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def clean(value: str | None) -> str:
    return " ".join((value or "").replace("\xa0", " ").split()).strip()


main_doc = {int(row["id"]): row for row in read_csv(RUNTIME / "docx_fallas_main_updates.csv")}
inf_doc = {int(row["id"]): row for row in read_csv(RUNTIME / "docx_fallas_infant_updates.csv")}
main_db = {int(row["id"]): row for row in read_tsv(RUNTIME / "db_fallas_current.tsv")}
inf_db = {int(row["id"]): row for row in read_tsv(RUNTIME / "db_fallas_infantiles_current.tsv")}

main_changes = []
for item_id, doc in main_doc.items():
    db = main_db.get(item_id)
    if not db:
        continue
    changes = {}
    for field in ("category", "section_name"):
        new = clean(doc.get(field))
        old = clean(db.get(field))
        if new and new.lower() != "pendiente" and new != old:
            changes[field] = {"old": old, "new": new}
    new_neighborhood = clean(doc.get("neighborhood"))
    old_neighborhood = clean(db.get("neighborhood"))
    if new_neighborhood and new_neighborhood.lower() != "pendiente" and new_neighborhood != old_neighborhood:
        changes["neighborhood"] = {"old": old_neighborhood, "new": new_neighborhood}
    if changes:
        main_changes.append({"id": item_id, "name": clean(db.get("name")), "changes": changes, "cross": clean(doc.get("cross"))})

inf_changes = []
for item_id, doc in inf_doc.items():
    db = inf_db.get(item_id)
    if not db:
        continue
    changes = {}
    for doc_field, db_field in (
        ("seccion_label", "seccion_label"),
        ("artista", "artista"),
        ("presupuesto_formateado", "presupuesto_formateado"),
        ("ciudad", "ciudad"),
    ):
        new = clean(doc.get(doc_field))
        old = clean(db.get(db_field))
        if new and new.lower() != "pendiente" and new != old:
            changes[db_field] = {"old": old, "new": new}
    if changes:
        inf_changes.append({"id": item_id, "nombre": clean(db.get("nombre")), "changes": changes, "cross": clean(doc.get("cross"))})

payload = {
    "main_changes": len(main_changes),
    "infant_changes": len(inf_changes),
    "main": main_changes,
    "infant": inf_changes,
}
(RUNTIME / "docx_fallas_diff.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"main_changes": len(main_changes), "infant_changes": len(inf_changes)}, ensure_ascii=False, indent=2))
