// app/main/(tabs)/home.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/** 🎨 Paleta (misma del Login/Register & Library) */
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

type Book = {
  id: string;
  title: string;
  author: string;
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
  const s = useMemo(() => styles(colors), []);
  const router = useRouter();

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

            {/* 🔍 Reemplazo de Sign Up / Log In por icono de búsqueda */}
            <View style={s.headerRight}>
              <TouchableOpacity>
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
    sectionTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 12,
    },
    horizontalList: {
      paddingRight: 12,
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
