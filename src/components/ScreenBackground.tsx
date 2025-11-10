import React from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  useColorScheme,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  children: React.ReactNode;
  blur?: number;
  lightSrc: ImageSourcePropType; // require(...) desde el layout
  darkSrc: ImageSourcePropType;  // require(...) desde el layout
};

export default function ScreenBackground({
  children,
  blur = 0,
  lightSrc,
  darkSrc,
}: Props) {
  const scheme = useColorScheme();
  const src = scheme === "dark" ? darkSrc : lightSrc;

  return (
    <View style={styles.root}>
      <ImageBackground
        source={src}
        resizeMode="cover"
        blurRadius={blur}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={
          scheme === "dark"
            ? ["rgba(14,18,24,0.30)", "rgba(14,18,24,0.65)"]
            : ["rgba(247,248,251,0.45)", "rgba(247,248,251,0.80)"]
        }
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  content: { flex: 1 },
});
