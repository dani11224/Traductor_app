// app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState, ActivityIndicator, View, Text } from 'react-native';
import { supabase } from '../src/lib/supabase';           // ajusta si tu cliente está en src (ver nota abajo)
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { PageTurnProvider } from '../src/components/transitions/PageTurnOverlay';

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments(); // p. ej.: ['(Auth)','Login'] o ['main','(Tabs)','library']
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(Auth)';
    const inTabsGroup = segments[0] === '(Tabs)';
    const isRoot = !segments[0];

    console.log('[AuthGate]', {
      loading,
      inAuthGroup,
      userPresent: !!user,
      segments,
    });

    if (!user && !inAuthGroup) {
      router.replace('/(Auth)/Login');          // archivo: app/(Auth)/Login.tsx
    } else if (user && (inAuthGroup || isRoot)) {
      // Usuario autenticado saliendo de (Auth) o en raíz -> lleva a Tabs/Library
      router.replace('/(Tabs)/library');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex:1, backgroundColor:'#0E1218', alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator size="large" color="#7ADCC4" />
        <Text style={{ color:'#A6B3C2', marginTop:8 }}>Loading…</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    supabase.auth.startAutoRefresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  return (
    <PageTurnProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </PageTurnProvider>
  );
}
