// app/theme/theme.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  card: string;
  primary: string;
  accent: string;
  onPrimary: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  highlight: string;
};

// 🎨 DARK (el que ya venimos usando)
export const darkPalette: Palette = {
  bg: '#0E1218',
  surface: '#121723',
  card: '#161B2A',
  primary: '#A5B4FC',
  accent: '#7ADCC4',
  onPrimary: '#0B0F14',
  text: '#E6EDF6',
  textMuted: '#A6B3C2',
  border: '#263243',
  success: '#79E2B5',
  warning: '#FFD58A',
  error: '#FF9CA1',
  highlight: '#FDE68A22',
};

// 🎨 LIGHT (parecido a tus mockups claros)
export const lightPalette: Palette = {
  bg: '#F7F8FB',
  surface: '#FFFFFF',
  card: '#F2F4F8',
  primary: '#8EA8FF',
  accent: '#86E3D1',
  onPrimary: '#0B0F14',
  text: '#0F172A',
  textMuted: '#475569',
  border: '#E5EAF1',
  success: '#5ED39B',
  warning: '#F6C76B',
  error: '#F28B82',
  highlight: '#FEF3C7',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: Palette;
  toggleTheme: () => void;
  setIsDark: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(
    systemScheme === 'dark' || true, // por defecto dark
  );

  const colors = isDark ? darkPalette : lightPalette;

  const value = useMemo(
    () => ({
      isDark,
      colors,
      toggleTheme: () => setIsDark((prev) => !prev),
      setIsDark,
    }),
    [isDark, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
