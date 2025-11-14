# backend/pdf_tools/server.py

import os
import tempfile
import requests
import uuid
import shutil
from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import FileResponse

from pdf_layout_extractor import extract_layout
from layout_translate_lt import translate_layout_with_lt
from pdf_translated_exporter_with_images import export_translated_pdf_with_images

app = FastAPI()

def _env_from_file() -> dict:
    try:
        root = Path(__file__).resolve().parents[2]
        env_path = root / ".env"
        if not env_path.exists():
            return {}
        data = {}
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if not line or line.strip().startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                data[k.strip()] = v.strip()
        return data
    except Exception:
        return {}

def _get_any(keys):
    for k in keys:
        val = os.environ.get(k)
        if val:
            return val
    file_env = _env_from_file()
    for k in keys:
        val = file_env.get(k)
        if val:
            return val
    return None

class PdfTranslateRequest(BaseModel):
    source_url: str      # signedUrl que ya tienes en el Viewer
    source_lang: str     # ej: "es"
    target_lang: str     # ej: "en"


def generate_translated_pdf(source_url: str, source_lang: str, target_lang: str, max_pages: int | None = None) -> str:
    """Lógica común para POST y GET: devuelve la ruta del PDF generado."""
    base_url = _get_any(["LT_URL", "EXPO_PUBLIC_LT_URL"])  # lee de env o .env
    api_key = _get_any(["LT_API_KEY", "EXPO_PUBLIC_LT_API_KEY"])  # idem
    if not base_url or not api_key:
        raise RuntimeError("Faltan LT_URL o LT_API_KEY")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        input_path = tmpdir / "input.pdf"
        output_path = tmpdir / "output.pdf"

        # 1) Descargar el PDF original desde el signedUrl
        r = requests.get(source_url, timeout=180)
        r.raise_for_status()
        input_path.write_bytes(r.content)

        # 2) Extraer layout
        layout = extract_layout(str(input_path))

        # 2b) Limitar páginas si se solicita (para pruebas o PDFs grandes)
        if isinstance(max_pages, int) and max_pages > 0:
            pages = layout.get("pages", [])
            layout["pages"] = pages[:max_pages]

        # 3) Traducir layout bloque a bloque
        layout_tr = translate_layout_with_lt(
            layout,
            source_lang=source_lang,
            target_lang=target_lang,
            base_url=base_url,
            api_key=api_key,
        )

        # 4) Exportar PDF traducido conservando imágenes (o positioned si prefieres)
        export_translated_pdf_with_images(
            str(input_path),
            layout_tr,
            str(output_path),
        )

        # Copiar a una ruta persistente fuera del tmpdir para servirlo con seguridad
        persist_dir = Path(__file__).parent / "outputs"
        persist_dir.mkdir(parents=True, exist_ok=True)
        persist_path = persist_dir / f"translated_{target_lang}_{uuid.uuid4().hex}.pdf"
        shutil.copyfile(str(output_path), str(persist_path))
        return str(persist_path)


@app.post("/pdf-translate")
def pdf_translate(req: PdfTranslateRequest, max_pages: int | None = None):
    pdf_path = generate_translated_pdf(
        req.source_url,
        req.source_lang,
        req.target_lang,
        max_pages=max_pages,
    )
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"translated_{req.target_lang}.pdf",
    )


@app.get("/pdf-translate-direct")
def pdf_translate_direct(source_url: str, source_lang: str, target_lang: str, max_pages: int | None = None):
    """
    Endpoint directo para usarlo desde WebView:
    /pdf-translate-direct?source_url=...&source_lang=es&target_lang=en
    """
    pdf_path = generate_translated_pdf(source_url, source_lang, target_lang, max_pages=max_pages)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"translated_{target_lang}.pdf",
    )

@app.get("/health")
def health():
    url = _get_any(["LT_URL", "EXPO_PUBLIC_LT_URL"]) or ""
    key = _get_any(["LT_API_KEY", "EXPO_PUBLIC_LT_API_KEY"]) or ""
    return {
        "ok": True,
        "lt_url_present": bool(url),
        "lt_api_key_present": bool(key),
    }
