import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { METRIC_META, statusOf, worstStatus, type MetricKey, type Status } from '@orbit/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/store';
import { color, font, STATUS_LABEL } from '../../theme';
import { Creature } from '../pet/Creature';
import { petMood } from '../../domain/derive';
import { usePetChat } from '../pet/usePetChat';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { SosButton } from '../../components/ui/SosButton';
import { StatusMark } from '../../components/ui/StatusMark';

// Instrument, not dashboard (docs/product/review/ship-hud.md): no boxes, no decorative colour. Colour = state only.
const VITALS: { id: string; label: string; unit: string; keys: MetricKey[] }[] = [
  { id: 'hr', label: 'Ritmo', unit: 'lpm', keys: ['hr'] },
  { id: 'spo2', label: 'Oxígeno', unit: '%', keys: ['spo2'] },
  { id: 'bp', label: 'Presión', unit: 'mmHg', keys: ['bpSys', 'bpDia'] },
  { id: 'resp', label: 'Respiración', unit: 'rpm', keys: ['resp'] },
  { id: 'temp', label: 'Temperatura', unit: '°C', keys: ['temp'] },
  { id: 'activity', label: 'Actividad', unit: 'min', keys: ['activity'] },
];
const LINKS = [
  { key: 'hub', label: 'Nave' },
  { key: 'band', label: 'Banda' },
  { key: 'sleeve', label: 'Manga' },
  { key: 'vest', label: 'Chaleco' },
] as const;
const RANK: Record<Status, number> = { ok: 0, watch: 1, critical: 2 };
const GUTTER = 40;

function VitalCell({ v, metrics }: { v: (typeof VITALS)[number]; metrics: Partial<Record<MetricKey, number>> }) {
  const values = v.keys.map((k) => metrics[k]);
  const has = values.every((x) => x != null);
  const subset: Partial<Record<MetricKey, number>> = {};
  v.keys.forEach((k) => { if (metrics[k] != null) subset[k] = metrics[k]; });
  const st: Status = has ? worstStatus(subset) : 'ok';
  const text = has ? v.keys.map((k, i) => values[i]!.toFixed(METRIC_META[k].decimals)).join('/') : '—';
  const ink = !has ? color.muted : st === 'ok' ? color.text : color.status[st];
  return (
    <View
      accessible
      accessibilityLabel={`${v.label} ${has ? `${text.replace('/', ' sobre ')} ${v.unit}` : 'sin dato'}, ${STATUS_LABEL[st]}`}
      style={{ flex: 1, minHeight: 90, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 14, borderCurve: 'continuous', backgroundColor: st === 'critical' ? color.surface : undefined }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={font('caption', color.muted)} numberOfLines={1}>{v.label} · {v.unit}</Text>
        {st !== 'ok' ? <StatusMark label={STATUS_LABEL[st]} tone={st} compact /> : null}
      </View>
      <Text maxFontSizeMultiplier={1} style={{ ...font('hud', ink), fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{text}</Text>
    </View>
  );
}

/** Modo nave (horizontal, en la manga): vitales a la izquierda sin cajas, paso de protocolo + Hecho + SOS en columna fija a la derecha. */
export function ShipHud() {
  const { metrics, devices, hubOnline, protocols, done, checked, checkins } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [talking, setTalking] = useState(false);
  const [keys, setKeys] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeys(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeys(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const overall = worstStatus(metrics);
  const worst = (Object.keys(metrics) as MetricKey[]).filter((k) => metrics[k] != null && statusOf(k, metrics[k]) !== 'ok').sort((a, b) => RANK[statusOf(b, metrics[b])] - RANK[statusOf(a, metrics[a])])[0];
  const pending = protocols.filter((p) => !done.includes(p.id));
  const current = pending[0];
  const idx = current ? checked[current.id] ?? [] : [];
  const stepIdx = current ? current.steps.findIndex((_, i) => !idx.includes(i)) : -1;
  const connected = { hub: hubOnline, band: !!devices.band, sleeve: !!devices.sleeve, vest: !!devices.vest };
  const left = Math.max(insets.left, 16), right = Math.max(insets.right, 16);
  const colW = Math.round(Math.min(264, Math.max(240, 0.29 * (width - left - right))));
  const typing = talking && keys; // keyboard up: vitals step aside so SOS and the field both fit
  const markStep = () => {
    if (!current || stepIdx < 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useStore.getState().setChecked(current.id, [...idx, stepIdx]);
  };
  const stateInk = overall === 'ok' ? color.status.ok : color.status[overall];

  return (
    /* only lifts the layout while chatting; otherwise it must never add bottom padding (it pushed SOS off screen) */
    <KeyboardAvoidingView enabled={talking} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12), paddingLeft: left, paddingRight: right, gap: 8 }}>
        <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel={overall === 'ok' ? 'Todo en rango' : `${STATUS_LABEL[overall]}: ${worst ? METRIC_META[worst].label : ''}`}>
            <Icon name={overall === 'ok' ? 'checkmark.circle.fill' : overall === 'watch' ? 'exclamationmark.triangle.fill' : 'xmark.octagon.fill'} size={18} color={stateInk} />
            <Text style={font('title', overall === 'ok' ? color.text : stateInk)}>{overall === 'ok' ? 'Todo en rango' : `${STATUS_LABEL[overall]}${worst ? `: ${METRIC_META[worst].label}` : ''}`}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View accessible accessibilityLabel={LINKS.map((l) => `${l.label} ${connected[l.key] ? 'conectada' : 'sin conexión'}`).join(', ')} style={{ flexDirection: 'row', gap: 16 }}>
              {LINKS.map((l) => (
                <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {connected[l.key] ? null : <Icon name="wifi.slash" size={12} color={color.status.watch} />}
                  <Text style={font('caption', connected[l.key] ? color.muted : color.text)}>{l.label}</Text>
                </View>
              ))}
            </View>
            <Press label={talking ? 'Cerrar chat con Orbi' : 'Hablar con Orbi'} haptic="light" onPress={() => setTalking((t) => !t)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Creature size={36} mood={petMood(metrics, checkins[checkins.length - 1])} />
            </Press>
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          {typing ? null : (
            <View style={{ flex: 1 }}>
              {[VITALS.slice(0, 2), VITALS.slice(2, 4), VITALS.slice(4, 6)].map((row, i) => (
                <View key={i} style={{ flex: 1, flexDirection: 'row' }}>{row.map((v) => <VitalCell key={v.id} v={v} metrics={metrics} />)}</View>
              ))}
            </View>
          )}
          {typing ? null : <View style={{ width: GUTTER }} />}
          <View style={typing ? { flex: 1, gap: 12 } : { width: colW, gap: 12 }}>
            {talking ? <ShipChat onClose={() => setTalking(false)} /> : (
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                {current ? (
                  <>
                    <View style={{ gap: 6 }}>
                      <Text style={font('caption', color.muted)} numberOfLines={1}>{current.title}</Text>
                      <Text maxFontSizeMultiplier={1.3} style={font('title')} numberOfLines={3}>{stepIdx >= 0 ? current.steps[stepIdx] : 'Protocolo completo'}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`Paso ${Math.min(stepIdx < 0 ? current.steps.length : stepIdx + 1, current.steps.length)} de ${current.steps.length}`}>
                        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                          {current.steps.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: idx.includes(i) ? color.muted : i === stepIdx ? color.accent : color.raised }} />)}
                        </View>
                        <Text style={font('caption', color.muted)}>{idx.length} de {current.steps.length}</Text>
                      </View>
                      {stepIdx >= 0 ? (
                        <Press label="Paso hecho" haptic="light" onPress={markStep} style={{ height: 56, borderRadius: 14, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <Text maxFontSizeMultiplier={1.2} style={font('button', color.onAccent)}>Hecho</Text>
                        </Press>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <View style={{ gap: 6 }}>
                    <Text style={font('title')}>Sin protocolo activo</Text>
                    <Text style={font('caption', color.muted)}>{checkins.length ? 'Check-in de hoy registrado' : 'Falta el check-in de hoy'}</Text>
                  </View>
                )}
              </View>
            )}
            <SosButton large width={typing ? Math.min(264, Math.max(240, 0.29 * (width - left - right))) : colW} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Chat compacto en el lugar del protocolo; el dictado del teclado de iOS permite hablarle sin teclear. */
function ShipChat({ onClose }: { onClose: () => void }) {
  const chat = useStore((s) => s.chat);
  const { text, setText, busy, error, send } = usePetChat();
  const list = useRef<FlatList>(null);
  return (
    <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 14, borderCurve: 'continuous', padding: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={font('caption', color.muted)}>Orbi</Text>
        <Press label="Cerrar chat" onPress={onClose} style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 }}><Text style={font('small', color.accentText)}>Cerrar</Text></Press>
      </View>
      <FlatList
        ref={list}
        style={{ flex: 1 }}
        data={chat.slice(-20)}
        keyExtractor={(m, i) => `${m.ts}${i}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 6, flexGrow: 1, justifyContent: 'flex-end' }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={font('body', color.muted)}>Pregúntale algo a Orbi.</Text>}
        ListFooterComponent={busy ? <Text accessibilityLiveRegion="polite" style={font('small', color.muted)}>Orbi está escribiendo…</Text> : null}
        renderItem={({ item: m }) => {
          const mine = m.from === 'me';
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: mine ? color.accent : color.raised, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={font('small', mine ? color.onAccent : color.text)}>{m.text}</Text>
            </View>
          );
        }}
      />
      {error ? <Text accessibilityRole="alert" style={font('small', color.status.watch)} numberOfLines={2}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <TextInput accessibilityLabel="Mensaje para Orbi" value={text} onChangeText={setText} onSubmitEditing={() => void send()} returnKeyType="send" placeholder="Escribe o dicta" placeholderTextColor={color.faint} style={{ ...font('body'), flex: 1, height: 40, backgroundColor: color.raised, borderRadius: 20, paddingHorizontal: 12 }} />
        <Press label="Enviar mensaje" haptic="light" onPress={() => void send()} disabled={busy || !text.trim()} style={{ width: 44, height: 40, borderRadius: 20, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow.up" size={18} color={color.onAccent} />
        </Press>
      </View>
    </View>
  );
}
