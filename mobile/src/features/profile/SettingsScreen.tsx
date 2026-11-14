import { Text, TextInput, View } from 'react-native';
import { bleAvailable } from '../../services/sensors/ble';
import { downloadModel } from '../../services/petBrain';
import { useStore, type DataSource } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { Press } from '../../components/ui/Press';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { SettingsGroup, SettingsRow } from '../../components/ui/SettingsGroup';
import { StatusMark } from '../../components/ui/StatusMark';

const field = { backgroundColor: color.raised, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm, color: color.text, fontSize: 16 };
const BRAIN: Record<string, string> = { none: 'No descargado', downloading: 'Descargando', ready: 'Listo en el teléfono', error: 'Error de descarga' };

/** Ajustes: tripulante, nave, fuente de datos y cerebro de la mascota. */
export function SettingsScreen() {
  const profile = useStore((s) => s.profile);
  const hubUrl = useStore((s) => s.hubUrl);
  const dataSource = useStore((s) => s.dataSource);
  const brain = useStore((s) => s.brain);
  const hubOnline = useStore((s) => s.hubOnline);
  const { setProfile, setHubUrl, setDataSource } = useStore.getState();

  return (
    <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
      <SettingsGroup title="Tripulante">
        <SettingsRow>
          <Text style={font('caption', color.muted)}>Identificador (crewId)</Text>
          <TextInput value={profile.crewId} onChangeText={(v) => setProfile({ crewId: v.trim() })} autoCapitalize="none" style={field} />
        </SettingsRow>
        <SettingsRow>
          <Text style={font('caption', color.muted)}>Nombre</Text>
          <TextInput value={profile.name} onChangeText={(v) => setProfile({ name: v })} style={field} />
        </SettingsRow>
        <SettingsRow last>
          <Text style={font('caption', color.muted)}>Rol</Text>
          <TextInput value={profile.role} onChangeText={(v) => setProfile({ role: v })} style={field} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Nave">
        <SettingsRow last>
          <Text style={font('caption', color.muted)}>URL del hub</Text>
          <TextInput value={hubUrl} onChangeText={setHubUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={field} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Fuente de datos">
        <SettingsRow last>
          <SegmentedTabs<DataSource>
            tabs={[{ key: 'sim', label: 'Simulador' }, { key: 'ble', label: bleAvailable() ? 'Sensores BLE' : 'BLE (no disponible)' }]}
            active={dataSource}
            onChange={setDataSource}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Mascota">
        <SettingsRow last>
          <StatusMark label={BRAIN[brain.status]} tone={brain.status === 'error' ? 'critical' : brain.status === 'ready' ? 'ok' : 'muted'} />
          <Press label="Descargar cerebro de la mascota" onPress={() => void downloadModel()} disabled={brain.status === 'downloading'} style={{ backgroundColor: color.raised, borderRadius: radius.sm, padding: space.md, alignItems: 'center' }}>
            <Text style={font('button')}>{brain.status === 'downloading' ? `Descargando ${Math.round(brain.progress * 100)}%` : 'Descargar cerebro'}</Text>
          </Press>
        </SettingsRow>
      </SettingsGroup>
      <Text style={font('small', color.faint)}>Hub: {hubOnline ? 'conectado' : 'sin conexión'}</Text>
    </View>
  );
}
