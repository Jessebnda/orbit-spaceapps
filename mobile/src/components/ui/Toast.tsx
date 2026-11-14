import { Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, radius, space } from '../../theme';

/** Confirmación breve. Aparece con fade de 150 ms (movimiento sin propósito queda fuera). */
export function Toast({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={{ position: 'absolute', top: insets.top + space.sm, left: space.lg, right: space.lg, backgroundColor: color.raised, borderRadius: radius.md, padding: space.md }}>
      <Text style={font('small')}>{text}</Text>
    </Animated.View>
  );
}
