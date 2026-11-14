import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

/** Figura Ionicons para cada SF Symbol que usa la app (Android). Añade el par aquí al usar un símbolo nuevo. */
export const ANDROID = {
  'heart.text.square': 'pulse-outline',
  'heart.text.square.fill': 'pulse',
  'square.and.pencil': 'create-outline',
  'pawprint': 'paw-outline',
  'pawprint.fill': 'paw',
  'list.bullet.clipboard': 'document-text-outline',
  'list.bullet.clipboard.fill': 'document-text',
  'gamecontroller': 'game-controller-outline',
  'gamecontroller.fill': 'game-controller',
  'person.crop.circle': 'person-circle-outline',
  'person.crop.circle.fill': 'person-circle',
  'gearshape': 'settings-outline',
  'exclamationmark.circle.fill': 'alert-circle',
  'checkmark.circle.fill': 'checkmark-circle',
  'checkmark.circle': 'checkmark-circle-outline',
  'checkmark': 'checkmark',
  'checkmark.seal': 'ribbon-outline',
  'lock.fill': 'lock-closed',
  'chevron.right': 'chevron-forward',
  'xmark.octagon.fill': 'close-circle',
  'xmark.circle.fill': 'close-circle',
  'exclamationmark.triangle.fill': 'warning',
  'circle.fill': 'ellipse',
  'circle': 'ellipse-outline',
  'cloud.rain': 'rainy-outline',
  'cloud.bolt': 'thunderstorm-outline',
  'sun.max': 'sunny-outline',
  'moon.stars': 'moon-outline',
  'bolt.fill': 'flash',
  'hand.thumbsdown': 'thumbs-down-outline',
  'minus.circle': 'remove-circle-outline',
  'hand.thumbsup': 'thumbs-up-outline',
  'face.smiling': 'happy-outline',
  'location': 'navigate-outline',
  'cross.case.fill': 'medkit',
  'figure.run': 'walk',
  'brain.head.profile': 'bulb-outline',
  'heart.text.clipboard': 'clipboard-outline',
  'figure.mind.and.body': 'body-outline',
  'bubble.left.fill': 'chatbubble',
  'arrow.up': 'arrow-up',
  'pause.fill': 'pause',
  'play.fill': 'play',
  'wifi.slash': 'cloud-offline-outline',
  'antenna.radiowaves.left.and.right': 'wifi-outline',
  'moon.zzz.fill': 'moon',
  'fork.knife': 'restaurant',
  'drop.fill': 'water',
  'heart.fill': 'heart',
  'list.bullet': 'list',
} as const satisfies Record<string, ComponentProps<typeof Ionicons>['name']>;

export type IconName = keyof typeof ANDROID;

/** SF Symbol en iOS (hierarchical por defecto); en Android, la figura Ionicons equivalente. */
export function Icon({ name, size, color, type = 'hierarchical', weight = 'regular' }: {
  name: IconName;
  size: number;
  color: string;
  type?: 'hierarchical' | 'monochrome';
  weight?: SymbolWeight;
}) {
  if (Platform.OS === 'ios') return <SymbolView name={name} size={size} tintColor={color} type={type} weight={weight} />;
  return <Ionicons name={ANDROID[name]} size={size} color={color} />;
}
