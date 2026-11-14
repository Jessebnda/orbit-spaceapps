import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACHIEVEMENTS } from '@orbit/shared';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { Press } from '../../components/ui/Press';

/** Logros en cuadrícula sobria: desbloqueados en texto normal, bloqueados en gris con candado. */
export function AchievementsGrid({ cell }: { cell: number }) {
  const unlocked = useStore((s) => s.unlocked);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {ACHIEVEMENTS.map((a) => {
        const on = unlocked.includes(a.id);
        return (
          <Press key={a.id} label={`${a.title}, ${on ? 'desbloqueado' : 'bloqueado'}`} haptic={false} style={{ width: cell, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs }}>
            <Ionicons name={on ? 'checkmark-circle' : 'lock-closed-outline'} size={18} color={on ? color.accent : color.faint} />
            <Text style={font('small', on ? color.text : color.faint)} numberOfLines={1}>{a.title}</Text>
            <Text style={font('small', color.faint)} numberOfLines={2}>{a.desc}</Text>
            <Text style={font('small', on ? color.accent : color.faint)}>{a.xp} XP</Text>
          </Press>
        );
      })}
    </View>
  );
}
