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

  console.log('Image source:', src);
  console.log('Color scheme:', scheme);

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
            ? ["rgba(14,18,24,0.15)", "rgba(14,18,24,0.40)"]
            : ["rgba(247,248,251,0.15)", "rgba(247,248,251,0.30)"]
        }
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "transparent",
    position: 'relative'
  },
  content: { 
    flex: 1,
    zIndex: 1
  },
});
