import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';

/** UISegmentedControl nativo con las mismas props de siempre. Háptico de selección solo al cambiar de segmento. */
export function SegmentedTabs<K extends string>({ tabs, active, onChange }: {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  const index = Math.max(0, tabs.findIndex((t) => t.key === active));
  return (
    <SegmentedControl
      appearance="dark"
      values={tabs.map((t) => t.label)}
      selectedIndex={index}
      onChange={(e) => {
        const next = tabs[e.nativeEvent.selectedSegmentIndex];
        if (!next || next.key === active) return;
        void Haptics.selectionAsync();
        onChange(next.key);
      }}
    />
  );
}
