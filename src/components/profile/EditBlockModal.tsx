// app/components/profile/EditBlockModal.tsx
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme, Palette } from '../../../app/theme/theme';
import { SpaceBlock } from '../../../app/types/space';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  text: string;
  setText: (v: string) => void;
  block: SpaceBlock | null;
  colors: Palette;
};

export default function EditBlockModal({
  visible,
  onClose,
  onSave,
  text,
  setText,
  block,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  if (!block) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.box}>
          <Text style={s.title}>Edit {block.title}</Text>
          <Text style={s.subtitle}>
            Personalize this element in your Space.
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write something..."
            placeholderTextColor={colors.textMuted}
            style={s.input}
            multiline
          />

          <View style={s.buttonsRow}>
            <TouchableOpacity style={s.btnGhost} onPress={onClose}>
              <Text style={s.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnPrimary} onPress={onSave}>
              <Text style={s.btnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    box: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
      marginBottom: 10,
    },
    input: {
      minHeight: 80,
      maxHeight: 180,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: c.text,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 12,
      gap: 8,
    },
    btnGhost: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    btnGhostText: {
      color: c.text,
      fontSize: 13,
      fontWeight: '600',
    },
    btnPrimary: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.accent,
    },
    btnPrimaryText: {
      color: c.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
