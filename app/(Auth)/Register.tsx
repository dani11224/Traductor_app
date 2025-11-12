// src/(Auth)/Register.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StatusBar,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
  ImageBackground, useColorScheme, Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
// import { useNavigation } from '@react-navigation/native';
// import type { NavigationProp } from '@react-navigation/native';
// import type { RootStackParamList } from '../navigation'; // ajusta ruta si cambia
import { usePageTurn, HideWhileTurning } from "../../src/components/transitions/PageTurnOverlay";
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

/** Paleta PastelDark */
type Palette = {
  bg: string; surface: string; card: string;
  primary: string; accent: string; onPrimary: string;
  text: string; textMuted: string; border: string;
  success: string; warning: string; error: string; highlight: string;
};

const colors: Palette = {
  bg:"#0E1218", surface:"#121723", card:"#161B2A",
  primary:"#A5B4FC", accent:"#7ADCC4", onPrimary:"#0B0F14",
  text:"#E6EDF6", textMuted:"#A6B3C2", border:"#263243",
  success:"#79E2B5", warning:"#FFD58A", error:"#FF9CA1",
  highlight:"#FDE68A22",
};

/** Dimensiones y constantes de layout */
const { width: W, height: H } = Dimensions.get("window");
const COMPACT   = H < 740;
const HEADER_H  = COMPACT ? 96 : 110;
const RADIUS_TL = Math.round(W * 0.24);
const TOP_PAD   = Math.round(RADIUS_TL * 0.35);

/** Ancho máximo del contenido (inputs/botón) */
const CONTENT_W = Math.min(Math.round(W * 0.8), 420);

/** Tamaños compactos para que todo quepa sin scroll */
const INPUT_H = COMPACT ? 42 : 46;
const VSP     = COMPACT ? 8  : 10;

// Fondos locales para esta pantalla (ajusta rutas si es necesario)
const LIGHT_BG = require("../../src/assets/backgrounds/bg_clear.png");
const DARK_BG  = require("../../src/assets/backgrounds/bg_dark.png");

export default function Register() {
  // const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const router = useRouter();
  const { turnTo } = usePageTurn();
  const scheme = useColorScheme();

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);

  const s = styles(colors);

  const handleSignUp = async () => {
    try {
      const mail = email.trim();
      if (!firstName || !lastName || !mail || !password || !confirm) {
        Alert.alert('Missing data', 'Please complete all fields.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak password', 'Use at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        Alert.alert('Password mismatch', 'Passwords do not match.');
        return;
      }

      setLoading(true);

      // signUp — si tu proyecto exige verificación por email, data.session será null
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          // Si usas verificación por correo y quieres deep link:
          // emailRedirectTo: 'https://TU_DOMINIO/auth/callback'
        },
      });

      if (error) {
        Alert.alert('Sign up error', error.message);
        return;
      }

      // Si NO exige verificación, habrá sesión activa y podemos actualizar el profile
      if (data.session && data.user) {
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          const { error: upErr } = await supabase
            .from('profiles')
            .update({ name: fullName })
            .eq('id', data.user.id);
          // Si falla la actualización del profile, no bloqueamos el flujo
          if (upErr) console.warn('Profile update error:', upErr.message);
        }
        // Navega al Tab Library
        // Si quieres ver la animación de “page turn”, usa turnTo:
        turnTo(() => router.replace('/(Tabs)/library'), 'right');
        return;
      }

      // Intento de auto-login inmediato (por si el proyecto permite)
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      });

      if (!loginErr && loginData.session && loginData.user) {
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          const { error: upErr } = await supabase
            .from('profiles')
            .update({ name: fullName })
            .eq('id', loginData.user.id);
          if (upErr) console.warn('Profile update error:', upErr.message);
        }
        turnTo(() => router.replace('/(Tabs)/library'), 'right');
        return;
      }

      // Si SÍ exige verificación por email:
      Alert.alert(
        'Verify your email',
        'We sent you a verification link. Please confirm your account to continue.'
      );
      // Ir al Login tras aviso
      turnTo(() => router.replace('/(Auth)/Login'), 'left');

    } catch (e: any) {
      Alert.alert('Unexpected error', e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={scheme === "dark" ? DARK_BG : LIGHT_BG}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar barStyle="light-content" />

        {/* HEADER (transparente; la curva la hace el sheet) */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.replace('/(Auth)/login')} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Sign Up</Text>
        </View>

        {/* SHEET con efecto "Liquid Glass" */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <GlassSheet>
            {/* Campos (1 columna, angostos, centrados) */}
            <HideWhileTurning>
              <View style={s.formContainer}>
                <LabeledInput
                  label="First name"
                  placeholder="Vijay"
                  value={firstName}
                  onChangeText={setFirstName}
                  colors={colors}
                />
                <LabeledInput
                  label="Last name"
                  placeholder="Bhuva"
                  value={lastName}
                  onChangeText={setLastName}
                  colors={colors}
                />
                <LabeledInput
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  colors={colors}
                />
                <LabeledInput
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  colors={colors}
                />
                <LabeledInput
                  label="Confirm password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={confirm}
                  onChangeText={setConfirm}
                  colors={colors}
                />
              </View>
            </HideWhileTurning>

            {/* CTA fijo al fondo (mismo ancho angosto) */}
            <View style={s.formBottom}>
              <View style={s.formContainer}>
                <TouchableOpacity
                  style={[s.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  <Text style={s.primaryBtnText}>
                    {loading ? 'Creating…' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
                <View style={s.footerRow}>
                  <Text style={s.footerText}>Already have any account? </Text>
                  <TouchableOpacity
                    onPress={() => turnTo(() => router.replace('/(Auth)/login'), "left")}
                  >
                    <Text style={s.footerLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </GlassSheet>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

/** ───────────────── GlassSheet (sólo el contenedor tiene blur) ───────────────── */
function GlassSheet({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  return (
    <View style={sheetStyles.pos /* posición y alto del sheet */}>
      <View style={sheetStyles.clip /* recorte y bordes redondeados */}>
        {/* Capa de blur detrás del contenido */}
        <BlurView
          intensity={scheme === "dark" ? 48 : 36}
          tint={scheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Color de respaldo + opacidad para “vidrio” */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor:
                scheme === "dark"
                  ? "rgba(18,23,35,0.45)"
                  : "rgba(255,255,255,0.55)",
            },
          ]}
        />
        {/* Borde sutil exterior (brillo) */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderTopLeftRadius: RADIUS_TL,
              borderWidth: 1,
              borderColor:
                scheme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
            },
          ]}
        />
        {/* Sheen superior (brillo líquido) */}
        <LinearGradient
          pointerEvents="none"
          colors={
            scheme === "dark"
              ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.00)"]
              : ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.00)"]
          }
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: RADIUS_TL * 0.6,
          }}
        />

        {/* Contenido (no se blurea) */}
        <View style={sheetStyles.content}>{children}</View>
      </View>
    </View>
  );
}

/** Input con etiqueta (compacto y angosto) */
function LabeledInput(props: any) {
  const { label, colors, style, ...inputProps } = props;
  return (
    <View style={{ marginBottom: VSP }}>
      <Text style={{ color: colors.textMuted, marginBottom: 6, fontSize: 12 }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 10,
          minHeight: INPUT_H,
          justifyContent: "center",
        }}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={{ color: colors.text, fontSize: 15, padding: 0 }}
          {...inputProps}
        />
      </View>
    </View>
  );
}

/** Estilos generales (header, inputs, CTA) */
const styles = (c: Palette) =>
  StyleSheet.create({
    header: {
      height: HEADER_H,
      backgroundColor: "transparent",
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      paddingBottom: 12,
      overflow: "hidden",
      zIndex: 0,
    },
    backBtn: {
      position: "absolute",
      top: 10,
      left: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    backArrow: { color: c.text, fontSize: 32, lineHeight: 34, marginTop: -2 },
    headerTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "700",
      alignSelf: "center",
      zIndex: 2,
    },

    /** contenedor angosto y centrado para inputs y botón */
    formContainer: {
      width: CONTENT_W,
      alignSelf: "center",
    },
    formTop: { paddingHorizontal: 0 },
    formBottom: { paddingHorizontal: 0, paddingBottom: 24 },

    primaryBtn: {
      width: "100%",
      backgroundColor: c.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnText: { color: c.onPrimary, fontWeight: "700", fontSize: 16 },

    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 20,
    },
    footerText: { color: c.textMuted },
    footerLink: { color: c.text, fontWeight: "700" },
  });

/** Estilos del sheet “Liquid Glass” */
const sheetStyles = StyleSheet.create({
  pos: {
    position: "absolute",
    top: HEADER_H - 8,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  clip: {
    flex: 1,
    borderTopLeftRadius: RADIUS_TL,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingTop: TOP_PAD,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
});
