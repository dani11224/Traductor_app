import json
import os
from pathlib import Path
from typing import Any, Dict
import requests
import re

def basic_cleanup(text: str) -> str:
    """
    Limpieza MUY suave del texto antes de traducir:
    - Normaliza saltos de línea.
    - Quita comillas simples entre letras: medici'on -> medicion.
    - Colapsa espacios múltiples.
    """
    s = str(text or "")

    # Normalizar saltos de línea
    s = s.replace("\r\n", "\n").replace("\r", "\n")

    # Quitar comillas simples entre letras (típico de PDF raro)
    # Ej: medic'i'on, f'isico, aut'omatico
    s = re.sub(r"([A-Za-zÁÉÍÓÚáéíóúÑñ])'([A-Za-zÁÉÍÓÚáéíóúÑñ])", r"\1\2", s)

    # Colapsar espacios múltiples
    s = re.sub(r"[ ]{2,}", " ", s)

    return s

def load_layout(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_layout(data: Dict[str, Any], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def lt_translate(text: str, source: str, target: str, base_url: str, api_key: str) -> str:
    """
    Traduce un bloque de texto usando una API tipo LibreTranslate.
    Aplica una limpieza suave antes de enviar el texto.
    """
    text = basic_cleanup(text)  # 👈 aquí limpiamos
    if not text.strip():
        return ""

    body = {
        "q": text,
        "source": source,
        "target": target,
        "format": "text",
        "api_key": api_key,
    }

    r = requests.post(f"{base_url.rstrip('/')}/translate", data=body, timeout=60)
    if not r.ok:
        raise RuntimeError(f"LT error {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data.get("translatedText", "")


def translate_layout_with_lt(
    layout: Dict[str, Any],
    source_lang: str,
    target_lang: str,
    base_url: str,
    api_key: str,
) -> Dict[str, Any]:
    """
    Recorre todos los bloques del layout y rellena translatedText
    usando LibreTranslate (o compatible).

    Usa una caché interna para no traducir dos veces el mismo texto.
    """
    cache: Dict[str, str] = {}
    pages = layout.get("pages", [])
    total_blocks = 0

    for page in pages:
        blocks = page.get("blocks", [])
        for b in blocks:
            raw_text = b.get("originalText")
            if raw_text is None:
                continue

            text = str(raw_text).strip()
            if not text:
                continue

            # si ya está traducido, lo dejamos
            existing = b.get("translatedText")
            if isinstance(existing, str) and existing.strip():
                continue

            # caché para texto repetido
            if text in cache:
                translated = cache[text]
            else:
                translated = lt_translate(text, source_lang, target_lang, base_url, api_key)
                cache[text] = translated

            b["translatedText"] = translated
            total_blocks += 1

    print(f"Bloques traducidos: {total_blocks}")
    print(f"Entradas unicas en cache: {len(cache)}")
    return layout


if __name__ == "__main__":
    # Modo prueba: traducir un layout en disco
    import sys

    if len(sys.argv) < 5:
        print("Uso: python layout_translate_lt.py <input_layout.json> <source_lang> <target_lang> <output_layout.json>")
        raise SystemExit(1)

    input_layout = sys.argv[1]
    source_lang = sys.argv[2]
    target_lang = sys.argv[3]
    output_layout = sys.argv[4]

    base_url = os.environ.get("LT_URL")
    api_key = os.environ.get("LT_API_KEY")

    if not base_url or not api_key:
        raise SystemExit("❌ Faltan LT_URL o LT_API_KEY")

    layout = load_layout(input_layout)
    layout_tr = translate_layout_with_lt(layout, source_lang, target_lang, base_url, api_key)
    save_layout(layout_tr, output_layout)
    print(f"✅ Layout traducido guardado en: {Path(output_layout).resolve()}")
