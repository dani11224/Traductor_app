import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Slot } from 'expo-router';
import { ThemeProvider, useTheme } from '../theme/theme';
import { useMemo } from 'react';

export default function TabsLayout() {
  const { colors } = useTheme();
  //const s = useMemo(() => styles(colors), [colors]);
  return (
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 0,},
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
      </Tabs>
  );
}
