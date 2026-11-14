import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color } from '../../theme';

export type HapticKind = 'none' | 'light' | 'success' | 'tick';
const fire = (h: HapticKind) => {
  if (h === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (h === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (h === 'tick') void Haptics.selectionAsync();
};

/** Touchable. `row`: se tiñe de `raised`. `card`: escala 0.98. Por defecto botón: opacidad + escala 0.98. Háptico solo si se pide (navegar = ninguno). */
export function Press({ label, hint, onPress, onLongPress, delayLongPress, disabled, haptic = 'none', row = false, card = false, style, children }: {
  label: string;
  hint?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  haptic?: HapticKind;
  row?: boolean;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  // Parent layout belongs to the touchable, not its animated child. In particular,
  // flex/absolute positioning on the child collapses buttons in rows and scenes.
  const flat = StyleSheet.flatten(style) ?? {};
  const layout: ViewStyle = {};
  const appearance: ViewStyle = {};
  const layoutKeys = new Set(['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'position', 'top', 'bottom', 'left', 'right', 'start', 'end', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginStart', 'marginEnd', 'marginHorizontal', 'marginVertical', 'zIndex']);
  for (const [key, value] of Object.entries(flat)) {
    Object.assign(layoutKeys.has(key) ? layout : appearance, { [key]: value });
  }
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <Pressable
      style={layout}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      pressRetentionOffset={12}
      delayLongPress={delayLongPress}
      onPressIn={() => { if (!row) s.set(withTiming(0.98, { duration: 120 })); }}
      onPressOut={() => s.set(withTiming(1, { duration: 120 }))}
      onPress={() => { fire(haptic); onPress?.(); }}
      onLongPress={onLongPress}
    >
      {({ pressed }) => (
        <Animated.View style={[{ flexGrow: 1, alignSelf: 'stretch' }, appearance, anim, pressed && (row ? { backgroundColor: color.raised } : card ? null : { opacity: 0.7 }), disabled && { opacity: 0.4 }]}>
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}
