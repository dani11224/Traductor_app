import React, { useEffect, useMemo, useState } from 'react';
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

type ColorOption = {
  id: string;
  name: string;
  color: string;
};

const HEADER_BG_OPTIONS: ColorOption[] = [
  { id: 'violet', name: 'Violet', color: '#4C1D95' },
  { id: 'blue',   name: 'Blue',   color: '#1D4ED8' },
  { id: 'slate',  name: 'Slate',  color: '#111827' },
  { id: 'rose',   name: 'Rose',   color: '#BE123C' },
  { id: 'emerald',name: 'Emerald',color: '#047857' },
];

const HEADER_TEXT_OPTIONS: ColorOption[] = [
  { id: 'light',  name: 'Light',  color: '#F9FAFB' },
  { id: 'muted',  name: 'Muted',  color: '#E5E7EB' },
  { id: 'dark',   name: 'Dark',   color: '#020617' },
  { id: 'accent', name: 'Accent', color: '#A5B4FC' },
];

type Props = {
  visible: boolean;
  block: SpaceBlock | null;
  onClose: () => void;
  onSave: (payload: {
    text: string;
    bgColor: string;
    textColor: string;
  }) => void;
};

export default function SectionHeaderModal({
  visible,
  block,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [text, setText] = useState('');
  const [bgId, setBgId] = useState<string>('violet');
  const [textId, setTextId] = useState<string>('light');

  useEffect(() => {
    if (!block) return;
    setText(block.value || block.title || '');
    // si ya tenía colores guardados, los recuperamos
    const bgOpt =
      HEADER_BG_OPTIONS.find((o) => o.color === block.sectionBgColor) ??
      HEADER_BG_OPTIONS[0];
    const txtOpt =
      HEADER_TEXT_OPTIONS.find((o) => o.color === block.sectionTextColor) ??
      HEADER_TEXT_OPTIONS[0];
    setBgId(bgOpt.id);
    setTextId(txtOpt.id);
  }, [block]);

  if (!block) return null;

  const bg = HEADER_BG_OPTIONS.find((o) => o.id === bgId) ?? HEADER_BG_OPTIONS[0];
  const txt =
    HEADER_TEXT_OPTIONS.find((o) => o.id === textId) ??
    HEADER_TEXT_OPTIONS[0];

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      text: text.trim(),
      bgColor: bg.color,
      textColor: txt.color,
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
        <View style={s.sheet}>
          {/* header */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Ionicons
                name="chevron-down"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Section header</Text>
            <View style={s.iconBtn} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
          >
            {/* preview */}
            <View style={s.previewWrap}>
              <View
                style={[
                  s.previewPill,
                  { backgroundColor: bg.color },
                ]}
              >
                <Text
                  style={[
                    s.previewText,
                    { color: txt.color },
                  ]}
                  numberOfLines={1}
                >
                  {text || 'Good tunes'}
                </Text>
              </View>
            </View>

            {/* texto */}
            <Text style={s.label}>Title</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write your section title…"
              placeholderTextColor={colors.textMuted}
              style={s.input}
            />

            {/* background */}
            <Text style={s.label}>Background color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.colorRow}
            >
              {HEADER_BG_OPTIONS.map((opt) => {
                const selected = opt.id === bgId;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      s.colorCircle,
                      { backgroundColor: opt.color },
                      selected && s.colorCircleSelected,
                    ]}
                    onPress={() => setBgId(opt.id)}
                    activeOpacity={0.9}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#F9FAFB"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* text color */}
            <Text style={s.label}>Text color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.colorRow}
            >
              {HEADER_TEXT_OPTIONS.map((opt) => {
                const selected = opt.id === textId;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      s.colorCircle,
                      { backgroundColor: opt.color },
                      selected && s.colorCircleSelected,
                    ]}
                    onPress={() => setTextId(opt.id)}
                    activeOpacity={0.9}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#020617"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>

          {/* botón */}
          <TouchableOpacity
            style={[s.footerBtn, !text.trim() && { opacity: 0.5 }]}
            disabled={!text.trim()}
            onPress={handleSave}
            activeOpacity={0.85}
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: 14,
      maxHeight: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    iconBtn: { padding: 6 },
    headerTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    previewWrap: {
      alignItems: 'center',
      marginBottom: 18,
      marginTop: 4,
    },
    previewPill: {
      borderRadius: 999,
      paddingHorizontal: 24,
      paddingVertical: 10,
      minWidth: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewText: {
      fontSize: 16,
      fontWeight: '700',
    },
    label: {
      color: c.textMuted,
      fontSize: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: c.text,
      fontSize: 14,
      marginBottom: 14,
    },
    colorRow: {
      paddingVertical: 8,
      gap: 10,
      marginBottom: 12,
    },
    colorCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorCircleSelected: {
      borderColor: c.accent,
    },
    footerBtn: {
      marginHorizontal: 20,
      borderRadius: 999,
      backgroundColor: c.card,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerBtnText: {
      color: c.text,
      fontWeight: '700',
      fontSize: 14,
    },
  });
