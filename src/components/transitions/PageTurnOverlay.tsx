// src/components/transitions/PageTurnOverlay.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Direction = 'left' | 'right';

type Ctx = {
  turnTo: (navAction: () => void, dir?: Direction) => void;
  progress: SharedValue<number>;          // 👈 expuesto para que las pantallas lo lean
};

const PageTurnContext = createContext<Ctx | null>(null);

export function usePageTurn() {
  const ctx = useContext(PageTurnContext);
  if (!ctx) throw new Error('usePageTurn must be used inside <PageTurnProvider>');
  return ctx;
}

/** ⛔ Oculta (opacity 0) y bloquea toques mientras haya animación */
export function HideWhileTurning({ children }: { children: React.ReactNode }) {
  const { progress } = usePageTurn();
  const [pe, setPe] = useState<'auto' | 'none'>('auto');

  // Cambia pointerEvents cuando inicia/termina
  useAnimatedReaction(
    () => progress.value,
    (v) => runOnJS(setPe)(v > 0.001 ? 'none' : 'auto')
  );

  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0.001 ? 0 : 1, // totalmente oculto durante el flip
  }));

  return (
    <Animated.View pointerEvents={pe} style={style}>
      {children}
    </Animated.View>
  );
}

export function PageTurnProvider({ children }: { children: React.ReactNode }) {
  const { width: W, height: H } = useWindowDimensions();
  const progress = useSharedValue(0);             // 0 → 1
  const dir = useSharedValue<Direction>('right'); // dirección en UI thread

  // Evita el error de “Text strings…” si hay texto suelto en children
  const safeChildren = useMemo(
    () =>
      React.Children.map(children, (child: any) =>
        typeof child === 'string' || typeof child === 'number' ? <Text>{child}</Text> : child
      ),
    [children]
  );

    const pageStyle = useAnimatedStyle(() => {
        const deg = interpolate(progress.value, [0, 1], [0, 180], Extrapolation.CLAMP);

        // Giro desde BORDE IZQUIERDO
        const leftTurn = [
            { perspective: 1000 },
            { translateX: W / 2 },        // mueve el borde izq al centro
            { rotateY: `${-deg}deg` },    // rota hacia “afuera” a la izquierda
            { translateX: -W / 2 },       // regresa
        ] as const;

        // Giro desde BORDE DERECHO
        const rightTurn = [
            { perspective: 1000 },
            { translateX: -W / 2 },       // mueve el borde der al centro
            { rotateY: `${deg}deg` },     // rota hacia “afuera” a la derecha
            { translateX: W / 2 },        // regresa
        ] as const;

        return {
            transform: dir.value === 'left' ? leftTurn : rightTurn,
            shadowColor: '#000',
            shadowOpacity: interpolate(progress.value, [0, 1], [0.1, 0.25]),
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
        };
    }, [W]);



  const shade = useAnimatedStyle(() => {
    const a = interpolate(progress.value, [0, 0.5, 1], [0, 0.08, 0.18]);
    return { backgroundColor: `rgba(0,0,0,${a})` };
  });

  const turnTo: Ctx['turnTo'] = (navAction, direction = 'right') => {
    dir.value = direction;
    progress.value = 0;
    progress.value = withTiming(0.5, { duration: 280 }, (finished) => {
      if (finished) runOnJS(navAction)();
      progress.value = withTiming(1, { duration: 280 }, () => {
        progress.value = 0; // reset
      });
    });
  };

  return (
    <PageTurnContext.Provider value={{ turnTo, progress }}>
      <View style={{ flex: 1 }} collapsable={false}>
        {safeChildren}

        {/* Overlay de página */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: W,
                height: H,
                backgroundColor: 'transparent',
              },
              pageStyle,
            ]}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[StyleSheet.absoluteFill, shade]} />
          </Animated.View>
        </Animated.View>
      </View>
    </PageTurnContext.Provider>
  );
}
