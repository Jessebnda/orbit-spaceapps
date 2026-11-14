import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Touchable with immediate pressed feedback (instant tint, no scale or bounce). Haptic only on commit. */
export function Press({ label, onPress, onLongPress, delayLongPress, disabled, haptic = true, style, children }: {
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      delayLongPress={delayLongPress}
      onPress={() => {
        if (haptic) void Haptics.selectionAsync();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.6 }, disabled && { opacity: 0.4 }]}
    >
      {children}
    </Pressable>
  );
}
