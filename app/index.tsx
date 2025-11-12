import { useEffect } from 'react';
import { View, Text } from 'react-native';

// Minimal placeholder route for Expo Router.
// AuthGate in src/_layout.tsx will immediately redirect based on auth state.
export default function Index() {
  useEffect(() => {

  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1218' }}>
      <Text style={{ color: '#A6B3C2' }}>Index route loaded… waiting for redirect</Text>
    </View>
  );
}
