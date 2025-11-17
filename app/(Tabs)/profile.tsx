// app/main/(Tabs)/profile.tsx
import { supabase } from '../../src/lib/supabase';
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, Palette } from '../theme/theme';
import { AddOption, SpaceBlock } from '../types/space';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '../(Tabs)/library';
import  AddBlockModal  from '@/components/profile/AddBlockModal';
import EditBlockModal from '@/components/profile/EditBlockModal';
import AuthorBlockModal from '@/components/profile/AuthorBlockModal';
import BookBlockModal from '@/components/profile/BookBlockModal';
import TextContentBlockModal from '@/components/profile/TextContentBlockModal';
import ProfileThemeModal from '@/components/profile/ProfileThemeModal';
import SectionHeaderModal from '@/components/profile/SectionHeaderModal';
import SpacerModal from '@/components/profile/SpacerModal';
import ImageBlockModal from '@/components/profile/ImageBlockModal';
import TextCardModal from '@/components/profile/TextCardModal';

type ProfileBgTheme = {
  id: string;
  name: string;
  top: string;
  bottom: string;
};

const BASE_PROFILE_BG_THEMES: ProfileBgTheme[] = [
  { id: 'violet', name: 'Violet', top: '#050816', bottom: '#312E81' },
  { id: 'rose',  name: 'Rose',  top: '#1F0A1F', bottom: '#9D174D' },
  { id: 'forest',name: 'Forest',top: '#020617', bottom: '#064E3B' },
  { id: 'slate', name: 'Slate', top: '#020617', bottom: '#111827' },
];

async function uploadSpaceImage(localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = localUri.split('.').pop() || 'jpg';
  const fileName = `space-images/${user.id}-${Date.now()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });
  const body = base64ToArrayBuffer(base64);

  const { error } = await supabase.storage
    .from('profile-assets') // mismo bucket que antes, o otro 'space-assets'
    .upload(fileName, body, {
      contentType: `image/${ext}`,
      upsert: true,
    });

  if (error)  throw error;

  const { data } = supabase.storage
    .from('profile-assets')
    .getPublicUrl(fileName);

  return data.publicUrl;
}


export default function ProfileScreen() {

  // 👤 datos del usuario
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);

  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // bloques del Space
  const [spaceBlocks, setSpaceBlocks] = useState<SpaceBlock[]>([]);


  // modo edición de layout
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  // tema de fondo del profile
  const [profileBgThemeId, setProfileBgThemeId] =
    useState<string>('system');

  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const themeOptions = useMemo<ProfileBgTheme[]>(() => {
    const systemTheme: ProfileBgTheme = {
      id: 'system',
      name: 'Use app theme',
      top: colors.bg,
      bottom: colors.surface, // puedes usar bg-bg si quieres sólido
    };

    return [systemTheme, ...BASE_PROFILE_BG_THEMES];
  }, [colors.bg, colors.surface]);

  const bgTheme = useMemo<ProfileBgTheme>(() => {
    const found = themeOptions.find(t => t.id === profileBgThemeId);
    return found ?? themeOptions[0]; // fallback
  }, [themeOptions, profileBgThemeId]);

  

  // modal de agregar
  const [addVisible, setAddVisible] = useState(false);

  // modal de edición
  const [editVisible, setEditVisible] = useState(false);
  const [editingBlock, setEditingBlock] = useState<SpaceBlock | null>(null);
  const [editText, setEditText] = useState('');

  // modal especial de Author
  const [authorModalVisible, setAuthorModalVisible] = useState(false);
  const [authorEditingBlock, setAuthorEditingBlock] = useState<SpaceBlock | null>(null);

  //modal Book
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [bookEditingBlock, setBookEditingBlock] = useState<SpaceBlock | null>(null);

  //modal Text Content
  const [textBlockModalVisible, setTextBlockModalVisible] = useState(false);
  const [textBlockMode, setTextBlockMode] = useState<'quote' | 'poem'>('quote');
  const [textEditingBlock, setTextEditingBlock] = useState<SpaceBlock | null>(null);

  //modal de Section Header
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [sectionEditingBlock, setSectionEditingBlock] =
    useState<SpaceBlock | null>(null);

  //modal de Spacer
  const [spacerModalVisible, setSpacerModalVisible] = useState(false);
  const [spacerEditingBlock, setSpacerEditingBlock] =
    useState<SpaceBlock | null>(null);

  //modal de Image Block
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageEditingBlock, setImageEditingBlock] =
    useState<SpaceBlock | null>(null);

  //modal de Text Card Block
  const [textCardModalVisible, setTextCardModalVisible] = useState(false);
  const [textCardEditingBlock, setTextCardEditingBlock] =
    useState<SpaceBlock | null>(null);

    const loadProfile = useCallback(async () => {
      try {
        setLoadingProfile(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingProfile(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('name, username, avatar_url, profile_theme_id, space_config')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfileName(data.name ?? '');
          setProfileUsername(data.username ?? '');
          setProfileAvatar(data.avatar_url ?? null);

          if (data.profile_theme_id) {
            setProfileBgThemeId(data.profile_theme_id);
          }

          if (data.space_config) {
            const raw: any = data.space_config;
            if (Array.isArray(raw)) {
              setSpaceBlocks(raw as SpaceBlock[]);
            } else if (Array.isArray(raw?.blocks)) {
              setSpaceBlocks(raw.blocks as SpaceBlock[]);
            }
          }
        }
      } catch (e) {
        console.log('loadProfile error', (e as any)?.message);
      } finally {
        setLoadingProfile(false);
      }
    }, []);

    // 🔁 cargar al entrar por primera vez
    useEffect(() => {
      loadProfile();
    }, [loadProfile]);

    // 🔁 recargar cada vez que la tab de Profile gana foco
    useFocusEffect(
      useCallback(() => {
        loadProfile();
      }, [loadProfile]),
    );

  const persistSpace = useCallback(async (nextBlocks: SpaceBlock[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          space_config: nextBlocks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.log('persistSpace error', error.message);
      }
    } catch (e: any) {
      console.log('persistSpace exception', e.message);
    }
  }, []);

  // para cuando guardas desde EditBlockModal, TextCardModal, etc.
  const handleUpdateBlock = (blockId: string, patch: Partial<SpaceBlock>) => {
    setSpaceBlocks(prev => {
      const next = prev.map(b =>
        b.id === blockId ? { ...b, ...patch, data: { ...b.data, ...patch.data } } : b
      );
      void persistSpace(next);
      return next;
    });
  };

  // 🗑️ eliminación de blocks
  const handleDeleteBlock = (blockId: string) => {
    setSpaceBlocks(prev => {
      const next = prev.filter(b => b.id !== blockId);
      void persistSpace(next);
      return next;
    });

    setEditingBlock(null); // por si estabas editando ese block
  };

  const saveProfileSpace = useCallback(
    async (nextBlocks: SpaceBlock[], nextThemeId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update({
            space_config: nextBlocks,
            profile_theme_id: nextThemeId,
          })
          .eq('id', user.id);

        if (error) throw error;
      } catch (e: any) {
        console.log('saveProfileSpace error', e.message);
      }
    },
    [],
  );
  
  const handleSelectProfileTheme = useCallback((id: string) => {
    setProfileBgThemeId(id);
    setThemeModalVisible(false);
    saveProfileSpace(spaceBlocks, id);
  }, [spaceBlocks, saveProfileSpace]);

  const handleSelectOption = useCallback(
    (option: AddOption) => {
      const base: SpaceBlock = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: option.type,
        title: option.title,
        description: option.description,
        value: '',
      };

      if (option.type === 'spacer') {
        const blockWithHeight: SpaceBlock = {
          ...base,
          spacerHeight: 40,
        };
        setSpaceBlocks(prev => {
          const next = [...prev, blockWithHeight];
          void persistSpace(next);
          return next;
        });
        setAddVisible(false);
        setSpacerEditingBlock(blockWithHeight);
        setSpacerModalVisible(true);
        return;
      }

      if (option.type === 'image') {
        const blockWithImage: SpaceBlock = {
          ...base,
          imageUri: null,
          imageWidthRatio: 1,
          imageHeight: 170,
        };
        setSpaceBlocks(prev => {
          const next = [...prev, blockWithImage];
          void persistSpace(next);
          return next;
        });
        setAddVisible(false);
        setImageEditingBlock(blockWithImage);
        setImageModalVisible(true);
        return;
      }

      if (option.type === 'text') {
        const textCardBlock: SpaceBlock = {
          ...base,
          accentColor: colors.card,
          accentTextColor: colors.text,
        };
        setSpaceBlocks(prev => {
          const next = [...prev, textCardBlock];
          void persistSpace(next);
          return next;
        });
        setAddVisible(false);
        setTextCardEditingBlock(textCardBlock);
        setTextCardModalVisible(true);
        return;
      }

      // author, book, quote, poem, header, etc.
      setSpaceBlocks(prev => {
        const next = [...prev, base];
        void persistSpace(next);
        return next;
      });
      setAddVisible(false);

      if (option.type === 'author') {
        setAuthorEditingBlock(base);
        setAuthorModalVisible(true);
      } else if (option.type === 'book') {
        setBookEditingBlock(base);
        setBookModalVisible(true);
      } else if (option.type === 'quote' || option.type === 'poem') {
        setTextEditingBlock(base);
        setTextBlockMode(option.type);
        setTextBlockModalVisible(true);
      } else if (option.type === 'header') {
        setSectionEditingBlock(base);
        setSectionModalVisible(true);
      } else {
        setEditingBlock(base);
        setEditText('');
        setEditVisible(true);
      }
    },
    [colors.card, colors.text, persistSpace],
  );


  const handleEditBlock = useCallback((block: SpaceBlock) => {
    if (block.type === 'author') {
        setAuthorEditingBlock(block);
        setAuthorModalVisible(true);
    } else if (block.type === 'book') {
        setBookEditingBlock(block);
        setBookModalVisible(true);
    } else if (block.type === 'quote' || block.type === 'poem') {
        setTextEditingBlock(block);
        setTextBlockMode(block.type);
        setTextBlockModalVisible(true);
    } else if (block.type === 'header') {
        setSectionEditingBlock(block);
        setSectionModalVisible(true);
    } else if (block.type === 'spacer') {
      setSpacerEditingBlock(block);
      setSpacerModalVisible(true);
    } else if (block.type === 'image') {
      setImageEditingBlock(block);
      setImageModalVisible(true);
    } else if (block.type === 'text') {
      setTextCardEditingBlock(block);
      setTextCardModalVisible(true);
    } else {
        setEditingBlock(block);
        setEditText(block.value);
        setEditVisible(true);
    }
  }, []);


  const handleSaveEdit = useCallback(() => {
    if (!editingBlock) return;
    setSpaceBlocks(prev => {
      const next = prev.map(b =>
        b.id === editingBlock.id ? { ...b, value: editText } : b,
      );
      void persistSpace(next);
      return next;
    });
    setEditVisible(false);
    setEditingBlock(null);
    setEditText('');
  }, [editText, editingBlock, persistSpace]);

  const handleCancelEdit = useCallback(() => {
    setEditVisible(false);
    setEditingBlock(null);
    setEditText('');
  }, []);

  const handleAuthorSave = useCallback(
    (payload: {
        authorName: string;
        themeId: string;
        accentColor: string;
        accentTextColor: string;
    }) => {
        if (!authorEditingBlock) return;

        setSpaceBlocks(prev => {
          const next = prev.map(b =>
            b.id === authorEditingBlock.id
              ? {
                  ...b,
                  value: payload.authorName,
                  authorName: payload.authorName,
                  themeId: payload.themeId,
                  accentColor: payload.accentColor,
                  accentTextColor: payload.accentTextColor,
                }
              : b,
          );
          void persistSpace(next);
          return next;
        });

        setAuthorModalVisible(false);
        setAuthorEditingBlock(null);
    },
    [authorEditingBlock, persistSpace],
  );

  // Book
  const handleBookSave = useCallback(
    (payload: {
        title: string;
        author: string;
        themeId: string;
        accentColor: string;
        accentTextColor: string;
    }) => {
        if (!bookEditingBlock) return;
        setSpaceBlocks(prev => {
          const next = prev.map(b =>
            b.id === bookEditingBlock.id
              ? {
                  ...b,
                  value: payload.title,
                  authorName: payload.author,
                  themeId: payload.themeId,
                  accentColor: payload.accentColor,
                  accentTextColor: payload.accentTextColor,
                }
              : b,
          );
          void persistSpace(next);
          return next;
        });
        setBookModalVisible(false);
        setBookEditingBlock(null);
    },
    [bookEditingBlock, persistSpace],
  );

  // Quote / Poem
  const handleTextBlockSave = useCallback(
    (payload: {
        text: string;
        themeId: string;
        accentColor: string;
        accentTextColor: string;
        textStyleId: string;
    }) => {
        if (!textEditingBlock) return;
        setSpaceBlocks(prev => {
          const next = prev.map(b =>
            b.id === textEditingBlock.id
              ? {
                  ...b,
                  value: payload.text,
                  themeId: payload.themeId,
                  accentColor: payload.accentColor,
                  textStyleId: payload.textStyleId,
                }
              : b,
          );
          void persistSpace(next);
          return next;
        });
        setTextBlockModalVisible(false);
        setTextEditingBlock(null);
    },
    [textEditingBlock, persistSpace],
  );

  // Section Header
  const handleSectionHeaderSave = useCallback(
    (payload: { text: string; bgColor: string; textColor: string }) => {
      if (!sectionEditingBlock) return;

      setSpaceBlocks(prev => {
          const next = prev.map(b =>
            b.id === sectionEditingBlock.id
              ? {
                  ...b,
                  value: payload.text,
                  sectionBgColor: payload.bgColor,
                  sectionTextColor: payload.textColor,
                }
              : b,
          );
          void persistSpace(next);
          return next;
        });

      setSectionModalVisible(false);
      setSectionEditingBlock(null);
    },
    [sectionEditingBlock, persistSpace],
  );

  // Spacer
  const handleSpacerSave = useCallback(
    (payload: { height: number }) => {
      if (!spacerEditingBlock) return;

      setSpaceBlocks(prev => {
          const next = prev.map(b =>
            b.id === spacerEditingBlock.id
              ? {...b,
                  spacerHeight: payload.height
                }
              : b,
          );
          void persistSpace(next);
          return next;
        });

      setSpacerModalVisible(false);
      setSpacerEditingBlock(null);
    },
    [spacerEditingBlock, persistSpace],
  );

  const handleSpacerLiveUpdate = useCallback(
    (height: number) => {
      if (!spacerEditingBlock) return;
      setSpaceBlocks(prev =>
        prev.map(b =>
          b.id === spacerEditingBlock.id
            ? { ...b, spacerHeight: height }
            : b,
        ),
      );
    },
    [spacerEditingBlock],
  );

  //Image Block
  const handleImageSave = useCallback(
    async (payload: { uri: string | null; widthRatio: number; height: number }) => {
      if (!imageEditingBlock) return;

      try {
        let finalUrl: string | null = imageEditingBlock.imageUri ?? null;

        if (payload.uri) {
          // si es nuevo file:// lo subimos
          if (payload.uri.startsWith('file:') || payload.uri.startsWith('content:')) {
            finalUrl = await uploadSpaceImage(payload.uri);
          } else {
            // ya es remota (por si viene de antes)
            finalUrl = payload.uri;
          }
        } else {
          finalUrl = null;
        }

        const updatedBlocks = spaceBlocks.map(b =>
          b.id === imageEditingBlock.id
            ? {
                ...b,
                imageUri: finalUrl,
                imageWidthRatio: payload.widthRatio,
                imageHeight: payload.height,
              }
            : b,
        );

        setSpaceBlocks(updatedBlocks);
        setImageModalVisible(false);
        setImageEditingBlock(null);

        // guardar Space en Supabase también
        await saveProfileSpace(updatedBlocks, profileBgThemeId);
      } catch (e: any) {
        Alert.alert('Image error', e.message ?? 'Could not save image');
      }
    },
    [imageEditingBlock, spaceBlocks, persistSpace],
  );

  const handleImageLiveSize = useCallback(
    (payload: { widthRatio: number; height: number }) => {
      if (!imageEditingBlock) return;
      setSpaceBlocks(prev =>
        prev.map(b =>
          b.id === imageEditingBlock.id
            ? {
                ...b,
                imageWidthRatio: payload.widthRatio,
                imageHeight: payload.height,
              }
            : b,
        ),
      );
    },
    [imageEditingBlock],
  );

  //Text Card Block
  const handleTextCardSave = useCallback(
    (payload: { text: string; bgColor: string; textColor: string }) => {
      if (!textCardEditingBlock) return;
      setSpaceBlocks(prev => {
          const next = prev.map(b =>
            b.id === textCardEditingBlock.id
              ? {
                  ...b,
                  value: payload.text,
                  accentColor: payload.bgColor,
                  accentTextColor: payload.textColor,
                }
              : b,
          );
          void persistSpace(next);
          return next;
        });
      setTextCardModalVisible(false);
      setTextCardEditingBlock(null);
    },
    [textCardEditingBlock],
  );

  //Render Block Tile Inner
  const renderBlockTileInner = (block: SpaceBlock) => {
    // AUTHOR
    if (block.type === 'author') {
        const bg = block.accentColor || colors.card;
        const txt = block.accentTextColor || colors.text;

        return (
        <View style={[s.authorTileInner, { backgroundColor: bg }]}>
            <View style={s.authorIconRow}>
            <Ionicons name="person-outline" size={22} color={txt} />
            <Ionicons name="musical-notes-outline" size={20} color={txt} />
            </View>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text
                style={[s.authorName, { color: txt }]}
                numberOfLines={2}
            >
                {block.authorName ?? block.value ?? 'Author'}
            </Text>
            <Text style={s.authorSubtitle}>Author</Text>
            </View>
        </View>
        );
    }

    // BOOK
    if (block.type === 'book') {
        const bg = block.accentColor || colors.card;
        const txt = block.accentTextColor || colors.text;

        return (
        <View style={[s.bookTileInner, { backgroundColor: bg }]}>
            <Ionicons
            name="book-outline"
            size={20}
            color={txt}
            style={{ position: 'absolute', top: 10, right: 10 }}
            />
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text
                style={[s.bookTitle, { color: txt }]}
                numberOfLines={2}
            >
                {block.bookTitle ?? block.value ?? 'Book'}
            </Text>
            <Text style={s.bookAuthor} numberOfLines={1}>
                {block.bookAuthor || 'Unknown author'}
            </Text>
            </View>
        </View>
        );
    }

    // QUOTE / POEM → texto ocupa todo
    if (block.type === 'quote' || block.type === 'poem') {
        const bg = block.accentColor || colors.card;
        const txt = block.accentTextColor || colors.text;
        const fontFamily =
        block.textStyleId === 'serif'
            ? 'serif'
            : block.textStyleId === 'mono'
            ? 'monospace'
            : Platform.select({
                ios: 'System',
                android: 'sans-serif',
                default: 'System',
            });

        return (
        <View style={[s.textTileInner, { backgroundColor: bg }]}>
            <Text
            style={[
                s.textTileContent,
                { color: txt, fontFamily },
            ]}
            >
            {block.value ||
                (block.type === 'quote'
                ? 'Tap to write your quote…'
                : 'Tap to write your poem…')}
            </Text>
            <Text style={s.textTileLabel}>
            {block.type === 'quote' ? 'Quote' : 'Poem'}
            </Text>
        </View>
        );
    }

    // SECTION HEADER → texto ocupa todo
    if (block.type === 'header') {
      const bg = block.sectionBgColor || colors.card;
      const txt = block.sectionTextColor || colors.text;

      return (
        <View style={[s.sectionHeaderPill, { backgroundColor: bg }]}>
          <Text
            style={[s.sectionHeaderText, { color: txt }]}
            numberOfLines={1}
          >
            {block.value || block.title || 'Section title'}
          </Text>
        </View>
      );
    }

    // SPACER
    if (block.type === 'spacer') {
      const h = block.spacerHeight ?? 24;
      return <View style={{ height: h }} />;
    }

    // IMAGE BLOCK
    if (block.type === 'image') {
      const h = block.imageHeight ?? 170;
      const uri = block.imageUri;

      return (
        <View style={[s.imageCard, { height: h }]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={s.imageContent}
              resizeMode="cover"
            />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={22}
                color={colors.textMuted}
              />
              <Text style={s.imagePlaceholderText}>
                Tap to choose image
              </Text>
            </View>
          )}
        </View>
      );
    }

    // TEXT CARD BLOCK
    if (block.type === 'text') {
      const bg = block.accentColor || colors.card;
      const txt = block.accentTextColor || colors.text;

      return (
        <View style={[s.textCard, { backgroundColor: bg }]}>
          <Text
            style={[s.textCardText, { color: txt }]}
            numberOfLines={5}
          >
            {block.value || 'Tap to write text'}
          </Text>
        </View>
      );
    }

    // Default card
    const accent = block.accentColor || colors.primary;
    return (
        <View
        style={[
            s.spaceBlockCard,
            { borderLeftColor: accent, borderLeftWidth: 3 },
        ]}
        >
        <View style={s.spaceBlockHeader}>
            <Text style={s.spaceBlockTitle}>{block.title}</Text>
            <Text style={s.spaceBlockType}>
              {block.type.toUpperCase()}
            </Text>
        </View>
        <Text style={s.spaceBlockPreview} numberOfLines={2}>
            {block.value || 'Tap to add content'}
        </Text>
        </View>
    );
  };

    const renderEditableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<SpaceBlock>) => {
      const bg = item.accentColor || colors.card;
      const txt = item.accentTextColor || colors.text;

      if (item.type === 'spacer') {
        const h = item.spacerHeight ?? 24;
        return (
          <TouchableOpacity
            style={[
              s.editTileWrapper,
              isActive && s.editTileActive,
            ]}
            onLongPress={drag}
            delayLongPress={80}
            activeOpacity={0.9}
          >
            <View pointerEvents="none" style={s.editHandles}>
              <View style={[s.handleDot, { top: 6, left: 6 }]} />
              <View style={[s.handleDot, { top: 6, right: 6 }]} />
              <View style={[s.handleDot, { bottom: 6, left: 6 }]} />
              <View style={[s.handleDot, { bottom: 6, right: 6 }]} />
            </View>

            {/* Botón de borrar */}
            <TouchableOpacity
              style={s.deleteChip}
              onPress={() => handleDeleteBlock(item.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={14} color="#F9FAFB" />
            </TouchableOpacity>

            <View style={s.spacerEditTile}>
              <View
                style={[
                  s.spacerPreview,
                  {
                    height: Math.min(80, Math.max(20, h)),
                  },
                ]}
              >
                <View style={s.spacerPreviewOutline} />
              </View>
              <Text style={s.editTileType}>SPACER</Text>
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          style={[
            s.editTileWrapper,
            isActive && s.editTileActive,
          ]}
          onLongPress={drag}
          delayLongPress={80}
          activeOpacity={0.9}
        >
          <View pointerEvents="none" style={s.editHandles}>
            <View style={[s.handleDot, { top: 6, left: 6 }]} />
            <View style={[s.handleDot, { top: 6, right: 6 }]} />
            <View style={[s.handleDot, { bottom: 6, left: 6 }]} />
            <View style={[s.handleDot, { bottom: 6, right: 6 }]} />
          </View>

          {/* Botón de borrar */}
          <TouchableOpacity
            style={s.deleteChip}
            onPress={() => handleDeleteBlock(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color="#F9FAFB" />
          </TouchableOpacity>

          <View style={[s.editTile, { backgroundColor: bg }]}>
            <Text
              style={[s.editTileTitle, { color: txt }]}
              numberOfLines={2}
            >
              {item.value || item.title}
            </Text>
            <Text style={s.editTileType}>
              {item.type.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, s, handleDeleteBlock],
  );



  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
        {/* Fondo personalizable */}
      <LinearGradient
        colors={[bgTheme.top, bgTheme.bottom]}
        style={[StyleSheet.absoluteFillObject, { zIndex: -1 }]}
        pointerEvents='none' 
      />
      <View style={s.screen}>
        {/* HEADER */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>Profile</Text>

            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push('/screens/settings')}
            >
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENIDO: modo normal vs modo edición */}
        {isEditingLayout ? (
            // ===== MODO EDICIÓN: DraggableFlatList =====
            <DraggableFlatList
              data={spaceBlocks}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => {
                setSpaceBlocks(data);
                void persistSpace(data);
              }}
              renderItem={renderEditableItem}
              numColumns={2}
              activationDistance={4}
              containerStyle={s.editListContainer}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 140,
                paddingTop: 16,
              }}
              columnWrapperStyle={s.editColumnWrapper}
            />
        ) : (
            // ===== MODO NORMAL: ScrollView como antes =====
        <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    s.scrollContent,
                    { paddingBottom: insets.bottom + 140 },
                ]}
                >

            {/* Avatar + nombre */}
            <View style={s.center}>
                <View style={s.avatar}>
                  {profileAvatar ? (
                    <Image source={{ uri: profileAvatar }} style={s.avatarImg} />
                  ) : (
                    <Ionicons name="person" size={42} color={colors.text} />
                  )}
                </View>
                <Text style={s.name}>
                  {profileName || 'Your name'}
                </Text>
                <Text style={s.username}>
                  {profileUsername ? `@${profileUsername}` : '@username'}
                </Text>
            </View>

            {/* Space pill (por ahora estático) */}
            <View style={s.spaceWrap}>
                <View style={s.spacePill}>
                <View style={s.spaceLeft}>
                    <Text style={s.spaceTextActive}>Soon...</Text>
                </View>
                <View style={s.spaceRight}>
                    <Text style={s.spaceText}>Space</Text>
                </View>
                </View>
            </View>

            {/* Lista de bloques del Space */}
            <View style={s.spaceBlocksList}>
                {spaceBlocks.length === 0 ? (
                    <Text style={s.spaceEmpty}>
                    Your Space is empty. Tap “+ Add” to start customizing it.
                    </Text>
                ) : (
                    spaceBlocks.map((block) => {
                    const isFullWidth =
                    block.type === 'quote' ||
                    block.type === 'poem' ||
                    block.type === 'header' ||
                    block.type === 'spacer';

                    let widthStyle: any;

                    if (block.type === 'image') {
                      const r = Math.max(0.5, Math.min(1, block.imageWidthRatio ?? 1));
                      widthStyle = { width: `${r * 100}%` };
                    } else if (isFullWidth) {
                      widthStyle = { width: '100%' };
                    } else {
                      widthStyle = { width: '47%' }; // cards cuadradas (author, book, text, etc.)
                    }

                    return (
                    <TouchableOpacity
                        key={block.id}
                        style={widthStyle}
                        activeOpacity={0.9}
                        onPress={() => handleEditBlock(block)}
                    >
                        {renderBlockTileInner(block)}
                    </TouchableOpacity>
                    );
                })
                )}
              </View>
        </ScrollView>
        )}
        {/* BOTONES FLOTANTES ABAJO */}
        <View
            style={[
            s.floatingButtons,
            { bottom: insets.bottom + 70 },
            ]}
        >
            {isEditingLayout ? (
            // --- Controles en modo edición ---
            <View style={s.bottomButtonsRow}>
                <TouchableOpacity
                  style={s.themeBtn}
                  onPress={() => setThemeModalVisible(true)}
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={20}
                    color={colors.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                style={s.addCircle}
                onPress={() => setAddVisible(true)}
                >
                <Ionicons name="add" size={26} color={colors.onPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                style={s.smallBtn}
                onPress={() => setIsEditingLayout(false)}
                >
                <Text style={s.smallBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
            ) : (
            // --- Controles en modo normal (los que ya tenías) ---
            <View style={s.bottomButtonsRow}>
                <TouchableOpacity
                style={s.smallBtn}
                onPress={() => setAddVisible(true)}
                >
                <Text style={s.smallBtnText}>+ Add</Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={s.smallBtn}
                onPress={() => setIsEditingLayout(true)}
                >
                <Text style={s.smallBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.chatBubble}>
                <Text style={s.chatBubbleText}>ChatBot{'\n'}Bubble</Text>
                </TouchableOpacity>
            </View>
            )}
        </View>

        {/* MODAL DE AGREGAR BLOQUE */}
        <AddBlockModal
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          onSelect={handleSelectOption}
          colors={colors}
        />

        {/* MODAL PARA EDITAR CONTENIDO DEL BLOQUE */}
        <EditBlockModal
          visible={editVisible}
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          text={editText}
          setText={setEditText}
          block={editingBlock}
          colors={colors}
        />

        {/* MODAL PARA EDITAR BLOQUE DE TIPO AUTHOR */}
        <AuthorBlockModal
          visible={authorModalVisible}
          block={authorEditingBlock}
          onClose={() => {
            setAuthorModalVisible(false);
            setAuthorEditingBlock(null);
          }}
            onSave={handleAuthorSave}
        />
        {/* MODAL PARA EDITAR BLOQUE DE TIPO BOOK */}
        <BookBlockModal
            visible={bookModalVisible}
            block={bookEditingBlock}
            onClose={() => {
            setBookModalVisible(false);
            setBookEditingBlock(null);
            }}
            onSave={handleBookSave}
        />
        {/* MODAL PARA EDITAR BLOQUE DE TIPO QUOTE / POEM */}
        <TextContentBlockModal
            visible={textBlockModalVisible}
            mode={textBlockMode}
            block={textEditingBlock}
            onClose={() => {
            setTextBlockModalVisible(false);
            setTextEditingBlock(null);
            }}
            onSave={handleTextBlockSave}
        />
        {/* MODAL PARA EDITAR BLOQUE DE TIPO SECTION HEADER */}
        <SectionHeaderModal
          visible={sectionModalVisible}
          block={sectionEditingBlock}
          onClose={() => {
            setSectionModalVisible(false);
            setSectionEditingBlock(null);
          }}
          onSave={handleSectionHeaderSave}
        />
        {/* MODAL PARA EDITAR BLOQUE DE TIPO SPACER */}
        <SpacerModal
          visible={spacerModalVisible}
          block={spacerEditingBlock}
          onClose={() => {
            setSpacerModalVisible(false);
            setSpacerEditingBlock(null);
          }}
          onSave={handleSpacerSave}
          onLiveHeightChange={handleSpacerLiveUpdate}
        />
        {/* MODAL PARA EDITAR BLOQUE DE TIPO IMAGE */}
        <ImageBlockModal
          visible={imageModalVisible}
          block={imageEditingBlock}
          onClose={() => {
            setImageModalVisible(false);
            setImageEditingBlock(null);
          }}
          onSave={handleImageSave}
          onLiveSizeChange={handleImageLiveSize}
        />
        {/* MODAL PARA EDITAR BLOQUE DE TIPO TEXT CARD */}
        <TextCardModal
          visible={textCardModalVisible}
          block={textCardEditingBlock}
          onClose={() => {
            setTextCardModalVisible(false);
            setTextCardEditingBlock(null);
          }}
          onSave={handleTextCardSave}
        />
        {/* MODAL DE SELECCIÓN DE TEMA DE FONDO */}
        <ProfileThemeModal
          visible={themeModalVisible}
          themes={themeOptions}
          currentId={profileBgThemeId}
          onSelect={handleSelectProfileTheme}
          onClose={() => setThemeModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

/* ---------- Estilos ---------- */

const styles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, /*backgroundColor: c.bg*/ },
    screen: { flex: 1, /*backgroundColor: c.bg*/ },

    headerWrap: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: { padding: 4 },
    headerTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },

    center: {
      alignItems: 'center',
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 24,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
    },
    name: {
      color: c.text,
      fontSize: 18,
      fontWeight: '700',
    },
    username: {
      color: c.textMuted,
      fontSize: 13,
      marginTop: 2,
    },

    spaceWrap: {
      marginTop: 26,
      alignItems: 'center',
    },
    spacePill: {
      flexDirection: 'row',
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: c.primary,
    },
    spaceLeft: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spaceRight: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spaceTextActive: {
      color: c.onPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    spaceText: {
      color: c.text,
      fontWeight: '600',
      fontSize: 12,
    },

    spaceBlocksList: {
      marginTop: 24,
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 12,
      rowGap: 12,
    },
    spaceEmpty: {
      color: c.textMuted,
      fontSize: 13,
    },
    editListContainer: {
      flex: 1,
    },
    editColumnWrapper: {
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    editTile: {
      flex: 1,
      borderRadius: 24,
      padding: 12,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    editTileActive: {
      transform: [{ scale: 1.03 }],
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    editTileTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    editTileType: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.7)',
      alignSelf: 'flex-end',
    },
    editTileWrapper: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 24,
    },
    editHandles: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
    },
    handleDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: '#F9FAFB',
    },
    deleteChip: {
      position: 'absolute',
      top: 4,
      right: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(15,23,42,0.9)',
      zIndex: 10,
    },

    // Author
    authorTileInner: {
    aspectRatio: 1,
    borderRadius: 26,
    padding: 14,
    justifyContent: 'space-between',
    },
    authorTile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 26,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    },
    authorIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    },
    authorName: {
    fontSize: 16,
    fontWeight: '700',
    },
    authorSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
    },
    // Book
    bookTileInner: {
    aspectRatio: 1,
    borderRadius: 26,
    padding: 16,
    justifyContent: 'flex-end',
    minHeight: 130,
    },
    bookTile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 26,
    padding: 16,
    justifyContent: 'flex-end',
    },
    bookTitle: {
    fontSize: 15,
    fontWeight: '800',
    },
    bookAuthor: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 4,
    },
    // Quote / Poem
    textTileInner: {
    borderRadius: 24,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
    },
    textTile: {
    width: '100%',
    minHeight: 130,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    },
    textTileContent: {
    fontSize: 16,
    },
    textTileLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    alignSelf: 'flex-end',
    },
    spaceBlockCard: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    spaceBlockHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    spaceBlockTitle: {
      color: c.text,
      fontWeight: '700',
      fontSize: 14,
    },
    spaceBlockType: {
      color: c.textMuted,
      fontSize: 10,
    },
    spaceBlockPreview: {
      color: c.textMuted,
      fontSize: 13,
    },
    // Section Header
    sectionHeaderPill: {
      width: '100%',
      borderRadius: 999,
      paddingHorizontal: 22,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    sectionHeaderText: {
      fontSize: 16,
      fontWeight: '700',
    },
    //Spacer
    spacerEditTile: {
      flex: 1,
      borderRadius: 24,
      padding: 12,
      justifyContent: 'space-between',
      backgroundColor: 'rgba(15,23,42,0.9)',
    },
    spacerPreview: {
      width: '100%',
      justifyContent: 'center',
    },
    spacerPreviewOutline: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: 'rgba(248,250,252,0.85)',
      borderRadius: 14,
      width: '100%',
      height: '100%',
    },
    // Image Card
    imageCard: {
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: 'rgba(15,23,42,0.8)',
    },
    imageContent: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    imagePlaceholderText: {
      color: c.textMuted,
      fontSize: 12,
    },

    textCard: {
      borderRadius: 24,
      padding: 14,
      aspectRatio: 1,
      justifyContent: 'center',
    },
    textCardText: {
      fontSize: 14,
      fontWeight: '600',
    },
    floatingButtons: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    bottomButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    smallBtn: {
      backgroundColor: c.card,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    smallBtnText: {
      color: c.text,
      fontSize: 12,
      fontWeight: '600',
    },
    chatBubble: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatBubbleText: {
      color: c.onPrimary,
      fontSize: 11,
      textAlign: 'center',
      fontWeight: '700',
    },
    themeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
    },
    addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    },
  });