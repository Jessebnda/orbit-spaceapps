import { useState } from 'react';
import { Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ACHIEVEMENTS, BADGE_STYLE, CATEGORY_LABEL, type AchievementId, type BadgeCategory } from '@orbit/shared';
import { useStore } from '../../store/store';
import { color, figureFont, font, radius } from '../../theme';
import { achievementProgress } from '../../domain/achievements';
import { Medal } from '../../components/ui/Medal';
import { Press } from '../../components/ui/Press';

const tier = (id: AchievementId) => id === 'cpr_trained' ? 'Oro' : 'Bronce';
export function AchievementsGrid({ cell, category, limit }: { cell?: number; category?: BadgeCategory; limit?: number }) {
  const { width } = useWindowDimensions();
  const size = cell ?? (width - 56) / 3;
  const state = useStore();
  const [selected, setSelected] = useState<AchievementId | null>(null);
  const input = { ...state, now: Date.now() };
  const items = ACHIEVEMENTS.filter(a => !category || BADGE_STYLE[a.id].category === category).slice(0, limit);
  const current = ACHIEVEMENTS.find(a => a.id === selected);
  const progress = (id: AchievementId) => state.unlocked.includes(id) ? BADGE_STYLE[id].target : achievementProgress(id, input);
  return <>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map(a => {
        const on = state.unlocked.includes(a.id), meta = BADGE_STYLE[a.id], value = progress(a.id);
        return <Press key={a.id} card label={`${a.title}, ${on ? `${tier(a.id)}, conseguido` : `${Math.round(value)} de ${meta.target} ${meta.unit}`}`} onPress={() => setSelected(a.id)} style={{ width: size, alignItems: 'center', gap: 5, paddingVertical: 8 }}>
          <Medal id={a.id} size={Math.min(88, size)} earned={on} progress={value / meta.target} />
          <Text style={[font('caption'), { textAlign: 'center' }]}>{a.title}</Text>
          <Text style={[font('small', color.muted), { textAlign: 'center' }]}>{on ? tier(a.id) : `${Math.min(value, meta.target).toFixed(value % 1 ? 1 : 0)} / ${meta.target} ${meta.unit}`}</Text>
        </Press>;
      })}
    </View>
    <Modal visible={!!current} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: 24, paddingTop: 32, gap: 20, alignItems: 'center' }}>
        <Press label="Cerrar detalle de logro" onPress={() => setSelected(null)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}><Text style={font('button', color.accentText)}>Listo</Text></Press>
        {current && <>
          <Medal id={current.id} size={200} earned={state.unlocked.includes(current.id)} progress={progress(current.id) / BADGE_STYLE[current.id].target} />
          <Text style={font('title')}>{current.title}</Text>
          <Text style={font('body', color.muted)}>{CATEGORY_LABEL[BADGE_STYLE[current.id].category]} · {state.unlocked.includes(current.id) ? `${tier(current.id)} conseguido` : 'En progreso'}</Text>
          <Text style={[font('body'), { textAlign: 'center' }]}>{current.desc}</Text>
          <View style={{ width: '100%', gap: 10, padding: 20, backgroundColor: color.surface, borderRadius: radius.card }}>
            <Text style={figureFont('figure')}>{Math.min(progress(current.id), BADGE_STYLE[current.id].target).toFixed(current.id === 'explore_10km' ? 1 : 0)} <Text style={font('body', color.muted)}>/ {BADGE_STYLE[current.id].target} {BADGE_STYLE[current.id].unit}</Text></Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: color.raised, overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.min(1, progress(current.id) / BADGE_STYLE[current.id].target) * 100}%`, backgroundColor: color.accent }} /></View>
            <Text style={font('small', color.muted)}>{current.xp} XP · {state.unlocked.includes(current.id) ? 'Ya forma parte de tu misión.' : 'Tu avance se calcula a partir de tus registros.'}</Text>
          </View>
        </>}
      </ScrollView>
    </Modal>
  </>;
}
export function AllAchievementsScreen() {
  const unlocked = useStore(s => s.unlocked);
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 24 }}>
    <Text style={figureFont('display')}>{unlocked.length} <Text style={font('body', color.muted)}>de {ACHIEVEMENTS.length} parches</Text></Text>
    <Text style={font('body', color.muted)}>Cada hábito deja su huella en la misión.</Text>
    {(Object.keys(CATEGORY_LABEL) as BadgeCategory[]).map(c => <View key={c} style={{ gap: 8 }}><Text style={font('section')}>{CATEGORY_LABEL[c]}</Text><AchievementsGrid category={c} /></View>)}
  </ScrollView>;
}
