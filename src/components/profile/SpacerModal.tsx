import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';
import { SpaceBlock } from '../../../app/types/space';

const MIN_HEIGHT = 16;
const MAX_HEIGHT = 260;
const DEFAULT_HEIGHT = 40;

type Props = {
  visible: boolean;
  block: SpaceBlock | null;
  onClose: () => void;
  onSave: (payload: { height: number }) => void;
  // para ir actualizando el Space detrás del modal
  onLiveHeightChange?: (height: number) => void;
};

export default function SpacerModal({
  visible,
  block,
  onClose,
  onSave,
  onLiveHeightChange,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const baseHeightRef = useRef(DEFAULT_HEIGHT);

  useEffect(() => {
    if (!block) return;
    const h = block.spacerHeight ?? DEFAULT_HEIGHT;
    setHeight(h);
    baseHeightRef.current = h;
  }, [block]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, baseHeightRef.current + gesture.dy),
        );
        setHeight(next);
        onLiveHeightChange?.(next); // Space se reacomoda en tiempo real
      },
      onPanResponderRelease: () => {
        baseHeightRef.current = height;
      },
    }),
  ).current;

  if (!block) return null;

  const handleSave = () => {
    onSave({ height });
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
            <Text style={s.headerTitle}>Spacer</Text>
            <View style={s.iconBtn} />
          </View>

          {/* Preview del spacer */}
          <View style={s.previewWrap}>
            <View style={[s.spacerBox, { height }]}>
              <View style={s.spacerOutline}>
                <Text style={s.spacerLabel}>Spacer</Text>
                {/* handle esquina inferior derecha */}
                <View style={s.handleZone} {...panResponder.panHandlers}>
                  <View style={s.handleDot} />
                </View>
              </View>
            </View>
            <Text style={s.heightText}>
              Height: {Math.round(height)} px
            </Text>
          </View>

          <TouchableOpacity
            style={s.footerBtn}
            activeOpacity={0.85}
            onPress={handleSave}
          >
            <Text style={s.footerBtnText}>Apply spacer</Text>
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
      paddingHorizontal: 20,
      maxHeight: '70%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    iconBtn: { padding: 6 },
    headerTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    previewWrap: {
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 18,
      width: '100%',
    },
    spacerBox: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 18,
      backgroundColor: 'transparent',
      justifyContent: 'center',
    },
    spacerOutline: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.accent,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    spacerLabel: {
      position: 'absolute',
      top: 6,
      left: 14,
      color: c.textMuted,
      fontSize: 12,
    },
    handleZone: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 30,
      height: 30,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      padding: 6,
    },
    handleDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.accent,
    },
    heightText: {
      marginTop: 10,
      color: c.textMuted,
      fontSize: 13,
    },
    footerBtn: {
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
