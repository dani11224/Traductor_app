import React from 'react';
import { Stack } from 'expo-router';

export default function ViewerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // usamos header propio dentro del viewer
        contentStyle: { backgroundColor: '#0E1218' },
      }}
    />
  );
}
