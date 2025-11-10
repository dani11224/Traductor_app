import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
} from "react-native";

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

export default function Register({ navigation }: any) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");

  const s = styles(colors);

  const handleSignUp = () => {
    console.log({ firstName, lastName, email, password, confirm });
  };

  return (
    // Fondo transparente para que se vea el background del _layout
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <StatusBar barStyle="light-content" />

      {/* HEADER (sin cutout; la curva la hace el sheet) */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sign Up</Text>
      </View>

      {/* SHEET full-width con curva superior izquierda pronunciada */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.sheet}>
          {/* Campos (1 columna, angostos, centrados) */}
          <View style={s.formTop}>
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
                placeholder="vijaybhuva90@gmail.com"
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
          </View>

          {/* CTA fijo al fondo (mismo ancho angosto) */}
          <View style={s.formBottom}>
            <View style={s.formContainer}>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSignUp}>
                <Text style={s.primaryBtnText}>Sign Up</Text>
              </TouchableOpacity>
              <View style={s.footerRow}>
                <Text style={s.footerText}>Already have any account? </Text>
                <TouchableOpacity onPress={() => navigation?.navigate?.("Login")}>
                  <Text style={s.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

/** Estilos */
const styles = (c: Palette) =>
  StyleSheet.create({
    header: {
      height: HEADER_H,
      backgroundColor: c.surface,
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

    sheet: {
      position: "absolute",
      top: HEADER_H - 8,
      right: 0,
      bottom: 0,
      left: 0, // full-width
      backgroundColor: c.surface,
      borderTopLeftRadius: RADIUS_TL,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      overflow: "hidden",     // nada se sale del contenedor
      paddingTop: TOP_PAD,    // baja el contenido por la curva
      paddingBottom: 12,
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
      zIndex: 1,
    },

    /** Contenedor angosto y centrado para inputs y botón */
    formContainer: {
      width: CONTENT_W,
      alignSelf: "center",
    },

    formTop: { paddingHorizontal: 0 },
    formBottom: { paddingHorizontal: 0 },

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
    },
    footerText: { color: c.textMuted },
    footerLink: { color: c.text, fontWeight: "700" },
  });
