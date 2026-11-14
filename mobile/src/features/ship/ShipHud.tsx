import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { METRIC_META, statusOf, worstStatus, type MetricKey } from '@orbit/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/store';
import { color, font, radius, STATUS_LABEL } from '../../theme';
import { Creature } from '../pet/Creature';
import { petMood } from '../../domain/derive';
import { usePetChat } from '../pet/usePetChat';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { SosButton } from '../../components/ui/SosButton';
import { StatusMark } from '../../components/ui/StatusMark';

const HUD: MetricKey[] = ['hr', 'spo2', 'bpSys', 'resp', 'temp'];
const LINKS = [
  { key: 'hub', label: 'Nave' },
  { key: 'band', label: 'Banda' },
  { key: 'sleeve', label: 'Manga' },
  { key: 'vest', label: 'Chaleco' },
] as const;

/** Modo nave (horizontal, en la manga): tres columnas [vitales 2fr][protocolo 1.2fr][acciones 0.8fr], sin scroll, texto blanco sobre negro. */
export function ShipHud() {
  const { metrics, devices, hubOnline, protocols, done, checked, checkins } = useStore();
  const insets = useSafeAreaInsets();
  const [col3, setCol3] = useState(180);
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
  const cell = (k: MetricKey | 'sleeve') => {
    if (k === 'sleeve') {
      const on = !!devices.sleeve;
      return (
        <View key="sleeve" style={{ flex: 1, padding: 8, gap: 2 }}>
          <Text style={font('caption', color.muted)}>Manga</Text>
          <Text style={font('section', on ? color.text : color.faint)}>{on ? 'Conectada' : 'Sin señal'}</Text>
        </View>
      );
    }
    const st = statusOf(k, metrics[k]);
    const bad = st !== 'ok';
    const ink = bad ? color.status[st] : color.text;
    const v = metrics[k];
    return (
      <View key={k} accessible accessibilityLabel={`${METRIC_META[k].label} ${v == null ? 'sin dato' : v.toFixed(METRIC_META[k].decimals)} ${METRIC_META[k].unit}, ${STATUS_LABEL[st]}`} style={{ flex: 1, padding: 8, gap: 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: bad ? color.surface : undefined }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={font('caption', color.muted)} numberOfLines={1}>{METRIC_META[k].label}</Text>
          {bad ? <StatusMark label={STATUS_LABEL[st]} tone={st} compact /> : null}
        </View>
        <Text style={font('hud', ink)} numberOfLines={1} adjustsFontSizeToFit>
          {v == null ? '—' : v.toFixed(METRIC_META[k].decimals)}
          <Text style={font('body', color.muted)}> {METRIC_META[k].unit}</Text>
        </Text>
      </View>
    );
  };
  const slots: (MetricKey | 'sleeve')[] = [...HUD, 'sleeve'].slice(0, 6) as (MetricKey | 'sleeve')[];

  return (
    /* only lifts the layout while chatting; otherwise it must never add bottom padding (it pushed SOS off screen) */
    <KeyboardAvoidingView enabled={talking} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 8), paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16), gap: 8 }}>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={overall === 'ok' ? 'checkmark.circle.fill' : overall === 'watch' ? 'exclamationmark.triangle.fill' : 'xmark.octagon.fill'} size={20} color={color.status[overall]} />
          <Text style={font('title', overall === 'ok' ? color.text : color.status[overall])}>{overall === 'ok' ? 'Todo en rango' : STATUS_LABEL[overall]}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {LINKS.map((l) => (
            <View key={l.key} style={{ alignItems: 'center', gap: 2 }} accessibilityLabel={`${l.label} ${connected[l.key] ? 'conectada' : 'sin conexión'}`}>
              <Icon name="antenna.radiowaves.left.and.right" size={18} color={connected[l.key] ? color.status.ok : color.faint} />
              <Text style={font('small', connected[l.key] ? color.text : color.faint)}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 2 }}>
          {[slots.slice(0, 3), slots.slice(3, 6)].map((row, i) => <View key={i} style={{ flex: 1, flexDirection: 'row' }}>{row.map(cell)}</View>)}
        </View>

        {talking ? <ShipChat onClose={() => setTalking(false)} /> : (
        <View style={{ flex: 1.2, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 14, gap: 8, justifyContent: 'space-between' }}>
          {current ? (
            <>
              <View style={{ gap: 6 }}>
                <Text style={font('caption', color.muted)} numberOfLines={1}>{current.title}</Text>
                <Text style={font('title')} numberOfLines={3}>{stepIdx >= 0 ? current.steps[stepIdx] : 'Protocolo completo'}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLabel={`Paso ${Math.max(stepIdx, 0) + 1} de ${current.steps.length}`}>
                  {current.steps.map((_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === stepIdx ? color.accent : idx.includes(i) ? color.muted : color.raised }} />)}
                </View>
                {stepIdx >= 0 ? (
                  <Press label="Paso hecho" onPress={markStep} style={{ height: 56, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={font('button', color.onAccent)}>Hecho</Text>
                  </Press>
                ) : null}
              </View>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="checkmark.seal" size={32} color={color.muted} />
              <Text style={{ ...font('body'), textAlign: 'center' }}>La nave no ha enviado nada</Text>
              <Text style={{ ...font('small', color.muted), textAlign: 'center' }}>{checkins.length ? 'Check-in de hoy registrado' : 'Falta el check-in de hoy'}</Text>
            </View>
          )}
        </View>
        )}

        <View style={{ flex: 0.8, justifyContent: 'flex-end', alignItems: 'center', gap: 8, minHeight: 0 }} onLayout={(e) => setCol3(e.nativeEvent.layout.width)}>
          <Press label={talking ? 'Cerrar chat con Orbi' : 'Hablar con Orbi'} haptic="light" onPress={() => setTalking((t) => !t)} style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ height: 56 }}><Creature size={56} mood={petMood(metrics, checkins[checkins.length - 1])} /></View>
            <Text style={font('small', color.accentText)}>{talking ? 'Cerrar' : 'Hablar'}</Text>
          </Press>
          <SosButton large width={col3} />
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
    <View style={{ flex: 1.2, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 10, gap: 8 }}>
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
