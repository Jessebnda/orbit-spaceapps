import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Text } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/store';
import { color, font, radius } from '../../theme';
import { Icon } from './Icon';

/** Isla de confirmación: cápsula centrada, se cierra sola a los 2.4 s (cancela el temporizador si llega otra). */
export function Toast() {
  const text = useStore((s) => s.toast);
  return text ? <ToastBody key={text} text={text} /> : null;
}

function ToastBody({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(-12);
  const o = useSharedValue(0);
  useEffect(() => {
    y.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
    o.set(withSpring(1, { duration: 300, dampingRatio: 1 }));
    void AccessibilityInfo.announceForAccessibility(text);
    const id = setTimeout(() => useStore.getState().showToast(null), 2400);
    return () => clearTimeout(id);
  }, [text, y, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateY: y.get() }] }));
  return (
    <Animated.View pointerEvents="none" exiting={FadeOut.duration(150)} style={[{ position: 'absolute', top: insets.top + 4, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }, style]}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 0} tint="systemChromeMaterialDark" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: radius.full, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.raised + 'CC' }}>
        <Icon name="checkmark.circle.fill" size={17} color={color.status.ok} />
        <Text style={font('button')}>{text}</Text>
      </BlurView>
    </Animated.View>
  );
}
