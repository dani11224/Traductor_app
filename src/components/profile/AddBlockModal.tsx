// app/components/profile/AddBlockModal.tsx
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';
import { AddOption } from '../../../app/types/space';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (opt: AddOption) => void;
  colors: Palette;
};

/** Opciones literarias */
const literatureOptions: AddOption[] = [
  {
    type: 'author',
    title: 'Author',
    description: 'Highlight a favorite writer in your space.',
    icon: 'person-outline',
  },
  {
    type: 'book',
    title: 'Book',
    description: 'Showcase a book you are reading or love.',
    icon: 'book-outline',
  },
  {
    type: 'quote',
    title: 'Quote',
    description: 'Pin an inspiring literary quote.',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    type: 'poem',
    title: 'Poem',
    description: 'Add a short poem or stanza.',
    icon: 'create-outline',
  },
];

/** Otros elementos de layout */
const layoutOptions: AddOption[] = [
  {
    type: 'header',
    title: 'Section header',
    description: 'Organize your space with section titles.',
    icon: 'albums-outline',
  },
  {
    type: 'text',
    title: 'Text',
    description: 'Add a paragraph of notes or ideas.',
    icon: 'document-text-outline',
  },
  {
    type: 'image',
    title: 'Image',
    description: 'Add a cover, illustration or photo.',
    icon: 'image-outline',
  },
  {
    type: 'spacer',
    title: 'Spacer',
    description: 'Insert some breathing room between elements.',
    icon: 'remove-outline',
  },
];

export default function AddBlockModal({
  visible,
  onClose,
  onSelect,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const renderRow = (opt: AddOption) => (
    <TouchableOpacity
      key={opt.type}
      style={s.row}
      activeOpacity={0.9}
      onPress={() => onSelect(opt)}
    >
      <View style={s.rowIconWrap}>
        <Ionicons name={opt.icon as any} size={20} color={colors.onPrimary} />
      </View>
      <View style={s.rowTextWrap}>
        <Text style={s.rowTitle}>{opt.title}</Text>
        <Text style={s.rowSubtitle}>{opt.description}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Add to your Space</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.sheetContent}
          >
            <Text style={s.sectionLabel}>LITERATURE</Text>
            <View style={s.sectionBox}>
              {literatureOptions.map(renderRow)}
            </View>

            <Text style={s.sectionLabel}>OTHER ELEMENTS</Text>
            <View style={s.sectionBox}>
              {layoutOptions.map(renderRow)}
            </View>
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
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingBottom: 20,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    sheetTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    sheetContent: {
      paddingHorizontal: 20,
      paddingBottom: 10,
      gap: 12,
    },
    sectionLabel: {
      color: c.textMuted,
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sectionBox: {
      backgroundColor: c.card,
      borderRadius: 18,
      paddingVertical: 4,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rowIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
    },
    rowSubtitle: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
  });
