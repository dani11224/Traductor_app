// app/screens/settings.tsx
import { supabase } from '../../src/lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
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
import { base64ToArrayBuffer } from '../(Tabs)/library';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme, Palette } from '../theme/theme';

async function uploadAvatarToSupabase(localUri: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = localUri.split('.').pop() || 'jpg';
  const fileName = `avatars/${user.id}-${Date.now()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });
  const body = base64ToArrayBuffer(base64);

  const { error } = await supabase.storage
    .from('profile-assets')
    .upload(fileName, body, {
      contentType: `image/${ext}`,
      upsert: true,
    });

  console.log('uploadAvatarToSupabase user =>', user?.id);
  if (error) throw error;

  const { data } = supabase.storage
    .from('profile-assets')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, setIsDark } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'name, username, avatar_url, theme_mode, profile_theme_id, space_config',
        )
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setName(data.name ?? '');
        setUsername(data.username ?? '');
        if (data.avatar_url) setAvatarUri(data.avatar_url);

        if (data.theme_mode === 'dark') {
          setIsDark(true);
        } else if (data.theme_mode === 'light') {
          setIsDark(false);
        }
      }

      setLoading(false);
    })();
  }, [setIsDark]);

  const saveSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        name: name,
        username,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert('Saved', 'Settings updated');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save settings');
    }
  };

  const openAvatarPicker = () => {
    Alert.alert('Profile picture', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Gallery',
        onPress: pickFromGallery,
      },
      {
        text: 'Camera',
        onPress: takePhoto,
      },
    ]);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      try {
        const publicUrl = await uploadAvatarToSupabase(localUri);
        setAvatarUri(publicUrl);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert(
            'Not authenticated',
            'Please sign in to update your profile.',
          );
          return;
        }
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);
      } catch (e: any) {
        console.log('upload error =>', JSON.stringify(e, null, 2));
        Alert.alert('Upload error', e.message ?? 'Could not upload avatar');
      }
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
      const localUri = result.assets[0].uri;
      try {
        const publicUrl = await uploadAvatarToSupabase(localUri);
        setAvatarUri(publicUrl);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert(
            'Not authenticated',
            'Please sign in to update your profile.',
          );
          return;
        }
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);
      } catch (e: any) {
        Alert.alert('Upload error', e.message ?? 'Could not upload avatar');
      }
    }
  };

  const handleToggleTheme = async (nextValue: boolean) => {
    setIsDark(nextValue);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          theme_mode: nextValue ? 'dark' : 'light',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.log('Error updating theme_mode =>', error);
      }
    } catch (e) {
      console.log('Error updating theme_mode =>', e);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Ajusta la ruta si tu login vive en otro path
      router.replace('../(Auth)/Login');
    } catch (e: any) {
      Alert.alert('Logout error', e.message ?? 'Could not log out');
    }
  };

  const openHelpCenter = () => {
    Alert.alert(
      'Help Center',
      'Here you could open a help page, FAQ or an external link.',
    );
  };

  const openReportProblem = () => {
    Alert.alert(
      'Report a problem',
      'Here you could open a form or send an email with the issue.',
    );
  };

  const openContactUs = () => {
    Alert.alert(
      'Contact us',
      'Here you could show contact options or open a mailto link.',
    );
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

          <TouchableOpacity style={s.saveBtn} onPress={saveSettings}>
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
              onValueChange={handleToggleTheme}
              thumbColor={isDark ? colors.accent : '#f4f3f4'}
              trackColor={{ false: '#4b5563', true: colors.primary }}
            />
          </View>

          {/* Support */}
          <View style={s.divider} />

          <Text style={s.sectionLabel}>Support</Text>

          <TouchableOpacity style={s.linkRow} onPress={openHelpCenter}>
            <Text style={s.linkText}>Help Center</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.accent}
            />
          </TouchableOpacity>

          <TouchableOpacity style={s.linkRow} onPress={openReportProblem}>
            <Text style={s.linkText}>Report a Problem</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.accent}
            />
          </TouchableOpacity>

          <TouchableOpacity style={s.linkRow} onPress={openContactUs}>
            <Text style={s.linkText}>Contact Us</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.accent}
            />
          </TouchableOpacity>

          {/* Account / Logout */}
          <View style={s.divider} />

          <Text style={s.sectionLabel}>Account</Text>

          <TouchableOpacity style={s.logoutRow} onPress={handleLogout}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#f97373" // rojo suave
              style={{ marginRight: 8 }}
            />
            <Text style={s.logoutText}>Log out</Text>
          </TouchableOpacity>
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
      borderRadius: 24,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
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

    // Support links
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    linkText: {
      color: c.text,
      fontSize: 14,
    },

    // Logout
    logoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    logoutText: {
      color: '#f97373',
      fontSize: 14,
      fontWeight: '600',
    },
  });
