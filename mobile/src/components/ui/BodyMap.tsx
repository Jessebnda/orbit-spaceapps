import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '../../theme';

export type BodyZone = 'head' | 'chest' | 'arm' | 'legs' | 'stomach';

/** Figura plana con cinco zonas tocables. La lista de abajo (en la feature) es el mismo control accesible. */
export function BodyMap({ selected, onSelect, width = 150 }: { selected: BodyZone | null; onSelect: (z: BodyZone) => void; width?: number }) {
  const fill = (z: BodyZone) => (selected === z ? color.accent : color.raised);
  return (
    <Svg width={width} height={width * 2} viewBox="0 0 120 240">
      <Circle cx={60} cy={22} r={16} fill={fill('head')} onPress={() => onSelect('head')} />
      <Path d="M40 50 H80 V92 H40 Z" fill={fill('chest')} onPress={() => onSelect('chest')} />
      <Path d="M42 94 H78 V120 H42 Z" fill={fill('stomach')} onPress={() => onSelect('stomach')} />
      <Path d="M36 52 L22 120 L30 122 L44 58 Z M84 52 L98 120 L90 122 L76 58 Z" fill={fill('arm')} onPress={() => onSelect('arm')} />
      <Path d="M42 122 L38 232 L54 232 L60 124 Z M78 122 L82 232 L66 232 L60 124 Z" fill={fill('legs')} onPress={() => onSelect('legs')} />
    </Svg>
  );
}
