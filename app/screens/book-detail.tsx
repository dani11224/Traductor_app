// app/screens/book-detail.tsx
import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  Image,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, Palette } from '../theme/theme';
import { supabase } from '../../src/lib/supabase'; 

export default function BookDetailScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const origin =
    typeof params.origin === 'string' ? params.origin : 'home';
  const isLibrary = origin === 'library';

  const docId =
    typeof params.id === 'string' ? params.id : null;
  
  const bookTitleParam =
    typeof params.title === 'string' ? params.title : 'bookname';
  const bookAuthorParam =
    typeof params.author === 'string' ? params.author : 'author';
  const synopsisParam =
    typeof params.synopsis === 'string'
      ? params.synopsis
      : 'Here goes the synopsis of the book. You can pass it as a param or replace this text with the real description from your database.';

  const [tags, setTags] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false); // para no spamear botones

  const [dbTitle, setDbTitle] = useState<string | null>(null);
  const [dbAuthor, setDbAuthor] = useState<string | null>(null);
  const [dbSynopsis, setDbSynopsis] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // 🔄 Cargar tags al abrir
  useEffect(() => {
    if (!docId) return;

    const loadDoc = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('title, language, synopsis, cover_path, tags')
        .eq('id', docId)
        .single();

      if (error || !data) return;

      setDbTitle(data.title);
      setDbAuthor(data.language);
      setDbSynopsis(data.synopsis);

      const arr = (data.tags ?? []) as string[];
      setTags(arr);
      setSaved(arr.includes('saved'));
      setPublished(arr.includes('published'));

      if (data.cover_path) {
        const { data: signed, error: signErr } = await supabase.storage
          .from('documents')
          .createSignedUrl(data.cover_path, 60 * 60);
          
        if (!signErr) {
          setCoverUrl(signed?.signedUrl ?? null);
        }
      } else {
        setCoverUrl(null);
      }
    };

    loadDoc();
  }, [docId]);

  const displayTitle = dbTitle ?? bookTitleParam;
  const displayAuthor = dbAuthor ?? bookAuthorParam;
  const displaySynopsis = dbSynopsis ?? synopsisParam;



  const updateTags = useCallback(
    async (next: string[]) => {
      if (!docId) return false;

      const { error } = await supabase
        .from('documents')
        .update({ tags: next.length ? next : null })
        .eq('id', docId);

      if (error) {
        console.log('❌ Error updating tags', error.message);
        Alert.alert('Error', 'Could not update book flags.');
        return false;
      }

      setTags(next);
      setSaved(next.includes('saved'));
      setPublished(next.includes('published'));
      return true;
    },
    [docId],
  );

  // 🔖 Guardar / desguardar
  const toggleSaved = useCallback(async () => {
    if (!docId || busy) return;
    setBusy(true);
    try {
      const base = tags ?? [];
      const next = saved
        ? base.filter((t) => t !== 'saved')
        : base.includes('saved')
        ? base
        : [...base, 'saved'];

      await updateTags(next);
    } finally {
      setBusy(false);
    }
  }, [docId, busy, isLibrary, tags, saved, updateTags]);

  // ☁️ Publicar / despublicar
  const togglePublished = useCallback(async () => {
    if (!docId || busy || !isLibrary) return;
    setBusy(true);
    try {
      const base = tags ?? [];
      const next = published
        ? base.filter((t) => t !== 'published')
        : base.includes('published')
        ? base
        : [...base, 'published'];

      await updateTags(next);
    } finally {
      setBusy(false);
    }
  }, [docId, busy, isLibrary, tags, published, updateTags]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>Home</Text>

            <View style={s.headerRight}>
              <TouchableOpacity style={s.iconBtn}>
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => router.back()}
              >
                <Ionicons
                  name="close-outline"
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
            {/* contenido */}
            <View style={s.topRow}>
              <View style={s.coverBig}>
                {coverUrl ? (
                  <Image
                    source={{ uri: coverUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 20 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={s.coverText}>Cover</Text>
                )}
              </View>
              <View style={s.infoRight}>
                <Text style={s.bookTitle}>{displayTitle}</Text>
                <Text style={s.bookAuthor}>{displayAuthor}</Text>
                {/* estrellas */}
              </View>
            </View>

            <View style={s.synopsisBlock}>
              <Text style={s.synopsisLabel}>Synopsis</Text>
              <Text style={s.synopsisText}>{displaySynopsis}</Text>
            </View>

            {/* 🔖 Botón de guardar dentro del recuadro (solo Library) */}
            {docId && (
              <TouchableOpacity
                style={s.bookmarkBtn}
                onPress={toggleSaved}
                disabled={busy}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Botones extra: Edit + Publish */}
          {isLibrary && (
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.secondaryBtn, { marginRight: 8 }]}
                onPress={() => {
                  if (!docId) {
                    Alert.alert(
                      'No document',
                      'This book is not linked to a document yet.',
                    );
                    return;
                  }
                  router.push({
                    pathname: 'screens/book-edit',
                    params: { id: docId },
                  });
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={s.secondaryBtnText}>Edit info</Text>
              </TouchableOpacity>

              {docId && (
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={togglePublished}
                  disabled={busy}
                >
                  <Ionicons
                    name={
                      published
                        ? 'cloud-done-outline'
                        : 'cloud-upload-outline'
                    }
                    size={16}
                    color={colors.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={s.secondaryBtnText}>
                    {published ? 'Unpublish' : 'Publish'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Botón Read it! -> abre el lector /[id] */}
          <TouchableOpacity
            style={s.readButton}
            onPress={() => {
              if (!docId) return;
              router.push({ pathname: '/[id]', params: { id: docId } });
            }}
          >
            <Text style={s.readButtonText}>Read it!</Text>
          </TouchableOpacity>
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
      position: 'relative',
    },

    bookmarkBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      zIndex: 2,
      elevation: 2,
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
    },
    coverText: {
      color: c.textMuted,
      fontSize: 12,
    },
    infoRight: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    bookTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    bookAuthor: {
      color: c.textMuted,
      fontSize: 14,
      marginBottom: 10,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    synopsisBlock: {
      marginTop: 20,
    },
    synopsisLabel: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    synopsisText: {
      color: c.textMuted,
      lineHeight: 20,
      fontSize: 13,
    },

    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      flex: 1,
    },
    secondaryBtnText: {
      color: c.text,
      fontSize: 12,
      fontWeight: '600',
    },

    readButton: {
      backgroundColor: c.primary,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readButtonText: {
      color: c.onPrimary,
      fontWeight: '800',
      fontSize: 15,
    },
  });
