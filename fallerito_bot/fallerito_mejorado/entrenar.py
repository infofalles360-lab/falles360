import json
import pickle
import re
import unicodedata
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parent
RUTA_DATOS = BASE_DIR / "datos_entrenamiento.json"
RUTA_MODELO = BASE_DIR / "modelo_fallerito.pkl"


class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    VERDE = "\033[92m"
    AMARILLO = "\033[93m"
    CYAN = "\033[96m"
    ROJO = "\033[91m"
    GRIS = "\033[90m"


def normalizar(texto: str) -> str:
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^\w\s]", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def cargar_datos():
    if not RUTA_DATOS.exists():
        raise FileNotFoundError(f"No existe {RUTA_DATOS}")

    with open(RUTA_DATOS, "r", encoding="utf-8") as f:
        datos = json.load(f)

    frases = []
    intenciones = []
    conteo_por_intencion = {}

    for intencion, ejemplos in datos.items():
        conteo_por_intencion[intencion] = len(ejemplos)
        for frase in ejemplos:
            frases.append(normalizar(frase))
            intenciones.append(intencion)

    return frases, intenciones, conteo_por_intencion


def construir_pipeline():
    return Pipeline([
        (
            "vectorizador",
            TfidfVectorizer(
                lowercase=True,
                strip_accents="unicode",
                ngram_range=(1, 3),
                min_df=1,
                sublinear_tf=True,
                analyzer="word",
            ),
        ),
        (
            "clasificador",
            LogisticRegression(
                max_iter=2000,
                C=5.0,
                solver="lbfgs",
                class_weight="balanced",
            ),
        ),
    ])


def entrenar_modelo():
    print()
    print("=" * 55)
    print("Entrenando Fallerito para Falles360")
    print("=" * 55)
    print()

    frases, intenciones, conteo = cargar_datos()
    min_clase = min(conteo.values()) if conteo else 0
    cv_folds = min(5, min_clase)

    print(f"Frases totales cargadas : {len(frases)}")
    print(f"Intenciones distintas   : {len(conteo)}")
    print()
    print("Distribucion por intencion:")
    for intent, n in sorted(conteo.items(), key=lambda x: -x[1]):
        barra = "#" * min(n, 40)
        print(f"  {intent:<24} {barra} ({n})")
    print()

    modelo = construir_pipeline()

    if cv_folds >= 2:
        scores = cross_val_score(modelo, frases, intenciones, cv=cv_folds, scoring="f1_weighted")
        print(f"F1 promedio ({cv_folds}-fold CV): {scores.mean():.3f} (+/- {scores.std():.3f})")
    else:
        print("F1 CV omitido: alguna intencion tiene menos de 2 ejemplos.")

    X_train, X_test, y_train, y_test = train_test_split(
        frases,
        intenciones,
        test_size=0.20,
        random_state=42,
        stratify=intenciones,
    )
    modelo.fit(X_train, y_train)
    y_pred = modelo.predict(X_test)

    print()
    print("Reporte en conjunto de prueba (20%):")
    print(classification_report(y_test, y_pred, zero_division=0))

    modelo.fit(frases, intenciones)

    with open(RUTA_MODELO, "wb") as f:
        pickle.dump(modelo, f)

    print()
    print(f"Modelo guardado en {RUTA_MODELO}")
    print("=" * 55)
    print()


if __name__ == "__main__":
    entrenar_modelo()
