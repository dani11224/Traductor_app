// app/screens/settings.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Palette } from '../theme/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, setIsDark } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  // Por ahora solo estado local (luego lo conectas a Supabase / auth)
  const [name, setName] = useState('User');
  const [username, setUsername] = useState('username');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const openAvatarPicker = () => {
    Alert.alert(
      'Profile picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Gallery',
          onPress: pickFromGallery,
        },
        {
          text: 'Camera',
          onPress: takePhoto,
        },
      ],
      { cancelable: true },
    );
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // cuadrado tipo avatar
      quality: 0.9,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      // TODO: subir a Supabase Storage y guardar en profiles.avatar_url
      // await uploadAvatarToSupabase(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      // TODO: subir a Supabase Storage y guardar en profiles.avatar_url
      // await uploadAvatarToSupabase(uri);
    }
  };

  const onSaveProfile = () => {
    // aquí luego llamas a Supabase o a tu API
    Alert.alert('Saved', 'Profile updated locally (connect to backend later).');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.screen}>
        {/* HEADER */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>Settings</Text>

            <View style={s.iconBtn} />
          </View>
        </View>

        <View style={s.content}>
          {/* Perfil */}
          <Text style={s.sectionLabel}>Profile</Text>

          <View style={s.profileRow}>
            <TouchableOpacity style={s.avatar} onPress={openAvatarPicker}>
              <View
                style={[
                  s.avatar,
                  { borderColor: colors.accent, backgroundColor: colors.card },
                ]}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                ) : (
                  <Ionicons name="person" size={42} color={colors.text} />
                )}
              </View>
            </TouchableOpacity>

            <View style={s.profileFields}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.textMuted}
                style={s.input}
              />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor={colors.textMuted}
                style={s.input}
              />
            </View>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={onSaveProfile}>
            <Text style={s.saveBtnText}>Save profile</Text>
          </TouchableOpacity>

          {/* Apariencia */}
          <View style={s.divider} />

          <Text style={s.sectionLabel}>Appearance</Text>
          <View style={s.row}>
            <View>
              <Text style={s.rowTitle}>Dark mode</Text>
              <Text style={s.rowSubtitle}>
                Toggle between light and dark theme
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setIsDark(v)}
              thumbColor={isDark ? colors.accent : '#f4f3f4'}
              trackColor={{ false: '#4b5563', true: colors.primary }}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    screen: { flex: 1, backgroundColor: c.bg },

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

    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 10,
    },

    sectionLabel: {
      color: c.textMuted,
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },

    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: 36,
    },
    profileFields: {
      flex: 1,
      gap: 8,
      paddingLeft: 12,
    },

    input: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: c.text,
      fontSize: 14,
    },

    saveBtn: {
      alignSelf: 'flex-start',
      marginTop: 6,
      backgroundColor: c.accent,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
    },
    saveBtnText: {
      color: c.onPrimary,
      fontWeight: '700',
      fontSize: 13,
    },

    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 20,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '600',
    },
    rowSubtitle: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
  });
