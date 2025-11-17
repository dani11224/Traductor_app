// app/screens/search.tsx
import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, Palette } from '../theme/theme';
import { supabase } from '../../src/lib/supabase';

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
  synopsis: string | null;
  cover_path: string | null;
  cover_url?: string | null; // firmado en cliente
};

export default function SearchScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const origin =
    typeof params.origin === 'string' ? params.origin : 'home';
  const isLibrary = origin === 'library';

  const [query, setQuery] = useState('');
  const [allDocs, setAllDocs] = useState<DocRow[]>([]);
  const [results, setResults] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);

  const hintText = isLibrary
    ? 'Search in your library…'
    : 'Search in latest releases…';

  const subtitleText = isLibrary ? 'My Library' : 'Home (published books)';

  /** 🔄 Carga inicial (y recarga manual si quieres reutilizar loadDocs) */
  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Query base
      let baseQuery = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (isLibrary) {
        // Solo docs del usuario
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          Alert.alert(
            'Not authenticated',
            'You must be signed in to search your library.',
          );
          setAllDocs([]);
          setResults([]);
          setLoading(false);
          return;
        }
        baseQuery = baseQuery.eq('owner_id', userData.user.id);
      }

      const { data, error } = await baseQuery;
      if (error) {
        Alert.alert('Error', error.message);
        setAllDocs([]);
        setResults([]);
        setLoading(false);
        return;
      }

      let docs = (data ?? []) as DocRow[];

      // 2) Filtrado por origen
      if (!isLibrary) {
        // Home → solo publicados
        docs = docs.filter(
          (d) => d.tags && d.tags.includes('published'),
        );
      }

      // 3) Firmar covers una vez
      const withCovers = await Promise.all(
        docs.map(async (doc) => {
          if (doc.cover_path) {
            const { data: signed, error: signErr } =
              await supabase.storage
                .from('documents')
                .createSignedUrl(doc.cover_path, 60 * 60);

            return {
              ...doc,
              cover_url: signErr ? null : signed?.signedUrl ?? null,
            };
          }
          return { ...doc, cover_url: null };
        }),
      );

      setAllDocs(withCovers);
      setResults(withCovers); // 👈 al inicio muestra todo
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unexpected error while loading docs.');
      setAllDocs([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [isLibrary]);

  // Carga inicial al montar
  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  /** 🔍 Filtrado en vivo en cliente */
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults(allDocs); // sin query -> muestra todo
      return;
    }

    const filtered = allDocs.filter((d) => {
      const title = d.title ?? d.original_filename ?? '';
      const lang = d.language ?? '';
      const syn = d.synopsis ?? '';
      return (
        title.toLowerCase().includes(q) ||
        lang.toLowerCase().includes(q) ||
        syn.toLowerCase().includes(q)
      );
    });

    setResults(filtered);
  }, [query, allDocs]);

  const openDetail = useCallback(
    (doc: DocRow) => {
      router.push({
        pathname: 'screens/book-detail',
        params: {
          origin: isLibrary ? 'library' : 'home',
          id: doc.id,
          title: doc.title ?? doc.original_filename,
          author: doc.language ?? 'Unknown',
          synopsis:
            doc.synopsis ??
            doc.original_filename ??
            'No synopsis yet.',
        },
      });
    },
    [router, isLibrary],
  );

  const renderResultCard = (doc: DocRow) => (
    <TouchableOpacity
      key={doc.id}
      style={s.resultCard}
      activeOpacity={0.9}
      onPress={() => openDetail(doc)}
    >
      <View style={s.resultCover}>
        {doc.cover_url ? (
          <Image
            source={{ uri: doc.cover_url }}
            style={s.resultCoverImg}
            resizeMode="cover"
          />
        ) : (
          <Text style={s.coverText}>PDF</Text>
        )}
      </View>

      <View style={s.resultInfo}>
        <Text style={s.resultTitle} numberOfLines={1}>
          {doc.title ?? doc.original_filename}
        </Text>
        <Text style={s.resultAuthor} numberOfLines={1}>
          {doc.language ?? 'Unknown'}
        </Text>

        {doc.synopsis && (
          <Text style={s.resultSynopsis} numberOfLines={2}>
            {doc.synopsis}
          </Text>
        )}

        {/* Chips rápidos según tags */}
        <View style={s.chipsRow}>
          {doc.tags?.includes('saved') && (
            <View style={s.chip}>
              <Ionicons
                name="bookmark"
                size={12}
                color={colors.text}
                style={{ marginRight: 4 }}
              />
              <Text style={s.chipText}>Saved</Text>
            </View>
          )}
          {doc.tags?.includes('published') && (
            <View style={s.chip}>
              <Ionicons
                name="cloud-done-outline"
                size={12}
                color={colors.text}
                style={{ marginRight: 4 }}
              />
              <Text style={s.chipText}>Published</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Search</Text>
              <Text style={s.headerSubtitle}>{subtitleText}</Text>
            </View>

            <TouchableOpacity
              style={s.iconBtn}
              onPress={loadDocs}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={colors.textMuted ?? colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* BARRA DE BÚSQUEDA */}
        <View style={s.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted ?? colors.text}
            style={{ marginRight: 6 }}
          />
          <TextInput
            style={s.searchInput}
            placeholder={hintText}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}  // 👈 filtra en vivo
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted ?? colors.text}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* CONTENIDO (RESULTADOS SIEMPRE) */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {loading && (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={s.loadingText}>Loading books…</Text>
            </View>
          )}

          {!loading && results.length === 0 && (
            <Text style={s.emptyText}>
              No books found.
            </Text>
          )}

          {!loading && results.map(renderResultCard)}
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
    iconBtn: { padding: 4 },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
    },
    headerSubtitle: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 2,
    },

    searchBar: {
      marginHorizontal: 20,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: c.card,
    },
    searchInput: {
      flex: 1,
      color: c.text,
      fontSize: 13,
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },

    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    loadingText: {
      marginLeft: 8,
      color: c.textMuted,
      fontSize: 12,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 12,
    },

    resultCard: {
      flexDirection: 'row',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      padding: 10,
      marginBottom: 10,
    },
    resultCover: {
      width: 70,
      height: 100,
      borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden',
    },
    resultCoverImg: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    coverText: {
      color: c.textMuted,
      fontSize: 10,
    },
    resultInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    resultTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    resultAuthor: {
      color: c.textMuted,
      fontSize: 12,
      marginBottom: 6,
    },
    resultSynopsis: {
      color: c.textMuted,
      fontSize: 11,
      marginBottom: 6,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginRight: 6,
      backgroundColor: c.surface,
    },
    chipText: {
      color: c.text,
      fontSize: 10,
      fontWeight: '600',
    },
  });
