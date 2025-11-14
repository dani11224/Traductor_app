import fitz  # PyMuPDF
import json
from pathlib import Path
from typing import Any, Dict


def load_layout(json_path: str) -> Dict[str, Any]:
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def export_translated_pdf(layout: Dict[str, Any], output_pdf_path: str) -> None:
    """
    Exportador sencillo y robusto:

    - Una página de salida por cada página del layout.
    - Dentro de cada página: imprime todos los bloques en orden,
      línea por línea, usando translatedText si existe (si no, originalText).
    - No usa bbox, así que NO hay solapes; es básicamente un "dump bonito".
    """
    doc = fitz.open()
    base_fontsize = 10
    margin = 40
    line_height = base_fontsize * 1.4  # separación entre líneas

    pages_data = layout.get("pages", [])

    for page_index, page_data in enumerate(pages_data):
        width = page_data.get("width", 595)
        height = page_data.get("height", 842)
        blocks = page_data.get("blocks", [])

        page = doc.new_page(width=width, height=height)
        y = margin

        for block in blocks:
            # 1) Elegir texto traducido u original
            raw_text = block.get("translatedText")
            if raw_text is None or raw_text == "":
                raw_text = block.get("originalText")

            if raw_text is None:
                continue

            text = str(raw_text)
            text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
            if not text:
                continue

            # 2) Escribir línea por línea
            lines = text.split("\n")
            for line in lines:
                line = line.strip()
                if not line:
                    y += line_height  # salto en blanco
                    continue

                # Si no cabe en esta página, crear una nueva y seguir
                if y > height - margin:
                    page = doc.new_page(width=width, height=height)
                    y = margin

                page.insert_text(
                    (margin, y),
                    line,
                    fontsize=base_fontsize,
                    fontname="helv",
                )
                y += line_height

            # espacio extra entre bloques
            y += line_height * 0.5

    output_path = Path(output_pdf_path)
    doc.save(output_path)
    doc.close()
    print(f"✅ PDF traducido (línea por línea) guardado en: {output_path}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Uso: python pdf_translated_exporter.py <layout.json> <output.pdf>")
        raise SystemExit(1)

    layout_json = sys.argv[1]
    output_pdf = sys.argv[2]

    layout = load_layout(layout_json)
    export_translated_pdf(layout, output_pdf)
