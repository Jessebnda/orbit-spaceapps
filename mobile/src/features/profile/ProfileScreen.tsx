import { ScrollView, Text, View } from 'react-native';
import { ACHIEVEMENTS, anomalyText } from '@orbit/shared';
import { useNameOf, useStore } from '../../store/store';
import { dayKey } from '../../domain/derive';
import { color, figureFont, font } from '../../theme';
import { Bars, lastDays } from '../../components/ui/Bars';
import { Card, Section } from '../../components/ui/FormSection';
import { FeedRow } from '../../components/ui/FeedRow';
import { Ring } from '../../components/ui/Ring';
import { FormSection } from '../../components/ui/FormSection';
import { useNavigation } from '@react-navigation/native';
import { AchievementsGrid } from './AchievementsGrid';
import { ExplorationLog } from './ExplorationLog';
import { CrewAlbum } from './CrewAlbum';
import { InsightCard } from './InsightCard';

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Yo: identidad con nivel, semana real, aspectos destacados, logros, exploraciones y comunicación. Ajustes = push desde el engranaje. */
export function ProfileScreen() {
  const nav = useNavigation<{ navigate: (n: string) => void }>();
  const { profile, unlocked, days, self } = useStore();
  const nameOf = useNameOf();
  const xp = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).reduce((s, a) => s + a.xp, 0);
  const level = Math.floor(xp / 500) + 1;
  const week = lastDays(7, Date.now(), dayKey);
  const today = days[dayKey(Date.now())] ?? {};
  const act = week.map((d) => days[d.key]?.activity);
  const weekAct = act.reduce<number>((s, v) => s + (v ?? 0), 0);
  const weekPet = week.reduce((s, d) => s + (days[d.key]?.petSec ?? 0), 0) / 60;
  const weekGame = week.reduce((s, d) => s + (days[d.key]?.gameSec ?? 0), 0) / 60;
  const anomalies = self?.comms.anomalies ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: 16, gap: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={font('section', color.muted)}>{initials(profile.name) || '·'}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={font('title')} numberOfLines={1}>{profile.name}</Text>
            <Text style={font('body', color.muted)} numberOfLines={1}>{profile.role} · {profile.crewId}</Text>
          </View>
          <View accessible accessibilityLabel={`Nivel ${level}, ${xp} XP`} style={{ alignItems: 'center', gap: 4 }}>
            <Ring size={56} stroke={6} value={(xp % 500) / 500} tint={color.accent}><Text style={figureFont('button')}>{level}</Text></Ring>
            <Text style={font('small', color.muted)}>Nivel</Text>
          </View>
        </View>

        <Section title="Esta semana">
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { l: 'Actividad', v: Math.round(weekAct), u: 'min', p: weekAct / 840 },
                { l: 'Con Orbi', v: Math.round(weekPet), u: 'min', p: weekPet / 60 },
                { l: 'Juego', v: Math.round(weekGame), u: 'min', p: weekGame / 60 },
              ].map((r) => (
                <View key={r.l} style={{ alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${r.l}, ${r.v} minutos esta semana`}>
                  <Ring size={64} stroke={7} value={r.p} tint={color.accent}><Text style={figureFont('button')}>{r.v}</Text></Ring>
                  <Text style={font('small', color.muted)}>{r.l} · {r.u}</Text>
                </View>
              ))}
            </View>
            <Text style={font('caption', color.muted)}>Actividad por día · min</Text>
            <Bars values={act} labels={week.map((d) => d.label)} />
          </Card>
        </Section>

        <InsightCard />

        <Section title={`Logros · ${unlocked.length} de ${ACHIEVEMENTS.length}`} action="Ver todo" onAction={() => nav.navigate('Logros')}>
          <AchievementsGrid limit={3} />
        </Section>

        <ExplorationLog />

        <CrewAlbum />

        <Section title="Comunicación">
          <FormSection>
            <FeedRow icon="bubble.left.fill" iconColor={color.accent} title="Hablaste hoy" trailing={<Text style={figureFont('body', color.muted)}>{self ? `${self.comms.todayMin} min` : '—'}</Text>} last={!anomalies.length} />
            {anomalies.map((a, i) => <FeedRow key={`${a.kind}${i}`} title={anomalyText(a, nameOf)} badge="Atención" badgeTone="watch" last={i === anomalies.length - 1} />)}
          </FormSection>
        </Section>
      </View>
    </ScrollView>
  );
}
