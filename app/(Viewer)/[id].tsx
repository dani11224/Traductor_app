import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { supabase } from '../../src/lib/supabase'; // ajusta la ruta si tu cliente está en otro sitio

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

export default function DocumentViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<DocRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const s = useMemo(() => styles(colors), []);

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

  const title = doc?.title || doc?.original_filename || 'Document';

  const isPDF = useMemo(() => {
    const m = doc?.mime_type ?? '';
    return m.includes('pdf') || doc?.storage_path?.toLowerCase().endsWith('.pdf');
  }, [doc]);

  const isImage = useMemo(() => {
    const m = doc?.mime_type ?? '';
    return m.startsWith('image/');
  }, [doc]);

  const isText = useMemo(() => {
    const m = doc?.mime_type ?? '';
    return m.startsWith('text/') || m === 'application/json';
  }, [doc]);

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
        {/* Botón placeholder para "Translate" (próximo paso) */}
        <TouchableOpacity style={s.translateBtn} onPress={() => Alert.alert('Coming soon', 'Translate UI goes here')}>
          <Text style={s.translateBtnText}>Translate</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      <View style={s.content}>
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" />
            <Text style={s.muted}>Loading…</Text>
          </View>
        )}

        {!loading && signedUrl && isPDF && (
          // PDF dentro de la app (WebView). Luego podemos integrar PDF.js personalizado.
          <WebView
            source={{ uri: signedUrl }}
            style={{ flex: 1, backgroundColor: colors.bg }}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            originWhitelist={['*']}
          />
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
    </SafeAreaView>
  );
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
});
