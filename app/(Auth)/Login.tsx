// src/(Auth)/Login.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StatusBar,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
  ImageBackground, useColorScheme, Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
// import { useNavigation } from "@react-navigation/native";
// import type { NavigationProp } from "@react-navigation/native";
// import type { RootStackParamList } from "../navigation";
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

/** Dimensiones/constantes */
const { width: W, height: H } = Dimensions.get("window");
const COMPACT   = H < 740;
const HEADER_H  = COMPACT ? 96 : 110;
const RADIUS_TR = Math.round(W * 0.24); // curva grande arriba-derecha
const TOP_PAD   = Math.round(RADIUS_TR * 0.35);
const CONTENT_W = Math.min(Math.round(W * 0.8), 420);
const INPUT_H   = COMPACT ? 42 : 46;
const VSP       = COMPACT ? 8  : 10;

// Fondos (ajusta ruta si lo necesitas)
const LIGHT_BG = require("../../src/assets/backgrounds/bg_clear.png");
const DARK_BG  = require("../../src/assets/backgrounds/bg_dark.png");

export default function Login() {
  const router = useRouter();
  const { turnTo } = usePageTurn();
  const scheme = useColorScheme();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  const s = styles(colors);

  const handleLogin = async () => {
    try {
      const mail = email.trim();
      if (!mail || !password) {
        Alert.alert('Missing data', 'Please enter your email and password.');
        return;
      }
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('confirm')) {
          Alert.alert('Verify your email', 'Please confirm your email before signing in.');
          return;
        }
        Alert.alert('Login error', error.message);
        return;
      }

      // Éxito → navega al Tab "library"
      turnTo(() => router.replace('/(Tabs)/library'), 'right');
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

        {/* HEADER transparente */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.replace('/(Auth)/Register')} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Sign In</Text>
        </View>

        {/* SHEET “Liquid Glass” apoyado a la IZQUIERDA (curva arriba-derecha) */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <GlassSheetLeft>
            {/* Campos */}
            <HideWhileTurning>
              <View style={s.formContainer}>
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

                <TouchableOpacity onPress={() => { /* TODO: forgot flow */ }}>
                  <Text style={{ color: colors.textMuted, textAlign: "right", marginTop: 2 }}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>
            </HideWhileTurning>

            {/* CTA */}
            <View style={s.formBottom}>
              <View style={s.formContainer}>
                <TouchableOpacity
                  style={[s.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={s.primaryBtnText}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
                <View style={s.footerRow}>
                  <Text style={s.footerText}>Don’t have an account? </Text>
                  <TouchableOpacity
                    onPress={() => turnTo(() => router.replace('/(Auth)/Register'), "right")} /* Esto se supone que gira a la izquierda
                    pero por alguna razon esta invertido y no pude cambiarlo entonces dejalo asi que funciona como debe JAJAJAJ*/
                  >
                    <Text style={s.footerLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </GlassSheetLeft>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

/** ───────────── GlassSheet invertido (curva arriba-derecha) ───────────── */
function GlassSheetLeft({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <View style={sheetStylesLeft.pos}>
      <View style={sheetStylesLeft.clip}>
        {/* 1) Blur debajo del contenido */}
        <BlurView
          intensity={isDark ? 56 : 40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFillObject}
        />

        {/* 2) Capa “frosted” para el look de vidrio */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: isDark ? "rgba(18,23,35,0.46)" : "rgba(255,255,255,0.58)" },
          ]}
        />

        {/* 3) Sheen superior suave (sin cortes; cubre todo) */}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(255,255,255,0.20)", "rgba(255,255,255,0.00)"]
              : ["rgba(255,255,255,0.38)", "rgba(255,255,255,0.00)"]
          }
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0.2, y: 0.4 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* 4) Brillo de canto en el borde derecho */}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.00)"]
              : ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.00)"]
          }
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0.75, y: 0.5 }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 48,
            height: "100%",
          }}
        />

        {/* 5) Borde sutil del vidrio */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderTopRightRadius: RADIUS_TR,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
            },
          ]}
        />

        {/* 6) Contenido sin blur */}
        <View style={sheetStylesLeft.content}>{children}</View>
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

/** Estilos generales */
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

/** Estilos del sheet invertido (apoyado a la IZQUIERDA) */
const sheetStylesLeft = StyleSheet.create({
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
    borderTopLeftRadius: 0,
    borderTopRightRadius: RADIUS_TR, // curva en la esquina superior derecha
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
