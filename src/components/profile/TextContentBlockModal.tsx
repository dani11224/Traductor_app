import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';
import { SpaceBlock } from '../../../app/types/space';

type Mode = 'quote' | 'poem';

type ThemeOption = {
  id: string;
  name: string;
  primary: string;
  text: string;
};

type TextStyleOption = {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
};

const TEXT_THEMES: ThemeOption[] = [
  { id: 'violet', name: 'Violet', primary: '#6D28D9', text: '#F5F3FF' },
  { id: 'cyan', name: 'Cyan', primary: '#0891B2', text: '#ECFEFF' },
  { id: 'slate', name: 'Slate', primary: '#020617', text: '#E5E7EB' },
  { id: 'rose', name: 'Rose', primary: '#9F1239', text: '#FEF2F2' },
];

const TEXT_STYLES: TextStyleOption[] = [
  {
    id: 'sans',
    name: 'Sans',
    description: 'Clean & modern',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'System',
    })!,
  },
  {
    id: 'serif',
    name: 'Serif',
    description: 'Classic & literary',
    fontFamily: 'serif',
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Typewriter feel',
    fontFamily: 'monospace',
  },
];

type Props = {
  visible: boolean;
  mode: Mode;
  block: SpaceBlock | null;
  onClose: () => void;
  onSave: (payload: {
    text: string;
    themeId: string;
    accentColor: string;
    accentTextColor: string;
    textStyleId: string;
  }) => void;
};

export default function TextContentBlockModal({
  visible,
  mode,
  block,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [text, setText] = useState('');
  const [themeId, setThemeId] = useState<string>('violet');
  const [textStyleId, setTextStyleId] = useState<string>('serif');

  useEffect(() => {
    if (!block) return;
    setText(block.value ?? '');
    setThemeId(block.themeId ?? 'violet');
    setTextStyleId(block.textStyleId ?? 'serif');
  }, [block]);

  if (!block) return null;

  const theme =
    TEXT_THEMES.find((t) => t.id === themeId) ?? TEXT_THEMES[0];
  const textStyle =
    TEXT_STYLES.find((t) => t.id === textStyleId) ?? TEXT_STYLES[0];

  const title = mode === 'quote' ? 'Quote' : 'Poem';
  const placeholder =
    mode === 'quote'
      ? 'Write your quote here…'
      : 'Write your poem or stanza here…';

  const handleSave = () => {
    if (!text.trim()) return;

    onSave({
      text: text.trim(),
      themeId: theme.id,
      accentColor: theme.primary,
      accentTextColor: theme.text,
      textStyleId: textStyle.id,
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
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{title}</Text>
            <View style={s.iconBtn} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* Preview full-text card */}
            <View style={s.previewWrap}>
              <View
                style={[
                  s.previewCard,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    s.previewText,
                    { color: theme.text, fontFamily: textStyle.fontFamily },
                  ]}
                >
                  {text || (mode === 'quote' ? '“A quote example…”' : 'Your poem...\nLine 2...\nLine 3...')}
                </Text>
              </View>
            </View>

            {/* Text input */}
            <Text style={s.sectionLabel}>Text</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              style={[
                s.input,
                { fontFamily: textStyle.fontFamily },
              ]}
              multiline
            />

            {/* Typography options */}
            <Text style={s.sectionLabel}>Typography</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.typographyRow}
            >
              {TEXT_STYLES.map((styleOpt) => {
                const selected = styleOpt.id === textStyleId;
                return (
                  <TouchableOpacity
                    key={styleOpt.id}
                    style={[
                      s.typographyCard,
                      selected && {
                        borderColor: colors.accent,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={() => setTextStyleId(styleOpt.id)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        s.typographyPreview,
                        { fontFamily: styleOpt.fontFamily },
                      ]}
                    >
                      Ag
                    </Text>
                    <Text style={s.typographyName}>{styleOpt.name}</Text>
                    <Text style={s.typographyDesc}>
                      {styleOpt.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Theme options */}
            <Text style={s.sectionLabel}>Color theme</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.themeRow}
            >
              {TEXT_THEMES.map((t) => {
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
                    <View style={s.themePreviewBlock} />
                    <Text style={s.themeName}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>

          <TouchableOpacity
            style={[
              s.footerBtn,
              !text.trim() && { opacity: 0.5 },
            ]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!text.trim()}
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
      marginBottom: 18,
    },
    previewCard: {
      width: '100%',
      minHeight: 140,
      borderRadius: 20,
      padding: 14,
    },
    previewText: {
      fontSize: 16,
    },

    input: {
      minHeight: 100,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: c.text,
      fontSize: 15,
      marginBottom: 16,
      textAlignVertical: 'top',
    },

    sectionLabel: {
      color: c.textMuted,
      fontSize: 12,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },

    typographyRow: {
      paddingBottom: 10,
    },
    typographyCard: {
      width: 120,
      borderRadius: 14,
      padding: 10,
      marginRight: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    typographyPreview: {
      fontSize: 24,
      marginBottom: 4,
      color: c.text,
    },
    typographyName: {
      color: c.text,
      fontWeight: '600',
      fontSize: 13,
    },
    typographyDesc: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 2,
    },

    themeRow: {
      paddingBottom: 10,
      marginTop: 6,
    },
    themeCard: {
      width: 90,
      height: 90,
      borderRadius: 18,
      padding: 10,
      marginRight: 10,
      borderWidth: 2,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themePreviewBlock: {
      width: '100%',
      flex: 1,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
    themeName: {
      color: '#F9FAFB',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 6,
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
