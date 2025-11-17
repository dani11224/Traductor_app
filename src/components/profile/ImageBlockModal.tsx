import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Palette } from '../../../app/theme/theme';
import { SpaceBlock } from '../../../app/types/space';

const MIN_RATIO = 0.5;
const MAX_RATIO = 1.0;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 260;
const DEFAULT_RATIO = 1.0;
const DEFAULT_HEIGHT = 170;
const PREVIEW_WIDTH = 260;

type Props = {
  visible: boolean;
  block: SpaceBlock | null;
  onClose: () => void;
  onSave: (payload: {
    uri: string | null;
    widthRatio: number;
    height: number;
  }) => void;
  onLiveSizeChange?: (payload: {
    widthRatio: number;
    height: number;
  }) => void;
};

export default function ImageBlockModal({
  visible,
  block,
  onClose,
  onSave,
  onLiveSizeChange,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [uri, setUri] = useState<string | null>(null);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  const baseRatioRef = useRef(DEFAULT_RATIO);
  const baseHeightRef = useRef(DEFAULT_HEIGHT);

  useEffect(() => {
    if (!block) return;
    setUri(block.imageUri ?? null);
    const r = block.imageWidthRatio ?? DEFAULT_RATIO;
    const h = block.imageHeight ?? DEFAULT_HEIGHT;
    setRatio(r);
    setHeight(h);
    baseRatioRef.current = r;
    baseHeightRef.current = h;
  }, [block]);

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled) {
      setUri(result.assets[0].uri);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const nextRatio = Math.min(
          MAX_RATIO,
          Math.max(
            MIN_RATIO,
            baseRatioRef.current + gesture.dx / 200, // ajustar sensibilidad
          ),
        );
        const nextHeight = Math.min(
          MAX_HEIGHT,
          Math.max(
            MIN_HEIGHT,
            baseHeightRef.current + gesture.dy,
          ),
        );
        setRatio(nextRatio);
        setHeight(nextHeight);
        onLiveSizeChange?.({
          widthRatio: nextRatio,
          height: nextHeight,
        });
      },
      onPanResponderRelease: () => {
        baseRatioRef.current = ratio;
        baseHeightRef.current = height;
      },
    }),
  ).current;

  if (!block) return null;

  const handleSave = () => {
    onSave({
      uri,
      widthRatio: ratio,
      height,
    });
  };

  const previewBoxWidth = PREVIEW_WIDTH * ratio;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Ionicons
                name="chevron-down"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Image block</Text>
            <View style={s.iconBtn} />
          </View>

          {/* Preview */}
          <View style={s.previewWrap}>
            <View
              style={[
                s.previewBox,
                { width: previewBoxWidth, height },
              ]}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={s.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.previewPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={26}
                    color={colors.textMuted}
                  />
                  <Text style={s.previewPlaceholderText}>
                    Tap “Choose image”
                  </Text>
                </View>
              )}

              {/* handle */}
              <View
                style={s.handleZone}
                {...panResponder.panHandlers}
              >
                <View style={s.handleDot} />
              </View>
            </View>

            <Text style={s.infoText}>
              Width: {Math.round(ratio * 100)}% · Height:{' '}
              {Math.round(height)} px
            </Text>
          </View>

          {/* Botones */}
          <View style={s.buttonsRow}>
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              <Text style={s.secondaryBtnText}>Choose image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.primaryBtn,
                !uri && { opacity: 0.5 },
              ]}
              disabled={!uri}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Apply</Text>
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
      maxHeight: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    iconBtn: { padding: 6 },
    headerTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
    },
    previewWrap: {
      alignItems: 'center',
      marginBottom: 18,
      marginTop: 8,
    },
    previewBox: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: c.surface,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    previewPlaceholderText: {
      color: c.textMuted,
      fontSize: 13,
    },
    handleZone: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: 6,
    },
    handleDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.accent,
    },
    infoText: {
      marginTop: 10,
      color: c.textMuted,
      fontSize: 13,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    secondaryBtn: {
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: c.text,
      fontWeight: '600',
    },
    primaryBtn: {
      flex: 1,
      borderRadius: 999,
      backgroundColor: c.accent,
      paddingVertical: 10,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: c.onPrimary,
      fontWeight: '700',
    },
  });
