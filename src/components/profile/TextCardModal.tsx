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

type ColorOption = { id: string; color: string };

const BG_OPTIONS: ColorOption[] = [
  { id: 'card',   color: '#161B2A' },
  { id: 'violet', color: '#4C1D95' },
  { id: 'blue',   color: '#1D4ED8' },
  { id: 'rose',   color: '#BE123C' },
  { id: 'emerald',color: '#047857' },
];

const TEXT_OPTIONS: ColorOption[] = [
  { id: 'light',  color: '#F9FAFB' },
  { id: 'muted',  color: '#E5E7EB' },
  { id: 'dark',   color: '#020617' },
  { id: 'accent', color: '#A5B4FC' },
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

export default function TextCardModal({
  visible,
  block,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [text, setText] = useState('');
  const [bgId, setBgId] = useState('card');
  const [txtId, setTxtId] = useState('light');

  useEffect(() => {
    if (!block) return;
    setText(block.value || '');
    const bgOpt =
      BG_OPTIONS.find((o) => o.color === block.accentColor) ??
      BG_OPTIONS[0];
    const txtOpt =
      TEXT_OPTIONS.find((o) => o.color === block.accentTextColor) ??
      TEXT_OPTIONS[0];
    setBgId(bgOpt.id);
    setTxtId(txtOpt.id);
  }, [block]);

  if (!block) return null;

  const bg = BG_OPTIONS.find((o) => o.id === bgId) ?? BG_OPTIONS[0];
  const txt =
    TEXT_OPTIONS.find((o) => o.id === txtId) ??
    TEXT_OPTIONS[0];

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
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Ionicons
                name="chevron-down"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Text block</Text>
            <View style={s.iconBtn} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
          >
            {/* preview cuadrado */}
            <View style={s.previewWrap}>
              <View
                style={[
                  s.previewCard,
                  { backgroundColor: bg.color },
                ]}
              >
                <Text
                  style={[
                    s.previewText,
                    { color: txt.color },
                  ]}
                  numberOfLines={4}
                >
                  {text || 'Write your text here…'}
                </Text>
              </View>
            </View>

            <Text style={s.label}>Text</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write something…"
              placeholderTextColor={colors.textMuted}
              style={s.input}
              multiline
            />

            <Text style={s.label}>Background</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.colorRow}
            >
              {BG_OPTIONS.map((opt) => {
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

            <Text style={s.label}>Text color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.colorRow}
            >
              {TEXT_OPTIONS.map((opt) => {
                const selected = opt.id === txtId;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      s.colorCircle,
                      { backgroundColor: opt.color },
                      selected && s.colorCircleSelected,
                    ]}
                    onPress={() => setTxtId(opt.id)}
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

          <TouchableOpacity
            style={[
              s.footerBtn,
              !text.trim() && { opacity: 0.5 },
            ]}
            disabled={!text.trim()}
            onPress={handleSave}
          >
            <Text style={s.footerBtnText}>Apply</Text>
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
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: 16,
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
    previewCard: {
      width: 170,
      aspectRatio: 1,
      borderRadius: 24,
      padding: 14,
      justifyContent: 'center',
    },
    previewText: {
      fontSize: 14,
      fontWeight: '600',
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
      minHeight: 70,
      textAlignVertical: 'top',
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
