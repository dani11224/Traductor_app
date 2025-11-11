import 'react-native-reanimated';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from './constants/Colors';
import { Navigation } from './navigation';
import { PageTurnProvider } from './components/transitions/PageTurnOverlay'; // 👈

SplashScreen.preventAutoHideAsync();

export default function App() { // 👈 export default
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('./assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) return null;

  const theme =
    colorScheme === 'dark'
      ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: Colors[colorScheme ?? 'light'].tint } }
      : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: Colors[colorScheme ?? 'light'].tint } };

  return (
    <PageTurnProvider> {/* 👈 habilita usePageTurn() en toda la app */}
      <Navigation
        theme={theme}
        linking={{
          enabled: true,
          prefixes: ['helloworld://'],
        }}
        onReady={() => {
          SplashScreen.hideAsync();
        }}
      />
    </PageTurnProvider>
  );
}
