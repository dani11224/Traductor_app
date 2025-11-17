// app/screens/book-edit.tsx
import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, Palette } from '../theme/theme';
import { supabase } from '../../src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function BookEditScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const docId = typeof params.id === 'string' ? params.id : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingCover, setPickingCover] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(''); // usamos language como "autor" visual
  const [synopsis, setSynopsis] = useState('');
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Cargar info del documento
  useEffect(() => {
    if (!docId) {
        setLoading(false);
        return;
    }

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase
        .from('documents')
        .select('title, language, synopsis, cover_path')
        .eq('id', docId)
        .single();

        if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
        }

        setTitle(data?.title ?? '');
        setAuthor(data?.language ?? '');
        setSynopsis(data?.synopsis ?? '');
        setCoverPath(data?.cover_path ?? null);

        if (data?.cover_path) {
        const { data: signed, error: signErr } = await supabase.storage
            .from('documents')
            .createSignedUrl(data.cover_path, 60 * 60); // 1 hora

        if (!signErr) {
            setCoverUrl(signed?.signedUrl ?? null);
        }
        } else {
        setCoverUrl(null);
        }

        setLoading(false);
    };

    load();
    }, [docId]);


  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
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
  };

  // Elegir cover desde galería y subirlo a Supabase
  const pickCover = useCallback(async () => {
    if (!docId) return;

    try {
      setPickingCover(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const mime = asset.mimeType ?? 'image/jpeg';

      // Usuario autenticado para nombrar el objeto y cumplir RLS
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        Alert.alert('Error', 'You must be signed in to change the cover.');
        return;
      }
      const user = userData.user;

      const ext =
        mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
          ? 'webp'
          : 'jpg';
      const objectName = `${user.id}/covers/${docId}-cover.${ext}`;

      // Leer bytes de la imagen
      let body: ArrayBuffer;
      try {
        const res = await fetch(uri);
        body = await res.arrayBuffer();
      } catch {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        body = base64ToArrayBuffer(base64);
      }

      // Subir a storage (usando bucket 'documents')
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(objectName, body, {
          contentType: mime,
          upsert: true, // permitimos reemplazar portada
        });
      if (upErr) {
        Alert.alert('Upload error', upErr.message);
        return;
      }

      // Guardar ruta en la tabla documents
      const { error: updErr } = await supabase
        .from('documents')
        .update({ cover_path: objectName })
        .eq('id', docId);
      if (updErr) {
        Alert.alert('Error', updErr.message);
        return;
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from('documents')
        .createSignedUrl(objectName, 60 * 60);

        setCoverPath(objectName);
        setCoverUrl(!signErr ? signed?.signedUrl ?? null : null);
        Alert.alert('Cover updated', 'The book cover has been changed.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unexpected error picking cover.');
    } finally {
      setPickingCover(false);
    }
  }, [docId]);

  const handleSave = useCallback(async () => {
    if (!docId) {
      Alert.alert('Error', 'This book is not linked to a document.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('documents')
      .update({
        title: title || null,
        language: author || null,
        synopsis: synopsis || null,
      })
      .eq('id', docId);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Saved', 'Book info updated.', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  }, [docId, title, author, synopsis, router]);

  if (!docId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
        <View style={s.screen}>
          <Text style={{ color: colors.text, padding: 20 }}>
            No document id received.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>Edit book</Text>

            <View style={s.headerRight}>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={handleSave}
                disabled={saving}
              >
                <Ionicons
                  name="save-outline"
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {/* CARD PRINCIPAL */}
          <View style={s.card}>
            <View style={s.topRow}>
              {/* Cover + botón para cambiar */}
              <View style={s.coverBig}>
                {coverUrl ? (
                    <Image
                    source={{ uri: coverUrl }}
                    style={s.coverImage}
                    resizeMode="cover"
                    />
                ) : (
                    <Text style={s.coverText}>Cover</Text>
                )}

                <TouchableOpacity
                    style={s.changeCoverBtn}
                    onPress={pickCover}
                    disabled={pickingCover}
                >
                    <Ionicons
                    name="image-outline"
                    size={14}
                    color={colors.text}
                    style={{ marginRight: 4 }}
                    />
                    <Text style={s.changeCoverText}>
                    {pickingCover ? 'Changing…' : 'Change cover'}
                    </Text>
                </TouchableOpacity>
              </View>

              {/* Título y autor */}
              <View style={s.infoRight}>
                <Text style={s.sectionLabel}>Title</Text>
                <TextInput
                  style={s.input}
                  placeholder="Book title"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={[s.sectionLabel, { marginTop: 12 }]}>Author</Text>
                <TextInput
                  style={s.input}
                  placeholder="Author / language"
                  placeholderTextColor={colors.textMuted}
                  value={author}
                  onChangeText={setAuthor}
                />
              </View>
            </View>

            {/* Sinopsis */}
            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionLabel}>Synopsis</Text>
              <TextInput
                style={[s.input, s.multilineInput]}
                placeholder="Short description of the book"
                placeholderTextColor={colors.textMuted}
                value={synopsis}
                onChangeText={setSynopsis}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Botón guardar grande al final como refuerzo */}
          <TouchableOpacity
            style={s.saveButton}
            onPress={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={s.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>

          {loading && (
            <View style={{ marginTop: 12 }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

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
      justifyContent: 'space-between',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBtn: { padding: 4 },
    headerTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 20,
    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    coverBig: {
      width: 140,
      height: 210,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    coverImage: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },
    coverText: {
      color: c.textMuted,
      fontSize: 12,
    },
    changeCoverBtn: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      right: 8,
      borderRadius: 999,
      backgroundColor: c.card,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    changeCoverText: {
      color: c.text,
      fontSize: 10,
      fontWeight: '600',
    },
    infoRight: {
      flex: 1,
      justifyContent: 'flex-start',
    },

    sectionLabel: {
      color: c.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      color: c.text,
      fontSize: 13,
      backgroundColor: c.surface,
    },
    multilineInput: {
      height: 100,
      textAlignVertical: 'top',
    },

    saveButton: {
      backgroundColor: c.primary,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      color: c.onPrimary,
      fontWeight: '800',
      fontSize: 15,
    },
  });
