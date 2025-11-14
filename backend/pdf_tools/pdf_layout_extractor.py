import fitz  # PyMuPDF
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple


def clean_text(text: str) -> str:
    """
    Limpia un poco el texto extraído:
    - une palabras cortadas por guion+salto de línea
    - colapsa espacios múltiples
    (dejamos los saltos de línea tal cual, por ahora)
    """
    if not text:
        return ""

    text = text.replace("-\n", "")
    # no quitamos todos los \n para no perder estructura del párrafo
    text = "\n".join(" ".join(line.split()) for line in text.splitlines())
    return text.strip()


def extract_blocks_from_dict(page: fitz.Page) -> List[Dict[str, Any]]:
    """
    Usa page.get_text('dict') para recorrer bloques / líneas / spans
    y construir bloques de texto más robustos.
    """
    text_dict = page.get_text("dict")
    blocks_out: List[Dict[str, Any]] = []
    block_index = 0

    for b in text_dict.get("blocks", []):
        # algunos bloques son imágenes, otros texto
        if "lines" not in b:
            continue

        lines = b["lines"]
        if not lines:
            continue

        texts: List[str] = []
        # bbox del bloque: unimos el min/max de todos los spans
        x0, y0, x1, y1 = None, None, None, None

        for ln in lines:
            spans = ln.get("spans", [])
            line_str_parts: List[str] = []
            for sp in spans:
                s = sp.get("text", "")
                if not s:
                    continue
                line_str_parts.append(s)

                # bbox del span
                bbox = sp.get("bbox")  # [x0,y0,x1,y1]
                if bbox and len(bbox) == 4:
                    sx0, sy0, sx1, sy1 = bbox
                    if x0 is None or sx0 < x0:
                        x0 = sx0
                    if y0 is None or sy0 < y0:
                        y0 = sy0
                    if x1 is None or sx1 > x1:
                        x1 = sx1
                    if y1 is None or sy1 > y1:
                        y1 = sy1

            if line_str_parts:
                texts.append("".join(line_str_parts))

        if not texts:
            continue

        full_text = "\n".join(texts)
        cleaned = clean_text(full_text)
        if not cleaned:
            continue

        if x0 is None or y0 is None or x1 is None or y1 is None:
            # si por alguna razón no calculamos bbox, saltamos
            continue

        blocks_out.append(
            {
                "blockId": f"blk-{block_index}",
                "bbox": [x0, y0, x1, y1],
                "originalText": cleaned,
                "translatedText": None,
            }
        )
        block_index += 1

    return blocks_out


def extract_layout(pdf_path: str, document_id: str | None = None) -> Dict[str, Any]:
    """
    Devuelve un dict con:
    {
      "documentId": "...",
      "pages": [
        {
          "pageIndex": 0,
          "width": 595.0,
          "height": 842.0,
          "blocks": [...]
        },
        ...
      ]
    }
    """
    pdf_file = Path(pdf_path)

    if document_id is None:
        document_id = pdf_file.stem + "-" + uuid.uuid4().hex[:8]

    doc = fitz.open(pdf_path)
    pages_data: List[Dict[str, Any]] = []
    total_blocks = 0
    total_chars = 0

    for page_index in range(len(doc)):
        page = doc[page_index]
        width, height = page.rect.width, page.rect.height

        blocks = extract_blocks_from_dict(page)

        # stats rápidos para debug
        total_blocks += len(blocks)
        for b in blocks:
            total_chars += len(b["originalText"])

        pages_data.append(
            {
                "pageIndex": page_index,
                "width": width,
                "height": height,
                "blocks": blocks,
            }
        )

    doc.close()

    print(f"✅ Extraídas {len(pages_data)} páginas, {total_blocks} bloques, {total_chars} caracteres.")
    return {
        "documentId": document_id,
        "pages": pages_data,
    }


def save_layout_to_json(layout: Dict[str, Any], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Uso: python pdf_layout_extractor_v2.py <input.pdf> <output.json>")
        raise SystemExit(1)

    input_pdf = sys.argv[1]
    output_json = sys.argv[2]

    layout = extract_layout(input_pdf)
    save_layout_to_json(layout, output_json)
    print(f"✅ Layout v2 guardado en {output_json}")
