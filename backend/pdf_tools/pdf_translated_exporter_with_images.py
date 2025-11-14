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

def should_skip_block(page_index: int, block_index: int, block: Dict[str, Any]) -> bool:
    """
    Punto único para decidir si queremos saltarnos un bloque.
    Úsalo para ignorar bloques conflictivos de algún PDF en concreto.
    Por defecto devuelve False (no se salta nada).
    """
    # 🔧 EJEMPLO: si sabes que en la página 2 (índice 1) los bloques 82, 83, 84
    # pisan la imagen de forma rara, puedes hacer:
    #
    # if page_index == 1 and block_index in (82, 83, 84):
    #     return True
    #
    # Ajusta estos números según tu JSON.
    return False

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


def export_translated_pdf_with_images(
    original_pdf_path: str,
    layout: Dict[str, Any],
    output_pdf_path: str,
) -> None:
    """
    Crea un PDF traducido conservando las IMÁGENES del original:

    - Importa cada página del PDF original como fondo.
    - Para cada bloque de texto del layout:
        * pinta un rectángulo blanco sobre esa zona (para ocultar el texto original),
        * hace word-wrap del translatedText dentro de ese bbox,
        * dibuja el texto traducido dentro del rectángulo.
    """
    orig_doc = fitz.open(original_pdf_path)
    out_doc = fitz.open()

    font = fitz.Font("helv")
    base_fontsize = 9.0
    min_fontsize = 5.0
    inner_margin = 1.0  # pequeño margen interno dentro del bbox

    pages = layout.get("pages", [])
    num_pages_layout = len(pages)
    num_pages_orig = orig_doc.page_count
    num_pages = min(num_pages_layout, num_pages_orig)

    for page_index in range(num_pages):
        page_data = pages[page_index]
        width = page_data.get("width", 595.0)
        height = page_data.get("height", 842.0)
        blocks = page_data.get("blocks", [])

        # 1) Crear nueva página y dibujar la página original como fondo
        out_page = out_doc.new_page(width=width, height=height)
        out_page.show_pdf_page(out_page.rect, orig_doc, page_index)

        # 2) Para cada bloque de texto: tapar texto original y escribir texto traducido
        for block in blocks:
            text = get_block_text(block)
            if not text:
                continue

            x0, y0, x1, y1 = block["bbox"]
            # margen interno
            x0i = x0 + inner_margin
            y0i = y0 + inner_margin
            x1i = x1 - inner_margin
            y1i = y1 - inner_margin

            if x1i <= x0i or y1i <= y0i:
                # rectángulo degenerado, lo saltamos
                continue

            max_width = x1i - x0i
            max_height = y1i - y0i

            # 2.1) Pintar un rectángulo blanco para tapar el texto original
            rect = fitz.Rect(x0, y0, x1, y1)
            out_page.draw_rect(rect, fill=(1, 1, 1), color=None, width=0)

            # 2.2) Ajustar tamaño de letra para que el texto traducido quepa
            fontsize = base_fontsize
            chosen_lines: List[str] = []
            chosen_fontsize = fontsize

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

            # 2.3) Dibujar las líneas dentro del bbox
            line_height = chosen_fontsize * 1.2
            y = y0i + line_height
            for line in chosen_lines:
                if y > y1i:
                    break
                if line.strip():
                    out_page.insert_text(
                        (x0i, y),
                        line,
                        fontsize=chosen_fontsize,
                        fontname="helv",
                    )
                y += line_height

    output_path = Path(output_pdf_path)
    out_doc.save(output_path)
    out_doc.close()
    orig_doc.close()
    print(f"✅ PDF traducido (con imágenes) guardado en: {output_path}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print("Uso: python pdf_translated_exporter_with_images.py <original.pdf> <layout_translated.json> <output.pdf>")
        raise SystemExit(1)

    original_pdf = sys.argv[1]
    layout_json = sys.argv[2]
    output_pdf = sys.argv[3]

    layout = load_layout(layout_json)
    export_translated_pdf_with_images(original_pdf, layout, output_pdf)
