import { Text, View } from 'react-native';
import { color, font, radius } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Press } from './Press';

/** ContentUnavailableView: icono 44, título, descripción y acción opcional. */
export function EmptyState({ icon, title, hint, action, onAction }: { icon: IconName; title: string; hint?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 }}>
      <View style={{ paddingBottom: 4 }}><Icon name={icon} size={44} color={color.muted} /></View>
      <Text style={{ ...font('title'), textAlign: 'center' }}>{title}</Text>
      {hint ? <Text style={{ ...font('body', color.muted), fontSize: 15, textAlign: 'center', maxWidth: 280 }}>{hint}</Text> : null}
      {action ? (
        <Press label={action} onPress={onAction} style={{ marginTop: 8, height: 44, paddingHorizontal: 20, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={font('button', color.onAccent)}>{action}</Text>
        </Press>
      ) : null}
    </View>
  );
}
