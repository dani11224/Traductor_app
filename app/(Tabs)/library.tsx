// app/main/(Tabs)/library.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

/** 🎨 Paleta (misma del Login/Register) */
type Palette = {
  bg: string; surface: string; card: string;
  primary: string; accent: string; onPrimary: string;
  text: string; textMuted: string; border: string;
  success: string; warning: string; error: string; highlight: string;
};
const colors: Palette = {
  bg:"#0E1218", surface:"#121723", card:"#161B2A",
  primary:"#A5B4FC", accent:"#7ADCC4", onPrimary:"#0B0F14",
  text:"#E6EDF6", textMuted:"#A6B3C2", border:"#263243",
  success:"#79E2B5", warning:"#FFD58A", error:"#FF9CA1",
  highlight:"#FDE68A22",
};

type DocRow = {
  id: string;
  owner_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  pages: number | null;
  language: string | null;
  title: string | null;
  tags: string[] | null;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
};

export default function LibraryScreen() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const s = useMemo(() => styles(colors), []);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setDocs((data ?? []) as DocRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const pickAndUpload = useCallback(async () => {
    try {
      setUploading(true);
      const pick = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (pick.canceled) return;

      const asset = pick.assets[0];
      const filename = asset.name ?? asset.uri.split('/').pop() ?? 'file.bin';
      const mime = asset.mimeType ?? 'application/octet-stream';

      // Usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not authenticated', 'Please sign in to upload files.');
        return;
      }

      // ID de doc y ruta (cumple policy <uid>/...)
      const docId =
        (globalThis.crypto as any)?.randomUUID?.() ||
        Math.random().toString(36).slice(2);
      const objectName = `${user.id}/${docId}-${filename}`;

      // === CARGA DE BYTES DESDE URI (NO tocar: arrayBuffer + 'base64') ===
      let body: ArrayBuffer;
      try {
        const res = await fetch(asset.uri);
        if (typeof (res as any).arrayBuffer === 'function') {
          body = await res.arrayBuffer();
        } else {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64',
          });
          body = base64ToArrayBuffer(base64);
        }
      } catch {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        body = base64ToArrayBuffer(base64);
      }

      // 1) Subir a Storage (dejamos ArrayBuffer tal cual)
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(objectName, body, {
          contentType: mime,
          upsert: false,
        });
      if (upErr) throw upErr;

      // 2) Insertar fila en DB
      const { data, error } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          storage_path: objectName,
          original_filename: filename,
          mime_type: mime,
          status: 'uploaded',
        })
        .select('*')
        .single();

      if (error) throw error;

      setDocs(prev => [data as DocRow, ...prev]);
      Alert.alert('Done', 'File uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Upload error', e?.message ?? 'Unexpected error');
    } finally {
      setUploading(false);
    }
  }, []);

  const openDoc = useCallback(async (doc: DocRow) => {
    router.push({ pathname: '/[id]', params: { id: doc.id } });
  }, []);

  const confirmDelete = useCallback((doc: DocRow) => {
    Alert.alert('Delete', `Remove "${doc.original_filename}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc) },
    ]);
  }, []);

  const deleteDoc = useCallback(async (doc: DocRow) => {
    try {
      const { error: delS } = await supabase.storage.from('documents').remove([doc.storage_path]);
      if (delS) throw delS;
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (e: any) {
      Alert.alert('Delete error', e?.message ?? 'Error');
    }
  }, []);

  const startRename = useCallback((doc: DocRow) => {
    setRenamingId(doc.id);
    setRenameText(doc.title ?? doc.original_filename);
  }, []);

  const saveRename = useCallback(async () => {
    if (!renamingId) return;
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({ title: renameText })
        .eq('id', renamingId)
        .select('*')
        .single();
      if (error) throw error;
      setDocs(prev => prev.map(d => (d.id === renamingId ? (data as DocRow) : d)));
      setRenamingId(null);
      setRenameText('');
    } catch (e: any) {
      Alert.alert('Rename error', e?.message ?? 'Error');
    }
  }, [renamingId, renameText]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameText('');
  }, []);

  const renderItem = ({ item }: { item: DocRow }) => {
    const isRenaming = item.id === renamingId;
    return (
      <View style={s.card}>
        <Text style={s.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>

        {isRenaming ? (
          <View style={{ marginTop: 8 }}>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Title"
              placeholderTextColor={colors.textMuted}
              style={s.input}
            />
            <View style={s.row}>
              <TouchableOpacity onPress={saveRename} style={s.btnPrimary}>
                <Text style={s.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelRename} style={s.btnGhost}>
                <Text style={s.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={s.title} numberOfLines={2}>
              {item.title ?? item.original_filename}
            </Text>
            <Text style={s.subtitle}>
              {item.mime_type ?? '—'} · {item.status.toUpperCase()}
            </Text>

            <View style={[s.row, { flexWrap: 'wrap' }]}>
              <TouchableOpacity onPress={() => openDoc(item)} style={s.btnOutlineAccent}>
                <Text style={s.btnOutlineAccentText}>Open</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => startRename(item)} style={s.btnGhost}>
                <Text style={s.btnGhostText}>Rename</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => confirmDelete(item)} style={s.btnDanger}>
                <Text style={s.btnDangerText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const header = useMemo(
    () => (
      <View style={s.headerWrap}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Library</Text>
          <Text style={s.headerSub}>Upload and manage your documents</Text>

          <View style={s.row}>
            <TouchableOpacity
              onPress={pickAndUpload}
              disabled={uploading}
              style={[s.btnPrimary, uploading && { opacity: 0.7 }]}
            >
              <Text style={s.btnPrimaryText}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={loadDocs} style={s.btnGhost}>
              <Text style={s.btnGhostText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [pickAndUpload, uploading, loadDocs, s]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {header}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" />
            <Text style={s.muted}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadDocs} tintColor={colors.accent} />
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.muted}>
                  No documents yet. Tap “Upload” to add your first file.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/** Helper: Base64 → ArrayBuffer (fallback) */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = base64.length * 0.75;
  if (base64.endsWith('==')) bufferLength -= 2;
  else if (base64.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0, len = base64.length; i < len; i += 4) {
    const enc1 = chars.indexOf(base64[i]);
    const enc2 = chars.indexOf(base64[i + 1]);
    const enc3 = chars.indexOf(base64[i + 2]);
    const enc4 = chars.indexOf(base64[i + 3]);

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes[p++] = chr1;
    if (enc3 !== 64) bytes[p++] = chr2;
    if (enc4 !== 64) bytes[p++] = chr3;
  }
  return bytes.buffer;
}

/** 🎯 Estilos con la paleta + márgenes para no pegar textos a los bordes */
const styles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    screen: { flex: 1, backgroundColor: c.bg },

    // Header envuelto con padding horizontal grande para que no quede al borde
    headerWrap: { paddingHorizontal: 20 },
    header: { paddingTop: 8, paddingBottom: 10, gap: 6 },
    headerTitle: { color: c.text, fontSize: 24, fontWeight: '800' },
    headerSub: { color: c.textMuted },

    listContent: {
      paddingHorizontal: 20,   // ← margen lateral consistente
      paddingTop: 4,
      paddingBottom: 20,
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    muted: { color: c.textMuted, marginTop: 10 },

    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    timestamp: { color: c.textMuted, fontSize: 12 },
    title: { color: c.text, fontSize: 17, fontWeight: '700', marginTop: 6 },
    subtitle: { color: c.textMuted, marginTop: 4 },

    row: { flexDirection: 'row', gap: 10, marginTop: 10 },

    input: {
      color: c.text,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
      backgroundColor: c.surface,
    },

    // Botones (sin “liquid glass”, solo sólidos/contorno con la paleta)
    btnPrimary: {
      backgroundColor: c.accent,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimaryText: { color: c.onPrimary, fontWeight: '800' },

    btnGhost: {
      borderColor: c.border,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    btnGhostText: { color: c.text, fontWeight: '700' },

    btnOutlineAccent: {
      backgroundColor: 'transparent',
      borderColor: c.accent,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnOutlineAccentText: { color: c.accent, fontWeight: '700' },

    btnDanger: {
      backgroundColor: c.error,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnDangerText: { color: '#fff', fontWeight: '800' },

    empty: { paddingVertical: 20 },
  });
