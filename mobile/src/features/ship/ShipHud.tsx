import { Text, View } from 'react-native';
import { METRIC_META, formatMetric, statusOf, worstStatus, type MetricKey } from '@orbit/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/store';
import { color, font, radius, space, STATUS_LABEL } from '../../theme';
import { Creature } from '../pet/Creature';
import { petMood } from '../../domain/derive';
import { SosButton } from '../../components/ui/SosButton';
import { StatusMark } from '../../components/ui/StatusMark';

const HUD: MetricKey[] = ['hr', 'spo2', 'bpSys', 'resp', 'temp'];
const LINKS = [
  { key: 'hub', label: 'Nave' },
  { key: 'band', label: 'Banda' },
  { key: 'sleeve', label: 'Manga' },
  { key: 'vest', label: 'Chaleco' },
] as const;

/** Modo nave (horizontal, en la manga): vitales a la distancia del brazo, protocolo activo y SOS. */
export function ShipHud() {
  const { metrics, devices, hubOnline, protocols, done, checked, checkins } = useStore();
  const insets = useSafeAreaInsets();
  const overall = worstStatus(metrics);
  const current = protocols.find((p) => !done.includes(p.id));
  const idx = current ? checked[current.id] ?? [] : [];
  const nextStep = current ? current.steps.find((_, i) => !idx.includes(i)) : undefined;
  const connected = { hub: hubOnline, band: !!devices.band, sleeve: !!devices.sleeve, vest: !!devices.vest };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.sm, paddingLeft: insets.left + space.lg, paddingRight: insets.right + space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <StatusMark label={STATUS_LABEL[overall]} tone={overall} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          {LINKS.map((l) => (
            <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connected[l.key] ? color.status.ok : color.faint }} />
              <Text style={font('small', connected[l.key] ? color.text : color.faint)}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md, flex: 1 }}>
        <View style={{ flex: 3, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignContent: 'space-between' }}>
          {HUD.map((k) => (
            <View key={k} style={{ width: '32%', gap: space.xs }}>
              <Text style={font('caption', color.muted)}>{METRIC_META[k].label}</Text>
              <Text style={font('hud', color.text)} numberOfLines={1}>{metrics[k] == null ? '—' : metrics[k]!.toFixed(METRIC_META[k].decimals)}</Text>
              <StatusMark label={STATUS_LABEL[statusOf(k, metrics[k])]} tone={statusOf(k, metrics[k])} />
            </View>
          ))}
        </View>

        <View style={{ flex: 2, gap: space.sm }}>
          <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs, flex: 1 }}>
            <Text style={font('caption', color.muted)}>{current ? current.title : 'Sin protocolo activo'}</Text>
            <Text style={font('section')} numberOfLines={2}>{nextStep ?? (current ? 'Protocolo completo' : 'La nave no ha enviado nada')}</Text>
            <Text style={font('small', color.faint)}>{checkins.length ? 'Check-in de hoy registrado' : 'Falta el check-in de hoy'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'stretch' }}>
            <Creature size={64} mood={petMood(metrics, checkins[checkins.length - 1])} />
            <SosButton large />
          </View>
        </View>
      </View>
    </View>
  );
}
