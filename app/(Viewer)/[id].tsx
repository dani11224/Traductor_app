import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { supabase } from '../../src/lib/supabase'; 
import { DocAssistantPanel } from '../../src/components/DocAssistantPanel';

// 🎨 Paleta (la misma que Login/Register)
const colors = {
  bg:"#0E1218", surface:"#121723", card:"#161B2A",
  primary:"#A5B4FC", accent:"#7ADCC4", onPrimary:"#0B0F14",
  text:"#E6EDF6", textMuted:"#A6B3C2", border:"#263243",
  success:"#79E2B5", warning:"#FFD58A", error:"#FF9CA1",
  highlight:"#FDE68A22",
};

type DocRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  title: string | null;
  created_at: string;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
};

// 🌍 Idiomas (ajusta a los que uses en LibreTranslate)
const LANGS: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ja', name: '日本語' },
];

export default function DocumentViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<DocRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Traducción
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedForLang, setTranslatedForLang] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Idioma destino + picker
  const [targetLang, setTargetLang] = useState<'en' | string>('en');
  const [showLangPicker, setShowLangPicker] = useState(false);

  // guardar copia traducida
  const [saving, setSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  // 🆕 PDF: estados internos
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [mountPdfWV, setMountPdfWV] = useState(false);
  const [pdfPendingTarget, setPdfPendingTarget] = useState<string | null>(null);
  const [pdfAutoOpenOverlay, setPdfAutoOpenOverlay] = useState<boolean>(true);

  // 🆕 PDF: traducción
  const [pdfTranslating, setPdfTranslating] = useState(false);
  const [translatedPdfUrl, setTranslatedPdfUrl] = useState<string | null>(null);
  const [showTranslatedPdf, setShowTranslatedPdf] = useState(false);

  // 🆕 chatbot
  const [assistantOpen, setAssistantOpen] = useState(false);

  const s = useMemo(() => styles(colors), []);
  const PDF_BACKEND_URL = process.env.EXPO_PUBLIC_PDF_BACKEND_URL || "";
  console.log('PDF_BACKEND_URL', PDF_BACKEND_URL);

  useEffect(() => {
    (async () => {
      try {
        if (!id) throw new Error('Missing document id');
        // 1) Trae la metadata del documento
        const { data, error } = await supabase
          .from('documents')
          .select('id, storage_path, original_filename, mime_type, title, created_at, status')
          .eq('id', id)
          .single();
        if (error) throw error;
        setDoc(data as DocRow);

        // 2) Crea URL firmada
        const { data: urlData, error: urlErr } = await supabase
          .storage
          .from('documents')
          .createSignedUrl((data as DocRow).storage_path, 60 * 60);
        if (urlErr) throw urlErr;
        setSignedUrl(urlData.signedUrl);

        // 3) Si es texto (o JSON), descárgalo para mostrarlo nativo
        const mime = (data as DocRow).mime_type ?? '';
        if (mime.startsWith('text/') || mime === 'application/json') {
          try {
            const res = await fetch(urlData.signedUrl);
            const txt = await res.text();
            setTextContent(txt);
          } catch {}
        }
      } catch (e: any) {
        Alert.alert('Viewer error', e?.message ?? 'Could not open the document');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Si cambias el idioma destino, cierra el overlay y evita confusiones
  useEffect(() => {
    setOverlayOpen(false);
  }, [targetLang]);

  const title = doc?.title || doc?.original_filename || 'Document';

  const isPDF = useMemo(() => {
    const m = doc?.mime_type ?? '';
    return m.includes('pdf') || doc?.storage_path?.toLowerCase().endsWith('.pdf');
  }, [doc]);

  const isImage = useMemo(() => {
    const m = doc?.mime_type ?? '';
    return m.startsWith('image/');
  }, [doc]);

    // 🆕 Texto que verá el asistente (texto extraído o plano del documento)
  const contextForAssistant = textContent ?? '';

  const isText = useMemo(() => {
    const m = doc?.mime_type ?? '';
    return m.startsWith('text/') || m === 'application/json';
  }, [doc]);

  // 🆕 HTML (PDF.js) para extraer texto del PDF vía WebView invisible
const pdfExtractHTML = useMemo(() => {
  if (!signedUrl) return '';
  const url = signedUrl.replace(/"/g, '&quot;');
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
(function(){
  const pdfUrl = "${url}";
  const { pdfjsLib } = window;
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  function itemsToText(content) {
    const lines = [];
    for (const it of content.items) { if (it && typeof it.str === 'string') lines.push(it.str); }
    return lines.join("\\n");
  }

  pdfjsLib.getDocument({ url: pdfUrl }).promise.then(async (doc) => {
    const pages = [];
    for (let i=1; i<=doc.numPages; i++){
      const page = await doc.getPage(i);
      const text = await page.getTextContent();
      pages.push(itemsToText(text));
    }
    const full = pages.join("\\n\\n---- Page Break ----\\n\\n");
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:"pdfText", text: full }));
  }).catch(err => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:"error", message: String(err) }));
  });
})();
</script>
</body>
</html>`;
}, [signedUrl]);

  const openTranslatedPdf = async () => {
    try {
      if (!isPDF || !signedUrl) {
        Alert.alert("PDF", "No PDF available to translate.");
        return;
      }
      if (!PDF_BACKEND_URL) {
        Alert.alert("Config", "Missing EXPO_PUBLIC_PDF_BACKEND_URL");
        return;
      }

      setPdfTranslating(true);

      const url =
        `${PDF_BACKEND_URL}/pdf-translate-direct` +
        `?source_url=${encodeURIComponent(signedUrl)}` +
        `&source_lang=${encodeURIComponent("es")}` +          // ajusta si el original no siempre es español
        `&target_lang=${encodeURIComponent(targetLang)}`;

      console.log('signedUrl', signedUrl);
      console.log('targetLang', targetLang);
      console.log('translatedPdfUrl', url);  

      // No hace falta fetchear nada aquí: el WebView va directo a esa URL.
      setTranslatedPdfUrl(url);
      setShowTranslatedPdf(true);
    } catch (e: any) {
      Alert.alert("PDF translate", e?.message ?? "Failed to open translated PDF");
    } finally {
      setPdfTranslating(false);
    }
  };


  // 👉 handler del botón Translate: traduce si hace falta y abre el overlay
  const onPressTranslate = async () => {
    try {
      if (translating) return;

      if (!isText) {
        if (isPDF) {
          // 👉 ahora sí traducimos PDF
          return translatePdfNow({ to: targetLang, autoOpenOverlay: true });
        } else {
          Alert.alert('Not supported', 'Only plain text / JSON / PDF are supported for now.');
          return;
        }
      }


      // Si ya hay traducción para el idioma seleccionado, solo abre la UI
      if (translatedText && translatedForLang === targetLang) {
        setOverlayOpen(true);
        return;
      }

      const plain = textContent ?? '';
      if (!plain.trim()) {
        Alert.alert('Empty', 'No text content to translate.');
        return;
      }

      setTranslating(true);
      const out = await ltTranslate({ text: plain, to: targetLang });
      setTranslatedText(out);
      setTranslatedForLang(targetLang);
      setOverlayOpen(true);
    } catch (e: any) {
      Alert.alert('Translate error', e?.message ?? 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  // 🆕 Monta el WebView extractor si hace falta
const ensurePdfText = async () => {
  if (!isPDF) return;
  if (textContent && textContent.length > 0) return; // ya hay cache
  if (!signedUrl) throw new Error('Missing signed URL for PDF');
  setPdfExtracting(true);
  setMountPdfWV(true);
};

  // 🆕 Abre el asistente y, si es PDF, se asegura de extraer el texto primero
const openAssistant = async () => {
  try {
    // Si es PDF y aún no tenemos texto extraído, dispara el extractor oculto
    if (isPDF && (!textContent || textContent.length === 0)) {
      await ensurePdfText();
    }
    setAssistantOpen(true);
  } catch (e: any) {
    Alert.alert(
      'Assistant error',
      e?.message ?? 'Could not prepare the text for the assistant'
    );
  }
};

// 🆕 Recibe el texto desde el WebView (PDF.js)
const onPdfWVMessage = async (evt: any) => {
  try {
    const data = JSON.parse(evt?.nativeEvent?.data || '{}');
    if (data.type === 'pdfText') {
      setTextContent(data.text || '');
      setPdfExtracting(false);
      setMountPdfWV(false);

      // ¿quedaba una traducción pendiente?
      if (pdfPendingTarget) {
        try {
          setTranslating(true);
          const out = await ltTranslate({ text: data.text || '', to: pdfPendingTarget });
          setTranslatedText(out);
          setTranslatedForLang(pdfPendingTarget);
          if (pdfAutoOpenOverlay) setOverlayOpen(true);
        } catch (e: any) {
          Alert.alert('Translate error', e?.message ?? 'Failed to translate');
        } finally {
          setTranslating(false);
          setPdfPendingTarget(null);
        }
      }
    } else if (data.type === 'error') {
      setPdfExtracting(false);
      setMountPdfWV(false);
      Alert.alert('PDF extract error', data.message || 'Unknown error');
      setPdfPendingTarget(null);
    }
  } catch {
    setPdfExtracting(false);
    setMountPdfWV(false);
    setPdfPendingTarget(null);
  }
};

// 🆕 API pública: traducir PDF ahora (sin tocar tu onPressTranslate actual)
// Llama: translatePdfNow({ to: targetLang, autoOpenOverlay: true })
const translatePdfNow = async (opts?: { to?: string; autoOpenOverlay?: boolean }) => {
  try {
    if (!isPDF) {
      Alert.alert('Not a PDF', 'This helper only handles PDFs.');
      return;
    }
    const to = opts?.to ?? targetLang;
    setPdfPendingTarget(to);
    setPdfAutoOpenOverlay(opts?.autoOpenOverlay ?? true);

    // Si aún no hay texto, primero extrae; el resto continúa en onPdfWVMessage
    if (!textContent || textContent.length === 0) {
      await ensurePdfText();
      return;
    }

    // Si ya hay texto extraído, traduce directo
    setTranslating(true);
    const out = await ltTranslate({ text: textContent, to });
    setTranslatedText(out);
    setTranslatedForLang(to);
    if (pdfAutoOpenOverlay) setOverlayOpen(true);
  } catch (e: any) {
    Alert.alert('PDF translate', e?.message ?? 'Unexpected error');
  } finally {
    setTranslating(false);
  }
};


  const saveTranslatedCopy = async () => {
    try {
      if ((!translatedText && !(isPDF && translatedPdfUrl)) || !doc) {
        Alert.alert('Nothing to save', 'Generate a translation first.');
        return;
      }
      setSaving(true);

      // 1) Usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2) Nombre y ruta: <uid>/translations/<docId>-<lang>-<slug>.<ext>
      const baseName =
        (doc.title ?? doc.original_filename ?? 'document')
          .replace(/[^\w.-]+/g, '_')
          .slice(0, 80);

      if (isPDF && translatedPdfUrl) {
        const ext = 'pdf';
        const objectName = `${user.id}/translations/${doc.id}-${targetLang}-${baseName}.${ext}`;

        const res = await fetch(translatedPdfUrl);
        if (!res.ok) {
          throw new Error('Could not download translated PDF');
        }
        const arrayBuffer = await res.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const contentType = 'application/pdf';

        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(objectName, bytes, {
            contentType,
            upsert: true, // si prefieres no sobrescribir, pon false
          });
        if (upErr) throw upErr;

        const { data, error } = await supabase
          .from('document_translations')
          .insert({
            doc_id: doc.id,
            owner_id: user.id,
            source_lang: 'auto',   // o guarda el que uses si lo detectas
            target_lang: targetLang,
            storage_path: objectName,
            mime_type: contentType,
            size_bytes: bytes.length,
            status: 'ready',
          })
          .select('storage_path')
          .single();
        if (error) throw error;

        setSavedPath(data.storage_path);
        Alert.alert('Saved', 'Translated copy stored in your Library.');
        return;
      }

      const isJson = (doc.mime_type ?? '').toLowerCase() === 'application/json';
      const ext = isJson ? 'json' : 'txt';
      const objectName = `${user.id}/translations/${doc.id}-${targetLang}-${baseName}.${ext}`;

      // 3) Bytes UTF-8 (sin tocar tu otra lógica de uploads)
      const encoder = new TextEncoder();
      const bytes = encoder.encode(translatedText as string);
      const contentType = isJson
        ? 'application/json; charset=utf-8'
        : 'text/plain; charset=utf-8';

      // 4) Subir a Storage (mismo bucket `documents`)
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(objectName, bytes, {
          contentType,
          upsert: true, // si prefieres no sobrescribir, pon false
        });
      if (upErr) throw upErr;

      // 5) Registrar en DB
      const { data, error } = await supabase
        .from('document_translations')
        .insert({
          doc_id: doc.id,
          owner_id: user.id,
          source_lang: 'auto',   // o guarda el que uses si lo detectas
          target_lang: targetLang,
          storage_path: objectName,
          mime_type: isJson ? 'application/json' : 'text/plain',
          size_bytes: bytes.length,
          status: 'ready',
        })
        .select('storage_path')
        .single();
      if (error) throw error;

      setSavedPath(data.storage_path);
      Alert.alert('Saved', 'Translated copy stored in your Library.');
    } catch (e: any) {
      Alert.alert('Save error', e?.message ?? 'Could not save the translation');
    } finally {
      setSaving(false);
    }
  };


  return (
    <SafeAreaView edges={['top','left','right']} style={s.safe}>
      {/* Header propio */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={s.headerTitle}>{title}</Text>
          <Text numberOfLines={1} style={s.headerSub}>
            {doc?.mime_type ?? 'Unknown'} · {new Date(doc?.created_at ?? Date.now()).toLocaleDateString()}
          </Text>
        </View>

        {/* Selector de idioma (chip) */}
        <TouchableOpacity style={s.langBtn} onPress={() => setShowLangPicker(true)} disabled={translating}>
          <Text style={s.langBtnText}>{(targetLang || 'en').toUpperCase()}</Text>
        </TouchableOpacity>

        {/* Botón Translate / PDF Translate unificado */}
        <TouchableOpacity
          style={s.translateBtn}
          onPress={isPDF ? openTranslatedPdf : onPressTranslate}
          disabled={isPDF ? pdfTranslating : translating}
        >
          <Text style={s.translateBtnText}>
            {isPDF
              ? pdfTranslating
                ? 'PDF…'
                : translatedPdfUrl
                  ? 'Regen PDF'
                  : 'PDF Translate'
              : translating
                ? 'Translating…'
                : translatedText && translatedForLang === targetLang
                  ? 'View'
                  : 'Translate'}
          </Text>
        </TouchableOpacity>

        {/* 🆕 Botón Asistente IA */}
        <TouchableOpacity
          style={[s.translateBtn, { marginLeft: 10, backgroundColor: colors.card }]}
          onPress={openAssistant}
          disabled={loading || (!isText && !isPDF)}
        >
          <Text style={[s.translateBtnText, { color: colors.text }]}>
            AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido original */}
      <View style={s.content}>
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" />
            <Text style={s.muted}>Loading…</Text>
          </View>
        )}

        {!loading && isPDF && signedUrl && (
          <>
            {/* Pequeño toggle Original / Translated cuando haya PDF traducido */}
            {translatedPdfUrl && (
              <View style={{ flexDirection: "row", justifyContent: "center", paddingVertical: 4 }}>
                <TouchableOpacity onPress={() => setShowTranslatedPdf(false)} style={{ marginHorizontal: 8 }}>
                  <Text style={[s.muted, !showTranslatedPdf && { color: colors.accent }]}>
                    Original
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTranslatedPdf(true)} style={{ marginHorizontal: 8 }}>
                  <Text style={[s.muted, showTranslatedPdf && { color: colors.accent }]}>
                    Translated
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <WebView
              source={{
                uri:
                  showTranslatedPdf && translatedPdfUrl
                    ? translatedPdfUrl
                    : signedUrl,
              }}
              style={{ flex: 1, backgroundColor: colors.bg }}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              originWhitelist={["*"]}
            />

            {translatedPdfUrl && (
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[s.translateBtn, { backgroundColor: colors.primary, minWidth: 160 }]}
                  onPress={saveTranslatedCopy}
                  disabled={saving}
                >
                  <Text style={s.translateBtnText}>{saving ? 'Saving…' : 'Save copy'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}


        {!loading && signedUrl && isImage && (
          <ScrollView contentContainerStyle={s.scrollPad} style={{ flex: 1 }}>
            <Image
              source={{ uri: signedUrl }}
              style={{ width: '100%', aspectRatio: 1 }}
              resizeMode="contain"
            />
          </ScrollView>
        )}

        {!loading && isText && (
          <ScrollView contentContainerStyle={s.scrollPad} style={{ flex: 1 }}>
            <Text style={s.code}>{textContent ?? '(empty)'}</Text>
          </ScrollView>
        )}

        {!loading && !isPDF && !isImage && !isText && (
          <View style={s.center}>
            <Text style={s.muted}>
              Preview not supported yet for this file type.
            </Text>
            <Text style={[s.muted, { marginTop: 6 }]}>
              (We’ll add specialized viewers soon.)
            </Text>
          </View>
        )}
      </View>

      {/* Modal selector de idioma */}
      <Modal visible={showLangPicker} transparent animationType="fade" onRequestClose={() => setShowLangPicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowLangPicker(false)} style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Target language</Text>
            {LANGS.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[s.langItem, l.code === targetLang && { borderColor: colors.accent }]}
                onPress={() => { setTargetLang(l.code); setShowLangPicker(false); }}
              >
                <Text style={s.langCode}>{l.code.toUpperCase()}</Text>
                <Text style={s.langName}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔶 Modal overlay de TRADUCCIÓN */}
      <Modal visible={overlayOpen} transparent animationType="fade" onRequestClose={() => setOverlayOpen(false)}>
        <View style={s.overlayBackdrop}>
          <View style={s.overlayCard}>
            <View style={s.overlayHeader}>
              <Text style={s.overlayTitle}>
                Translation — {targetLang.toUpperCase()}
              </Text>
              <TouchableOpacity style={s.overlayClose} onPress={() => setOverlayOpen(false)}>
                <Text style={s.overlayCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.scrollPad} style={{ flex: 1 }}>
              <Text style={s.code}>
                {translatedText ?? '(No translation yet)'}
              </Text>
            </ScrollView>

            {/* Botón Guardar copia (solo cuando haya traducción) */}
            {translatedText && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[s.translateBtn, { backgroundColor: colors.primary, minWidth: 160 }]}
                  onPress={saveTranslatedCopy}
                  disabled={saving}
                >
                  <Text style={s.translateBtnText}>{saving ? 'Saving…' : 'Save copy'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 🆕 Modal Asistente contextual del documento */}
      <Modal
        visible={assistantOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssistantOpen(false)}
      >
        <KeyboardAvoidingView
          style={s.overlayBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[s.overlayCard, { minHeight: '55%' }]}>
            <View style={s.overlayHeader}>
              <Text style={s.overlayTitle}>Document assistant</Text>
              <TouchableOpacity
                style={s.overlayClose}
                onPress={() => setAssistantOpen(false)}
              >
                <Text style={s.overlayCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, padding: 12 }}>
              {/* Aquí usamos el texto del documento como contexto */}
              <DocAssistantPanel contextText={contextForAssistant} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🆕 WebView oculto para extraer PDF (no interfiere con tu UI) */}
      {mountPdfWV && !!pdfExtractHTML && (
        <WebView
          source={{ html: pdfExtractHTML }}
          originWhitelist={['*']}
          onMessage={onPdfWVMessage}
          javaScriptEnabled
          style={{ width: 0, height: 0, opacity: 0 }}
          onError={(e) => console.log('WebView error', e.nativeEvent)}
          onLoadStart={() => console.log('WebView load start', { showTranslatedPdf, translatedPdfUrl, signedUrl })}
          onLoadEnd={() => console.log('WebView load end', { showTranslatedPdf, translatedPdfUrl })}
        />
      )}
    </SafeAreaView>
  );
}

// 🔧 Helper interno para traducir por chunks usando LT_URL y LT_API_KEY del .env
// 🔧 Reemplazo drop-in de ltTranslate con chunking robusto y soporte JSON
async function ltTranslate({
  text, to, from = 'auto',
}: { text: string; to: string; from?: string }) {
  const base = process.env.EXPO_PUBLIC_LT_URL!;
  const apiKey = process.env.EXPO_PUBLIC_LT_API_KEY!;
  if (!base || !apiKey) {
    throw new Error('Missing LT URL or API key. Set EXPO_PUBLIC_LT_URL and EXPO_PUBLIC_LT_API_KEY');
  }

  // 1) Si parece JSON, lo “pretty-print” para introducir saltos de línea y facilitar el chunking
  const normalized = normalizeTextForChunks(text);

  // 2) Troceo robusto (doble \n → \n → cortes duros por longitud)
  const chunks = smartChunks(normalized, 1200);

  const out: string[] = [];
  for (const c of chunks) {
    if (!c.trim()) continue;
    const body = new URLSearchParams();
    body.set('q', c);
    body.set('source', from);
    body.set('target', to);
    body.set('format', 'text'); // para JSON plano también usamos 'text'
    body.set('api_key', apiKey);

    const r = await fetch(`${base}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      throw new Error(`LibreTranslate ${r.status} ${msg}`);
    }
    const data = await r.json();
    out.push(data?.translatedText ?? '');
  }
  return out.join('\n\n');
}

// Detecta JSON y lo formatea con indentación si es posible.
function normalizeTextForChunks(input: string): string {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return '';
  try {
    const looksJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (looksJson) {
      const obj = JSON.parse(trimmed);
      return JSON.stringify(obj, null, 2); // inserta saltos de línea
    }
  } catch {
    // si no parsea, seguimos con el texto tal cual
  }
  return trimmed;
}

// Parte por párrafos dobles, luego por líneas, y si aún excede, corta por longitud fija.
function smartChunks(input: string, max = 1200): string[] {
  const first = input.split(/\n{2,}/g);
  const chunks: string[] = [];
  for (const block of first) {
    if (block.length <= max) { chunks.push(block); continue; }

    // dividir por líneas
    const lines = block.split(/\n/g);
    let box = '';
    for (const ln of lines) {
      const cand = box ? box + '\n' + ln : ln;
      if (cand.length > max) {
        if (box) chunks.push(box);
        if (ln.length > max) {
          // corte duro dentro de la línea
          chunks.push(...chunkByLength(ln, max));
          box = '';
        } else {
          box = ln;
        }
      } else {
        box = cand;
      }
    }
    if (box) chunks.push(box);
  }
  return chunks;
}

function chunkByLength(s: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += max) {
    out.push(s.slice(i, i + max));
  }
  return out;
}

const styles = (c: typeof colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: c.border,
    borderBottomWidth: 1,
    backgroundColor: c.bg,
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, borderWidth: 1, borderColor: c.border,
  },
  backIcon: { color: c.text, fontSize: 28, lineHeight: 28, marginTop: -2 },
  headerTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: c.textMuted, fontSize: 12, marginTop: 2 },

  // chip de idioma
  langBtn: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  langBtnText: { color: c.text, fontWeight: '800', letterSpacing: 0.5 },

  translateBtn: {
    backgroundColor: c.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  translateBtnText: { color: c.onPrimary, fontWeight: '800' },

  content: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: c.textMuted, marginTop: 10 },
  scrollPad: { padding: 16 },

  code: {
    color: c.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    lineHeight: 20,
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },

  // Modal idiomas
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { color: c.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langCode: { color: c.text, fontWeight: '800', width: 48 },
  langName: { color: c.textMuted, flex: 1 },

  // Overlay traducción
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    padding: 16,
  },
  overlayCard: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 18,
    minHeight: '45%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomColor: c.border,
    borderBottomWidth: 1,
    backgroundColor: c.bg,
  },
  overlayTitle: { color: c.text, fontSize: 16, fontWeight: '800', flex: 1 },
  overlayClose: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  overlayCloseText: { color: c.text, fontSize: 16 },
});
