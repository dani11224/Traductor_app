// app/(Auth)/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import ScreenBackground from "../components/ScreenBackground";

// Importa las imágenes aquí (rutas desde app/(Auth)/)
const LIGHT_BG = require("../assets/backgrounds/bg_clear.png");
const DARK_BG  = require("../assets/backgrounds/bg_dark.png");

export default function AuthLayout() {
  return (
    <ScreenBackground lightSrc={LIGHT_BG} darkSrc={DARK_BG} blur={0}>
      <Stack
        screenOptions={{
          headerShown: false,
          // MUY IMPORTANTE: que las pantallas no pinten fondo sólido encima
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </ScreenBackground>
  );
}
