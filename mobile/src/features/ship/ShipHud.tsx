import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { METRIC_META, statusOf, worstStatus, type MetricKey } from '@orbit/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/store';
import { alpha, color, font, radius, STATUS_LABEL } from '../../theme';
import { Creature } from '../pet/Creature';
import { petMood } from '../../domain/derive';
import { usePetChat } from '../pet/usePetChat';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { SosButton } from '../../components/ui/SosButton';
import { StatusMark } from '../../components/ui/StatusMark';

/** Health-style category tints: they colour the tile, never the status (status keeps its own border and mark). */
const TILES: { id: string; label: string; icon: IconName; tint: string; keys: MetricKey[]; unit: string }[] = [
  { id: 'hr', label: 'Ritmo cardiaco', icon: 'heart.fill', tint: '#FF375F', keys: ['hr'], unit: 'lpm' },
  { id: 'spo2', label: 'Oxígeno', icon: 'drop.fill', tint: color.accent, keys: ['spo2'], unit: '%' },
  { id: 'bp', label: 'Presión', icon: 'gauge.with.dots.needle.67percent', tint: '#FF9F0A', keys: ['bpSys', 'bpDia'], unit: 'mmHg' },
  { id: 'resp', label: 'Respiración', icon: 'lungs.fill', tint: '#40C8E0', keys: ['resp'], unit: 'rpm' },
  { id: 'temp', label: 'Temperatura', icon: 'thermometer.medium', tint: '#FFD60A', keys: ['temp'], unit: '°C' },
  { id: 'sleep', label: 'Sueño', icon: 'moon.zzz.fill', tint: '#7AA7FF', keys: ['sleep'], unit: 'h' },
];
const LINKS = [
  { key: 'hub', label: 'Nave' },
  { key: 'band', label: 'Banda' },
  { key: 'sleeve', label: 'Manga' },
  { key: 'vest', label: 'Chaleco' },
] as const;

/** A soft colour wash from the top-left corner: depth without a second surface. */
function Wash({ id, tint, from = 0.3 }: { id: string; tint: string; from?: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={tint} stopOpacity={from} />
          <Stop offset="1" stopColor={tint} stopOpacity={0.03} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Ambient glow behind everything, so the screen is not flat black. */
function Backdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="bgA" cx="12%" cy="0%" r="75%">
          <Stop offset="0" stopColor={color.accent} stopOpacity={0.26} />
          <Stop offset="1" stopColor={color.accent} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="bgB" cx="100%" cy="100%" r="60%">
          <Stop offset="0" stopColor="#FF375F" stopOpacity={0.14} />
          <Stop offset="1" stopColor="#FF375F" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bgA)" />
      <Rect width="100%" height="100%" fill="url(#bgB)" />
    </Svg>
  );
}

function Tile({ t, metrics }: { t: (typeof TILES)[number]; metrics: Partial<Record<MetricKey, number>> }) {
  const values = t.keys.map((k) => metrics[k]);
  const has = values.every((v) => v != null);
  const subset: Partial<Record<MetricKey, number>> = {};
  t.keys.forEach((k) => { if (metrics[k] != null) subset[k] = metrics[k]; });
  const st = has ? worstStatus(subset) : 'ok';
  const bad = st !== 'ok';
  const text = has ? t.keys.map((k, i) => values[i]!.toFixed(METRIC_META[k].decimals)).join('/') : '—';
  const ink = !has ? color.faint : bad ? color.status[st] : color.text;
  return (
    <View
      accessible
      accessibilityLabel={`${t.label} ${has ? `${text} ${t.unit}` : 'sin dato'}, ${STATUS_LABEL[st]}`}
      style={{ flex: 1, borderRadius: 22, borderCurve: 'continuous', backgroundColor: color.surface, overflow: 'hidden', padding: 12, justifyContent: 'space-between', borderWidth: bad ? 2 : StyleSheet.hairlineWidth, borderColor: bad ? color.status[st] : alpha(t.tint, 0.35) }}
    >
      <Wash id={`w-${t.id}`} tint={t.tint} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: alpha(t.tint, 0.22), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={t.icon} size={15} color={t.tint} />
        </View>
        <Text style={{ ...font('caption', color.muted), flex: 1 }} numberOfLines={1}>{t.label}</Text>
        {bad ? <StatusMark label={STATUS_LABEL[st]} tone={st} compact /> : null}
      </View>
      <Text style={font('hud', ink)} numberOfLines={1} adjustsFontSizeToFit>
        {text}
        {has ? <Text style={font('body', color.muted)}> {t.unit}</Text> : null}
      </Text>
    </View>
  );
}

/** Modo nave (horizontal, en la manga): rejilla de 3×2 tarjetas de vitales y una columna con protocolo (o chat) y SOS siempre visible. */
export function ShipHud() {
  const { metrics, devices, hubOnline, protocols, done, checked, checkins } = useStore();
  const insets = useSafeAreaInsets();
  const [colW, setColW] = useState(240);
  const [talking, setTalking] = useState(false);
  const overall = worstStatus(metrics);
  const pending = protocols.filter((p) => !done.includes(p.id));
  const current = pending[0];
  const idx = current ? checked[current.id] ?? [] : [];
  const stepIdx = current ? current.steps.findIndex((_, i) => !idx.includes(i)) : -1;
  const connected = { hub: hubOnline, band: !!devices.band, sleeve: !!devices.sleeve, vest: !!devices.vest };
  const markStep = () => {
    if (!current || stepIdx < 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useStore.getState().setChecked(current.id, [...idx, stepIdx]);
  };
  const stateTint = overall === 'ok' ? color.status.ok : color.status[overall];

  return (
    /* only lifts the layout while chatting; otherwise it must never add bottom padding (it pushed SOS off screen) */
    <KeyboardAvoidingView enabled={talking} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
      <Backdrop />
      <View style={{ flex: 1, paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 10), paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16), gap: 10 }}>
        <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: alpha(stateTint, 0.16) }}>
            <Icon name={overall === 'ok' ? 'checkmark.circle.fill' : overall === 'watch' ? 'exclamationmark.triangle.fill' : 'xmark.octagon.fill'} size={18} color={stateTint} />
            <Text style={font('button', stateTint)}>{overall === 'ok' ? 'Todo en rango' : STATUS_LABEL[overall]}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 12, height: 36, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: alpha(color.text, 0.07), alignItems: 'center' }}>
              {LINKS.map((l) => (
                <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityLabel={`${l.label} ${connected[l.key] ? 'conectada' : 'sin conexión'}`}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connected[l.key] ? color.status.ok : color.faint }} />
                  <Text style={font('small', connected[l.key] ? color.text : color.faint)}>{l.label}</Text>
                </View>
              ))}
            </View>
            <Press label={talking ? 'Cerrar chat con Orbi' : 'Hablar con Orbi'} haptic="light" onPress={() => setTalking((t) => !t)} style={{ height: 40, paddingLeft: 4, paddingRight: 14, borderRadius: radius.full, backgroundColor: talking ? color.accent : alpha(color.accent, 0.2), flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 32, height: 32 }}><Creature size={32} mood={petMood(metrics, checkins[checkins.length - 1])} /></View>
              <Text style={font('small', talking ? color.onAccent : color.accentText)}>{talking ? 'Cerrar' : 'Hablar'}</Text>
            </Press>
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2, gap: 10 }}>
            {[TILES.slice(0, 3), TILES.slice(3, 6)].map((row, i) => (
              <View key={i} style={{ flex: 1, flexDirection: 'row', gap: 10 }}>{row.map((t) => <Tile key={t.id} t={t} metrics={metrics} />)}</View>
            ))}
          </View>

          <View style={{ flex: 1.1, gap: 10 }} onLayout={(e) => setColW(e.nativeEvent.layout.width)}>
            {talking ? <ShipChat onClose={() => setTalking(false)} /> : (
              <View style={{ flex: 1, borderRadius: 22, borderCurve: 'continuous', backgroundColor: color.surface, overflow: 'hidden', padding: 14, gap: 8, justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderColor: alpha(color.accent, 0.35) }}>
                <Wash id="w-proto" tint={color.accent} from={0.22} />
                {current ? (
                  <>
                    <View style={{ gap: 6 }}>
                      <Text style={font('caption', color.accentText)} numberOfLines={1}>{current.title.toUpperCase()}</Text>
                      <Text style={font('title')} numberOfLines={3}>{stepIdx >= 0 ? current.steps[stepIdx] : 'Protocolo completo'}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }} accessibilityLabel={`Paso ${Math.max(stepIdx, 0) + 1} de ${current.steps.length}`}>
                        {current.steps.map((_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: idx.includes(i) || i === stepIdx ? color.accent : alpha(color.text, 0.16), opacity: i === stepIdx ? 1 : idx.includes(i) ? 0.6 : 1 }} />)}
                      </View>
                      {stepIdx >= 0 ? (
                        <Press label="Paso hecho" haptic="light" onPress={markStep} style={{ height: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={font('button', color.onAccent)}>Hecho</Text>
                        </Press>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Icon name="checkmark.seal" size={32} color={color.accentText} />
                    <Text style={{ ...font('body'), textAlign: 'center' }}>La nave no ha enviado nada</Text>
                    <Text style={{ ...font('small', color.muted), textAlign: 'center' }}>{checkins.length ? 'Check-in de hoy registrado' : 'Falta el check-in de hoy'}</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ shadowColor: color.emergency, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}>
              <SosButton large width={colW} />
            </View>
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
    <View style={{ flex: 1, backgroundColor: color.surface, borderRadius: 22, borderCurve: 'continuous', padding: 10, gap: 8, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: alpha(color.accent, 0.35) }}>
      <Wash id="w-chat" tint={color.accent} from={0.18} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={font('caption', color.accentText)}>ORBI</Text>
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
