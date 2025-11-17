import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';

type Theme = {
  id: string;
  name: string;
  top: string;
  bottom: string;
};

type Props = {
  visible: boolean;
  themes: Theme[];
  currentId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export default function ProfileThemeModal({
  visible,
  themes,
  currentId,
  onSelect,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>Profile background</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.row}
          >
            {themes.map((t) => {
              const selected = t.id === currentId;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[s.card, selected && s.cardSelected]}
                  activeOpacity={0.9}
                  onPress={() => onSelect(t.id)}
                >
                  <LinearGradient
                    colors={[t.top, t.bottom]}
                    style={s.gradient}
                  />
                  <Text style={s.cardName}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    row: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 12,
    },
    card: {
      width: 140,
      height: 120,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    cardSelected: {
      borderColor: c.accent,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    gradient: {
      width: '100%',
      height: 90,
    },
    cardName: {
      color: c.text,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
    },
  });
