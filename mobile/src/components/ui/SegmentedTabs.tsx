import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { color, font, motion, radius, space } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { Press } from './Press';

/** Tabs segmentadas. Motion #1 del brief: la píldora desliza con spring; con Reducir movimiento salta. */
export function SegmentedTabs<K extends string>({ tabs, active, onChange }: {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const index = Math.max(0, tabs.findIndex((t) => t.key === active));
  const seg = tabs.length ? (width - space.xs * 2) / tabs.length : 0;
  const x = useSharedValue(0);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  useEffect(() => {
    if (seg <= 0) return;
    x.value = reduced ? index * seg : withSpring(index * seg, motion.spring);
  }, [index, seg, reduced, x]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: color.surface, borderRadius: radius.md, padding: space.xs }}
    >
      {seg > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: space.xs, bottom: space.xs, left: space.xs, width: seg, borderRadius: radius.sm, backgroundColor: color.raised }, pill]} />
      )}
      {tabs.map((t) => (
        <Press key={t.key} label={t.label} haptic={t.key !== active} onPress={() => onChange(t.key)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...font('caption', t.key === active ? color.text : color.muted) }} accessibilityState={{ selected: t.key === active }}>{t.label}</Text>
        </Press>
      ))}
    </View>
  );
}
