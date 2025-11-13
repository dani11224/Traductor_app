// app/main/(Tabs)/library.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/** 🎨 Paleta (misma del Login/Register) */
type Palette = {
  bg: string; surface: string; card: string;
  primary: string; accent: string; onPrimary: string;
  text: string; textMuted: string; border: string;
  success: string; warning: string; error: string; highlight: string;
};
const colors: Palette = {
  bg: '#0E1218',
  surface: '#121723',
  card: '#161B2A',
  primary: '#A5B4FC',
  accent: '#7ADCC4',
  onPrimary: '#0B0F14',
  text: '#E6EDF6',
  textMuted: '#A6B3C2',
  border: '#263243',
  success: '#79E2B5',
  warning: '#FFD58A',
  error: '#FF9CA1',
  highlight: '#FDE68A22',
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not authenticated', 'Please sign in to upload files.');
        return;
      }

      // ID de doc y ruta (cumple policy <uid>/...)
      const docId =
        (globalThis.crypto as any)?.randomUUID?.() ||
        Math.random().toString(36).slice(2);
      const objectName = `${user.id}/${docId}-${filename}`;

      // === CARGA DE BYTES DESDE URI ===
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

      // 1) Subir a Storage
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

      setDocs((prev) => [data as DocRow, ...prev]);
      Alert.alert('Done', 'File uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Upload error', e?.message ?? 'Unexpected error');
    } finally {
      setUploading(false);
    }
  }, []);

  const openDoc = useCallback(
    async (doc: DocRow) => {
      router.push({ pathname: '/[id]', params: { id: doc.id } });
    },
    [router],
  );

  const deleteDoc = useCallback(async (doc: DocRow) => {
    try {
      const { error: delS } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path]);
      if (delS) throw delS;

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;

      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e: any) {
      Alert.alert('Delete error', e?.message ?? 'Error');
    }
  }, []);

  const confirmDelete = useCallback(
    (doc: DocRow) => {
      Alert.alert('Delete', `Remove "${doc.original_filename}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc) },
      ]);
    },
    [deleteDoc],
  );

  const renderBookCard = (doc: DocRow) => (
    <TouchableOpacity
      key={doc.id}
      style={s.bookCard}
      activeOpacity={0.9}
      onPress={() => openDoc(doc)}
      onLongPress={() => confirmDelete(doc)}
    >
      <View style={s.bookCover}>
        {/* Aquí luego puedes poner una Image con la portada real */}
        <Text style={s.coverText}>PDF</Text>
      </View>
      <Text style={s.bookCardTitle} numberOfLines={1}>
        {doc.title ?? doc.original_filename}
      </Text>
      <Text style={s.bookCardAuthor} numberOfLines={1}>
        {doc.language ?? 'Unknown'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER tipo maqueta */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>My Library</Text>

            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="search" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENIDO */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadDocs}
              tintColor={colors.accent}
            />
          }
        >
          {/* My Books */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>My Books</Text>
              <TouchableOpacity
                onPress={pickAndUpload}
                disabled={uploading}
                style={s.sectionIconBtn}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={colors.text}
                  style={{ opacity: uploading ? 0.7 : 1 }}
                />
              </TouchableOpacity>
            </View>

            {loading && docs.length === 0 ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[s.muted, { marginLeft: 8 }]}>Loading…</Text>
              </View>
            ) : docs.length === 0 ? (
              <Text style={s.muted}>
                No books yet. Tap the + button to add one.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.horizontalList}
              >
                {docs.map(renderBookCard)}
              </ScrollView>
            )}
          </View>

          {/* Saved Books (placeholder usando algunos docs) */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Saved Books</Text>
              <Ionicons name="bookmark" size={22} color={colors.text} />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalList}
            >
              {docs.slice(0, 4).map(renderBookCard)}
            </ScrollView>
          </View>

          {/* Shared Books (placeholder) */}
          <View style={[s.section, { marginBottom: 24 }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Shared Books</Text>
              <TouchableOpacity style={s.sectionIconBtn}>
                <Ionicons name="add" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalList}
            >
              {docs.slice(4).map(renderBookCard)}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/** Helper: Base64 → ArrayBuffer (fallback) */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
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

/** 🎯 Estilos con la paleta dark + layout de la maqueta */
const styles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    screen: { flex: 1, backgroundColor: c.bg },

    headerWrap: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBtn: {
      padding: 4,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },

    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
    },
    sectionIconBtn: {
      padding: 6,
      borderRadius: 999,
      backgroundColor: c.card,
    },

    horizontalList: {
      paddingRight: 12,
    },

    bookCard: {
      width: 120,
      marginRight: 12,
    },
    bookCover: {
      height: 150,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    coverText: {
      color: c.textMuted,
      fontSize: 10,
    },
    bookCardTitle: {
      color: c.text,
      fontSize: 12,
      fontWeight: '600',
    },
    bookCardAuthor: {
      color: c.textMuted,
      fontSize: 10,
      marginTop: 2,
    },

    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    muted: {
      color: c.textMuted,
      fontSize: 12,
    },
  });
