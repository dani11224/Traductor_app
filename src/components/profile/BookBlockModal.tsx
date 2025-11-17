import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';
import { SpaceBlock } from '../../../app/types/space';

type BookThemeOption = {
  id: string;
  name: string;
  primary: string;
  text: string;
};

const BOOK_THEMES: BookThemeOption[] = [
  { id: 'red', name: 'Red', primary: '#B91C1C', text: '#FEE2E2' },
  { id: 'rose', name: 'Rose', primary: '#BE123C', text: '#FEF2F2' },
  { id: 'indigo', name: 'Indigo', primary: '#4338CA', text: '#E0E7FF' },
  { id: 'slate', name: 'Slate', primary: '#111827', text: '#E5E7EB' },
];

type Props = {
  visible: boolean;
  block: SpaceBlock | null;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    author: string;
    themeId: string;
    accentColor: string;
    accentTextColor: string;
  }) => void;
};

export default function BookBlockModal({
  visible,
  block,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [themeId, setThemeId] = useState<string>('red');

  useEffect(() => {
    if (!block) return;
    setTitle(block.bookTitle ?? block.value ?? '');
    setAuthor(block.bookAuthor ?? '');
    setThemeId(block.themeId ?? 'red');
  }, [block]);

  if (!block) return null;

  const theme =
    BOOK_THEMES.find((t) => t.id === themeId) ?? BOOK_THEMES[0];

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      author: author.trim(),
      themeId: theme.id,
      accentColor: theme.primary,
      accentTextColor: theme.text,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Book tile</Text>
            <View style={s.iconBtn} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* Preview */}
            <View style={s.previewWrap}>
              <View
                style={[
                  s.previewCard,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Ionicons
                  name="book-outline"
                  size={32}
                  color={theme.text}
                  style={{ position: 'absolute', top: 12, right: 12 }}
                />
                <Text
                  style={[s.previewTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {title || 'Book title'}
                </Text>
                <Text
                  style={[s.previewAuthor, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {author || 'Author'}
                </Text>
              </View>
            </View>

            {/* Campos */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Write a book title…"
                placeholderTextColor={colors.textMuted}
                style={s.input}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Author</Text>
              <TextInput
                value={author}
                onChangeText={setAuthor}
                placeholder="Write the author…"
                placeholderTextColor={colors.textMuted}
                style={s.input}
              />
            </View>

            {/* Tema */}
            <Text style={s.sectionLabel}>Color theme</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.themeRow}
            >
              {BOOK_THEMES.map((t) => {
                const selected = t.id === themeId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      s.themeCard,
                      {
                        backgroundColor: t.primary,
                        borderColor: selected
                          ? colors.accent
                          : 'transparent',
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setThemeId(t.id)}
                  >
                    <View style={s.themeLines}>
                      <View style={s.themeLine} />
                      <View
                        style={[s.themeLine, { opacity: 0.7 }]}
                      />
                      <View
                        style={[s.themeLine, { width: '60%' }]}
                      />
                    </View>
                    <Text style={s.themeName}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>

          {/* Botón */}
          <TouchableOpacity
            style={[
              s.footerBtn,
              !title.trim() && { opacity: 0.5 },
            ]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={s.footerBtnText}>Add to Space</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    container: {
      flex: 1,
      maxHeight: '90%',
      backgroundColor: c.bg,
      borderRadius: 24,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
    },
    iconBtn: { padding: 4 },
    headerTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    previewWrap: {
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 4,
    },
    previewCard: {
      width: 220,
      height: 160,
      borderRadius: 26,
      padding: 16,
      justifyContent: 'flex-end',
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '800',
    },
    previewAuthor: {
      fontSize: 13,
      marginTop: 4,
    },

    fieldGroup: {
      marginBottom: 14,
    },
    fieldLabel: {
      color: c.text,
      fontSize: 13,
      marginBottom: 4,
      fontWeight: '600',
    },
    input: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: c.text,
      fontSize: 14,
    },

    sectionLabel: {
      color: c.textMuted,
      fontSize: 12,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    themeRow: {
      paddingBottom: 8,
    },
    themeCard: {
      width: 120,
      height: 90,
      borderRadius: 18,
      padding: 10,
      marginRight: 10,
      borderWidth: 2,
      justifyContent: 'space-between',
    },
    themeLines: {
      flex: 1,
      justifyContent: 'center',
      gap: 4,
    },
    themeLine: {
      height: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.9)',
      width: '80%',
    },
    themeName: {
      color: '#F9FAFB',
      fontSize: 11,
      fontWeight: '600',
      alignSelf: 'flex-end',
    },

    footerBtn: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderRadius: 999,
      backgroundColor: c.card,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerBtnText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '700',
    },
  });
