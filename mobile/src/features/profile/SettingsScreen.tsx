import { ScrollView, Text, TextInput, View } from 'react-native';
import { bleAvailable } from '../../services/sensors/ble';
import { downloadModel } from '../../services/petBrain';
import { useStore, type DataSource } from '../../store/store';
import { alpha, color, font, radius } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { Press } from '../../components/ui/Press';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { LabeledRow, SettingsGroup, SettingsRow } from '../../components/ui/SettingsGroup';
import { StatusMark } from '../../components/ui/StatusMark';

const BRAIN: Record<string, string> = { none: 'No descargado', downloading: 'Descargando', ready: 'Listo en el teléfono', error: 'Error de descarga' };
const input = { ...font('body'), textAlign: 'right', alignSelf: 'stretch', paddingVertical: 12 } as const;

/** Ajustes (push desde Yo): grupos inset con filas etiqueta + campo. */
export function SettingsScreen() {
  const profile = useStore((s) => s.profile);
  const hubUrl = useStore((s) => s.hubUrl);
  const dataSource = useStore((s) => s.dataSource);
  const brain = useStore((s) => s.brain);
  const hubOnline = useStore((s) => s.hubOnline);
  const reduced = useReducedMotion();
  const { setProfile, setHubUrl, setDataSource } = useStore.getState();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <SettingsGroup title="Tripulante">
          <LabeledRow label="Nombre"><TextInput value={profile.name} onChangeText={(v) => setProfile({ name: v })} style={input} returnKeyType="done" /></LabeledRow>
          <LabeledRow label="Rol"><TextInput value={profile.role} onChangeText={(v) => setProfile({ role: v })} style={input} returnKeyType="done" /></LabeledRow>
          <LabeledRow label="Identificador" last><TextInput value={profile.crewId} onChangeText={(v) => setProfile({ crewId: v.trim() })} autoCapitalize="none" autoCorrect={false} style={{ ...input, color: color.faint }} returnKeyType="done" /></LabeledRow>
        </SettingsGroup>

        <SettingsGroup title="Nave">
          <LabeledRow label="Hub" last><TextInput value={hubUrl} onChangeText={setHubUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{ ...input, color: color.muted }} returnKeyType="done" /></LabeledRow>
        </SettingsGroup>

        <SettingsGroup title="Fuente de datos" hint="El simulador usa datos de ejemplo.">
          <SettingsRow last>
            <SegmentedTabs<DataSource>
              tabs={[{ key: 'sim', label: 'Simulador' }, { key: 'ble', label: bleAvailable() ? 'Sensores BLE' : 'BLE (no disponible)' }]}
              active={dataSource}
              onChange={setDataSource}
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Mascota" hint="Orbi funciona sin conexión cuando está descargado.">
          <SettingsRow last={brain.status !== 'none' && brain.status !== 'downloading' && brain.status !== 'error'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={font('body')}>Cerebro de Orbi</Text>
              <StatusMark label={BRAIN[brain.status]} tone={brain.status === 'error' ? 'critical' : brain.status === 'ready' ? 'ok' : 'muted'} />
            </View>
          </SettingsRow>
          {brain.status === 'downloading' ? (
            <SettingsRow last>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: color.raised, overflow: 'hidden' }}>
                <View style={{ height: 4, width: `${Math.round(brain.progress * 100)}%`, backgroundColor: color.accent }} />
              </View>
              <Text style={font('small', color.muted)}>{Math.round(brain.progress * 100)} %</Text>
            </SettingsRow>
          ) : brain.status !== 'ready' ? (
            <SettingsRow last>
              <Press label="Descargar cerebro de Orbi" onPress={() => void downloadModel()} style={{ height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: alpha(color.accent, 0.18), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={font('button', color.accentText)}>Descargar</Text>
              </Press>
            </SettingsRow>
          ) : null}
        </SettingsGroup>

        <SettingsGroup title="Accesibilidad">
          <LabeledRow label="Reducir movimiento" last><Text style={font('body', color.muted)}>{reduced ? 'Activado en el sistema' : 'Desactivado'}</Text></LabeledRow>
        </SettingsGroup>

        <Text style={{ ...font('small', color.faint), textAlign: 'center' }}>Orbit 0.1.0 · Hub {hubOnline ? 'conectado' : 'sin conexión'}</Text>
      </View>
    </ScrollView>
  );
}
