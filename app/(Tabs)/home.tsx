// app/main/(tabs)/home.tsx
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, Palette } from '../theme/theme';
import { supabase } from '../../src/lib/supabase';

type Book = {
  id: string;
  title: string;
  author: string;
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
  synopsis: string | null;
  cover_path: string | null;
  cover_url?: string | null;
};


const BEST_BOOKS: Book[] = [
  { id: '1', title: 'Mi portada de libro', author: 'Bookname' },
  { id: '2', title: 'Pinocho', author: 'Bookname' },
  { id: '3', title: 'Mi portada de libro', author: 'Bookname' },
  { id: '4', title: 'Otro libro', author: 'Bookname' },
];

const DAILY_RECS: Book[] = [
  { id: 'r1', title: 'Sin nombre', author: 'A.S. Veleda' },
  { id: 'r2', title: 'Libro oscuro', author: 'Unknown' },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const router = useRouter();

  const [latestDocs, setLatestDocs] = useState<DocRow[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(true);

  const loadLatest = useCallback(async () => {
    setLoadingLatest(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('Error loading latest releases', error.message);
      setLatestDocs([]);
    } else {
      const rows = (data ?? []) as DocRow[];

      const published = rows.filter(
        (d) => d.tags && d.tags.includes('published'),
      );

      const withCovers = await Promise.all(
        published.map(async (doc) => {
          if (doc.cover_path) {
            const { data: signed, error: signErr } = await supabase.storage
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

      setLatestDocs(withCovers);
    }
    setLoadingLatest(false);
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const openDocDetail = useCallback(
    (doc: DocRow) => {
      router.push({
        pathname: 'screens/book-detail',
        params: {
          origin: 'home', // 👈 también sólo lectura aquí
          id: doc.id,
          title: doc.title ?? doc.original_filename,
          author: doc.language ?? 'Unknown',
          synopsis:
            doc.original_filename ??
            'Here goes the synopsis of the book. You can edit this later.',
        },
      });
    },
    [router],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.menuBtn}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>Home</Text>

            {/* 🔍 Screen de busqueda para home */}
            <View style={s.headerRight}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: 'screens/search',
                    params: { origin: 'home' },
                  })
                }
              >
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CONTENIDO */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        >
          {/* Best Books */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Best Books</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalList}
            >
              {BEST_BOOKS.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={s.bestBookCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: 'screens/book-detail',
                      params: {
                        origin: 'home', // 👈 modo sólo lectura
                        title: book.title,
                        author: book.author,
                        synopsis: 'Texto de sinopsis que quieras pasar',
                      },
                    })
                  }
                >
                  <View style={s.bestBookCover}>
                    <Text style={s.coverText}>Cover</Text>
                  </View>

                  <View style={s.bestBookInfo}>
                    <Text style={s.bookTitle} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={s.bookAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Daily Recommendations */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Daily Recommendations</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalList}
            >
              {DAILY_RECS.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={s.recommendCard}
                  activeOpacity={0.9}
                >
                  <View style={s.recommendCover}>
                    <Text style={s.coverText}>Cover</Text>
                  </View>

                  <View style={s.recommendInfo}>
                    <Text style={s.recTitle} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={s.recAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>

                    <View style={s.starsRow}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Ionicons
                          key={idx}
                          name="star"
                          size={14}
                          color={colors.primary}
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Latest releases (publicados desde tu Library) */}
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Latest Releases</Text>
              <TouchableOpacity onPress={loadLatest}>
                <Ionicons
                  name="refresh"
                  size={18}
                  color={colors.textMuted ?? colors.text}
                />
              </TouchableOpacity>
            </View>

            {loadingLatest ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={s.loadingText}>
                  Loading latest releases…
                </Text>
              </View>
            ) : latestDocs.length === 0 ? (
              <Text style={s.emptyText}>
                No published books yet. Publish one from your Library.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.horizontalList}
              >
                {latestDocs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={s.bestBookCard}
                    activeOpacity={0.85}
                    onPress={() => openDocDetail(doc)}
                  >
                    <View style={s.bestBookCover}>
                      {doc.cover_url ? (
                        <Image
                          source={{ uri: doc.cover_url }}
                          style={{ width: '100%', height: '100%', borderRadius: 14 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={s.coverText}>PDF</Text>
                      )}
                    </View>
                    <View style={s.bestBookInfo}>
                      <Text style={s.bookTitle} numberOfLines={1}>
                        {doc.title ?? doc.original_filename}
                      </Text>
                      <Text style={s.bookAuthor} numberOfLines={1}>
                        {doc.language ?? 'Unknown'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/** 🎯 Estilos */
const styles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    screen: { flex: 1, backgroundColor: c.bg },

    // Header
    headerWrap: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuBtn: {
      padding: 4,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Contenido
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 12,
    },
    horizontalList: {
      paddingRight: 12,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      marginLeft: 8,
      color: c.textMuted,
      fontSize: 12,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: 12,
    },

    // Best Books
    bestBookCard: {
      width: 120,
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 8,
      marginRight: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    bestBookCover: {
      height: 150,
      borderRadius: 14,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    coverText: {
      color: c.textMuted,
      fontSize: 10,
    },
    bestBookInfo: {
      paddingHorizontal: 4,
    },
    bookTitle: {
      color: c.text,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 2,
    },
    bookAuthor: {
      color: c.textMuted,
      fontSize: 11,
    },

    // Daily Recommendations
    recommendCard: {
      flexDirection: 'row',
      width: 280,
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 12,
      marginRight: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    recommendCover: {
      width: 110,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recommendInfo: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    recTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    recAuthor: {
      color: c.textMuted,
      fontSize: 12,
      marginBottom: 8,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
