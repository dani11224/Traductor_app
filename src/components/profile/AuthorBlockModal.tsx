import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';
import { SpaceBlock } from '../../../app/types/space';

export type AuthorThemeOption = {
  id: string;
  name: string;
  primary: string;
  text: string;
};

const AUTHOR_THEMES: AuthorThemeOption[] = [
  {
    id: 'violet',
    name: 'Violet',
    primary: '#7C3AED',
    text: '#F9FAFB',
  },
  {
    id: 'blue',
    name: 'Blue',
    primary: '#1D4ED8',
    text: '#F9FAFB',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    primary: '#047857',
    text: '#ECFDF5',
  },
  {
    id: 'amber',
    name: 'Amber',
    primary: '#B45309',
    text: '#FFFBEB',
  },
];

type Props = {
  visible: boolean;
  block: SpaceBlock | null;
  onClose: () => void;
  onSave: (payload: {
    authorName: string;
    themeId: string;
    accentColor: string;
    accentTextColor: string;
  }) => void;
};

export default function AuthorBlockModal({
  visible,
  block,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [authorName, setAuthorName] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('violet');

  // Cargar valores iniciales cuando cambie el bloque
  useEffect(() => {
    if (!block) return;
    setAuthorName(block.authorName ?? block.value ?? '');
    setSelectedThemeId(block.themeId ?? 'violet');
  }, [block]);

  if (!block) return null;

  const theme =
    AUTHOR_THEMES.find((t) => t.id === selectedThemeId) ?? AUTHOR_THEMES[0];

  const handleSave = () => {
    if (!authorName.trim()) {
      // si quieres, aquí podrías mostrar un Alert
      return;
    }
    onSave({
      authorName: authorName.trim(),
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
          {/* Header tipo “tilde Artista” */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Author tile</Text>
            <View style={s.iconBtn} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* Preview grande de la tile */}
            <View style={s.previewWrap}>
              <View
                style={[
                  s.previewCard,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={56}
                  color={theme.text}
                />
                <Text style={[s.previewAuthor, { color: theme.text }]}>
                  {authorName || 'Author'}
                </Text>
              </View>
            </View>

            {/* Campo autor */}
            <View style={s.fieldRow}>
              <View style={s.fieldIcon}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              <View style={s.fieldTextWrap}>
                <Text style={s.fieldLabel}>Author</Text>
                <TextInput
                  value={authorName}
                  onChangeText={setAuthorName}
                  placeholder="Write an author name…"
                  placeholderTextColor={colors.textMuted}
                  style={s.input}
                />
              </View>
            </View>

            {/* Tema / paleta de colores */}
            <Text style={s.sectionLabel}>Color theme</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.themeRow}
            >
              {AUTHOR_THEMES.map((t) => {
                const selected = t.id === selectedThemeId;
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
                    onPress={() => setSelectedThemeId(t.id)}
                  >
                    <View style={s.themeAvatar} />
                    <View style={s.themeLines}>
                      <View style={s.themeLine} />
                      <View style={[s.themeLine, { opacity: 0.7 }]} />
                    </View>
                    <Text style={s.themeName}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>

          {/* Botón inferior */}
          <TouchableOpacity
            style={[
              s.footerBtn,
              !authorName.trim() && { opacity: 0.5 },
            ]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!authorName.trim()}
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
      width: 200,
      height: 200,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 14 },
      elevation: 10,
    },
    previewAuthor: {
      marginTop: 10,
      fontSize: 16,
      fontWeight: '700',
    },

    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    fieldIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    fieldTextWrap: { flex: 1 },
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
      height: 120,
      borderRadius: 18,
      padding: 10,
      marginRight: 10,
      borderWidth: 2,
    },
    themeAvatar: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.9)',
      marginBottom: 6,
    },
    themeLines: {
      flex: 1,
      justifyContent: 'center',
    },
    themeLine: {
      height: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.9)',
      marginBottom: 3,
    },
    themeName: {
      color: '#F9FAFB',
      fontSize: 11,
      marginTop: 4,
      fontWeight: '600',
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
