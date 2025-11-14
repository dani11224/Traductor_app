import json
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF


def load_layout(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_block_text(block: Dict[str, Any]) -> str:
    """
    Usa translatedText si existe, si no originalText.
    Devuelve siempre string limpio.
    """
    raw = block.get("translatedText")
    if raw is None or raw == "":
        raw = block.get("originalText")
    if raw is None:
        return ""

    text = str(raw)
    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    return text


def wrap_text(
    font: fitz.Font,
    text: str,
    max_width: float,
    fontsize: float,
) -> List[str]:
    """
    Envuelve el texto en líneas para que ninguna exceda max_width.
    Respeta saltos de línea (párrafos).
    """
    lines: List[str] = []
    paragraphs = text.split("\n")
    for para in paragraphs:
        para = para.strip()
        if not para:
            lines.append("")  # línea en blanco
            continue

        words = para.split()
        if not words:
            lines.append("")
            continue

        current = words[0]
        for w in words[1:]:
            candidate = current + " " + w
            width = font.text_length(candidate, fontsize=fontsize)
            if width <= max_width:
                current = candidate
            else:
                lines.append(current)
                current = w
        lines.append(current)

    return lines


def export_translated_pdf_positioned(layout: Dict[str, Any], output_pdf_path: str) -> None:
    """
    Exporta un PDF respetando las posiciones de cada bloque (bbox):
    - Para cada bloque: se usa su rectángulo original.
    - Se hace word-wrap dentro de ese rect.
    - Se reduce la fuente si hace falta para que todo quepa.
    - Se dibuja línea por línea con insert_text, sin mover otros bloques.
    """
    doc = fitz.open()
    base_fontsize = 9.0     # tamaño base (puedes probar 9–11)
    min_fontsize = 5.0      # no bajamos de aquí (para que no quede microscópico)
    inner_margin = 1.0      # pequeño margen interior dentro del bbox

    font = fitz.Font("helv")  # fuente base

    pages = layout.get("pages", [])

    for page_data in pages:
        width = page_data.get("width", 595.0)
        height = page_data.get("height", 842.0)
        blocks = page_data.get("blocks", [])

        page = doc.new_page(width=width, height=height)

        for block in blocks:
            text = get_block_text(block)
            if not text:
                continue

            x0, y0, x1, y1 = block["bbox"]
            # un poco de margen interno
            x0i = x0 + inner_margin
            y0i = y0 + inner_margin
            x1i = x1 - inner_margin
            y1i = y1 - inner_margin

            if x1i <= x0i or y1i <= y0i:
                # rectángulo degenerado, lo saltamos
                continue

            max_width = x1i - x0i
            max_height = y1i - y0i

            fontsize = base_fontsize
            chosen_lines: List[str] = []
            chosen_fontsize = fontsize

            # Intentamos encajar el texto bajando la fuente si hace falta
            while fontsize >= min_fontsize:
                lines = wrap_text(font, text, max_width, fontsize)
                line_height = fontsize * 1.2
                needed_height = len(lines) * line_height

                if needed_height <= max_height:
                    chosen_lines = lines
                    chosen_fontsize = fontsize
                    break

                fontsize -= 1.0

            # Si ni con min_fontsize cabe todo, recortamos líneas
            if not chosen_lines:
                fontsize = min_fontsize
                lines = wrap_text(font, text, max_width, fontsize)
                line_height = fontsize * 1.2
                max_lines = int(max_height // line_height)
                if max_lines <= 0:
                    continue
                chosen_lines = lines[:max_lines]
                chosen_fontsize = fontsize

            # Dibuja las líneas dentro del bbox
            line_height = chosen_fontsize * 1.2
            y = y0i + line_height  # primera línea
            for line in chosen_lines:
                if y > y1i:
                    break
                if line.strip():
                    page.insert_text(
                        (x0i, y),
                        line,
                        fontsize=chosen_fontsize,
                        fontname="helv",
                    )
                y += line_height

    output_path = Path(output_pdf_path)
    doc.save(output_path)
    doc.close()
    print(f"✅ PDF traducido (posicionado por bbox) guardado en: {output_path}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Uso: python pdf_translated_exporter_positioned.py <layout_translated.json> <output.pdf>")
        raise SystemExit(1)

    layout_json = sys.argv[1]
    output_pdf = sys.argv[2]

    layout = load_layout(layout_json)
    export_translated_pdf_positioned(layout, output_pdf)
