import { useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ACHIEVEMENTS, anomalyText, formatMetric, type CrewSnapshot } from '@orbit/shared';
import { useStore } from '../../store/store';
import { color, font, space } from '../../theme';
import { FeedRow } from '../../components/ui/FeedRow';
import { FormSection } from '../../components/ui/FormSection';
import { Press } from '../../components/ui/Press';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { AchievementsGrid } from './AchievementsGrid';
import { ExplorationLog } from './ExplorationLog';
import { InsightCard } from './InsightCard';
import { SettingsScreen } from './SettingsScreen';

type Part = 'perfil' | 'ajustes';

/** Yo: logros, cifras, exploraciones, análisis y ajustes. */
export function ProfileScreen() {
  const { profile, unlocked, stats, self, metrics } = useStore();
  const { width } = useWindowDimensions();
  const [part, setPart] = useState<Part>('perfil');
  const xp = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).reduce((s, a) => s + a.xp, 0);
  const snap: CrewSnapshot | null = self;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space['2xl'] }}>
      <ScreenHeader kicker={profile.role} title={profile.name} subtitle={`${profile.crewId} · ${xp} XP`} />
      <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
        <SegmentedTabs tabs={[{ key: 'perfil', label: 'Perfil' }, { key: 'ajustes', label: 'Ajustes' }]} active={part} onChange={setPart} />
        {part === 'ajustes' ? (
          <SettingsScreen />
        ) : (
          <>
            <FormSection title="Logros">
              <AchievementsGrid cell={(width - space.lg * 2 - space.sm) / 2} />
            </FormSection>

            <FormSection title="Esta semana">
              <FeedRow title="Juego" trailing={<Text style={font('body')}>{Math.round(stats.gameSec / 60)} min</Text>} />
              <FeedRow title="Con la mascota" trailing={<Text style={font('body')}>{Math.round(stats.petSec / 60)} min</Text>} />
              <FeedRow title="Ejercicio hoy" trailing={<Text style={font('body')}>{formatMetric('activity', metrics.activity)}</Text>} />
              <FeedRow title="Hablaste hoy" trailing={<Text style={font('body')}>{snap ? `${snap.comms.todayMin} min` : '—'}</Text>} />
              {(snap?.comms.anomalies ?? []).map((a, i, arr) => (
                <FeedRow key={`${a.kind}${i}`} title={anomalyText(a, (id) => id)} last={i === arr.length - 1} />
              ))}
            </FormSection>

            <InsightCard />
            <ExplorationLog />
            <Press label="Abrir ajustes" onPress={() => setPart('ajustes')} style={{ padding: space.sm }}><Text style={font('body', color.accent)}>Ajustes</Text></Press>
          </>
        )}
      </View>
    </ScrollView>
  );
}
