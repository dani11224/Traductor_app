// app/(auth)/reset-password.tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTheme, Palette } from '../theme/theme';

type Mode = 'email' | 'phone';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState<'email' | 'phone' | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
  const onlyDigits = (v: string) => v.replace(/\D+/g, '');

  const errors = useMemo(() => {
    const e: { email?: string; phone?: string } = {};
    if (mode === 'email' && email.length > 0 && !isEmail(email)) {
      e.email = 'Invalid email format';
    }
    if (mode === 'phone') {
      const d = onlyDigits(phone);
      if (phone.length > 0 && d.length < 9) {
        e.phone = 'At least 9 digits';
      }
    }
    return e;
  }, [mode, email, phone]);

  const valid = useMemo(() => {
    if (mode === 'email') return isEmail(email);
    return onlyDigits(phone).length >= 9;
  }, [mode, email, phone]);

  const handleSubmit = async () => {
    if (!valid || loading) return;

    if (mode === 'phone') {
      Alert.alert(
        'Not supported yet',
        'Password reset by phone is not available in this version.',
      );
      return;
    }

    const trimmed = email.trim();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) {
        console.log('resetPasswordForEmail error =>', error);
        Alert.alert(
          'Error',
          error.message ?? 'Could not send reset email. Please try again.',
        );
        return;
      }

      Alert.alert(
        'Reset link sent',
        'If this email is registered, you will receive a link to reset your password.',
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.body}>
        {/* Header + glow */}
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.title}>
            Forgot password
          </Text>
          <View style={s.titleGlow} />
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.helper}>
            Enter your email or phone number to regain access.
          </Text>

          {/* Tabs */}
          <View style={s.tabsRow}>
            <TouchableOpacity
              style={[s.tab, mode === 'email' && s.tabActive]}
              onPress={() => setMode('email')}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  s.tabText,
                  mode === 'email' ? s.tabTextActive : s.tabTextInactive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, mode === 'phone' && s.tabActive]}
              onPress={() => setMode('phone')}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  s.tabText,
                  mode === 'phone' ? s.tabTextActive : s.tabTextInactive,
                ]}
              >
                Phone Number
              </Text>
            </TouchableOpacity>
          </View>

          {/* INPUT: Email */}
          {mode === 'email' && (
            <Pressable
              onPress={() => emailRef.current?.focus()}
              style={[
                s.inputWrap,
                focused === 'email' && s.inputWrapFocused,
                errors.email && s.inputWrapError,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Email input"
            >
              <TextInput
                ref={emailRef}
                style={s.input}
                placeholder="you@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                selectionColor={colors.primary}
                value={email}
                onChangeText={setEmail}
              />
            </Pressable>
          )}

          {/* INPUT: Phone */}
          {mode === 'phone' && (
            <Pressable
              onPress={() => phoneRef.current?.focus()}
              style={[
                s.inputWrap,
                focused === 'phone' && s.inputWrapFocused,
                errors.phone && s.inputWrapError,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Phone input"
            >
              <TextInput
                ref={phoneRef}
                style={s.input}
                placeholder="+57 300 000 0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoCapitalize="none"
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
                selectionColor={colors.primary}
                value={phone}
                onChangeText={setPhone}
              />
            </Pressable>
          )}

          {/* Errors */}
          {!!errors.email && <Text style={s.errorText}>{errors.email}</Text>}
          {!!errors.phone && <Text style={s.errorText}>{errors.phone}</Text>}

          {/* CTA */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.cta, (!valid || loading) && s.ctaDisabled]}
            disabled={!valid || loading}
            onPress={handleSubmit}
          >
            <Text style={s.ctaText}>
              {loading
                ? 'Sending...'
                : mode === 'email'
                ? 'Send link'
                : 'Send code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back to login */}
        <View style={s.bottomRow}>
          <Text style={s.bottomText}>Remember your password?</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.9}
            style={s.backBtn}
          >
            <Text style={s.backBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.bg,
    },
    body: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    header: {
      width: '88%',
      maxWidth: 420,
      alignItems: 'center',
      marginBottom: 10,
    },
    title: {
      color: c.primary,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 0.5,
      textShadowColor: 'rgba(35,214,255,0.22)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    },
    titleGlow: {
      marginTop: 4,
      height: 2,
      width: 64,
      backgroundColor: c.primary,
      borderRadius: 999,
      opacity: 0.45,
      shadowColor: c.primary,
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    },

    card: {
      width: '88%',
      maxWidth: 420,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: c.primary + '26', // mini stroke neón
      shadowColor: c.primary,
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },

    helper: {
      color: c.textMuted,
      fontSize: 14,
      marginBottom: 12,
    },

    tabsRow: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: c.surface ?? '#0B1218',
      borderRadius: 12,
      padding: 6,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: '#13202B',
      borderWidth: 1,
      borderColor: c.primary,
    },
    tabText: { fontSize: 14, fontWeight: '700' },
    tabTextActive: { color: c.text },
    tabTextInactive: { color: c.textMuted },

    inputWrap: {
      width: '100%',
      height: 52,
      backgroundColor: c.surface ?? '#0A1016',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      justifyContent: 'center',
      marginTop: 8,
    },
    inputWrapFocused: {
      borderColor: c.primary,
      shadowColor: c.primary,
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    inputWrapError: {
      borderColor: '#FF3D8A',
    },
    input: {
      color: c.text,
      fontSize: 16,
      paddingVertical: 0,
    },
    errorText: {
      color: '#FF3D8A',
      fontSize: 12,
      marginTop: 6,
    },

    cta: {
      marginTop: 16,
      width: '100%',
      height: 56,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaDisabled: {
      backgroundColor: c.border,
    },
    ctaText: {
      color: c.onPrimary ?? c.bg,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.3,
    },

    bottomRow: {
      width: '88%',
      maxWidth: 420,
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    bottomText: {
      color: c.textMuted,
      fontSize: 14,
    },
    backBtn: {
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    backBtnText: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
