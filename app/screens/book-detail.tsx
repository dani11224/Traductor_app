// app/screens/book-detail.tsx
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, Palette } from '../theme/theme';


export default function BookDetailScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const bookTitle =
    typeof params.title === 'string' ? params.title : 'bookname';
  const bookAuthor =
    typeof params.author === 'string' ? params.author : 'author';
  const synopsis =
    typeof params.synopsis === 'string'
      ? params.synopsis
      : 'Here goes the synopsis of the book. You can pass it as a param or replace this text with the real description from your database.';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER igual al de Home */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity
              style={s.iconBtn}
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>Home</Text>

            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="search" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={s.iconBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="close-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {/* CARD PRINCIPAL */}
          <View style={s.card}>
            <View style={s.topRow}>
              {/* Portada */}
              <View style={s.coverBig}>
                {/* Si luego tienes imagen real, reemplaza por <Image /> */}
                <Text style={s.coverText}>Cover</Text>
              </View>

              {/* Info derecha */}
              <View style={s.infoRight}>
                <Text style={s.bookTitle}>{bookTitle}</Text>
                <Text style={s.bookAuthor}>{bookAuthor}</Text>

                <View style={s.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name="star"
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 2 }}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Sinopsis */}
            <View style={s.synopsisBlock}>
              <Text style={s.synopsisLabel}>Synopsis</Text>
              <Text style={s.synopsisText}>{synopsis}</Text>
            </View>
          </View>

          {/* Botón Read it! */}
          <TouchableOpacity
            style={s.readButton}
            onPress={() => {
              // Aquí luego conectas con tu lector / PDF
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
