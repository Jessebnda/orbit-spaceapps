import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Text, TextInput, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTabInset } from '../../theme/useTabInset';
import { usePetChat } from './usePetChat';
import { useStore } from '../../store/store';
import { color, font } from '../../theme';
import { Press } from '../../components/ui/Press';
import { Creature } from './Creature';
import { petMood } from '../../domain/derive';
import { useReducedMotion } from '../../theme/useReducedMotion';

function Dot({ i }: { i: number }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduced) y.set(withDelay(i * 120, withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })), -1)));
    return () => cancelAnimation(y);
  }, [i, reduced, y]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.muted }, s]} />;
}

/** Conversación con Orbi: burbujas, avatar solo al inicio de cada bloque, hora cada 15 min, compositor pegado al teclado. */
export function ChatScreen() {
  const chat = useStore((s) => s.chat);
  const { metrics, checkins, care } = useStore();
  const header = useHeaderHeight();
  const tabHeight = useTabInset();
  const [keyboard, setKeyboard] = useState(false);
  const brainStatus = useStore(s => s.brain.status);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const { text, setText, busy, error, send } = usePetChat();
  const list = useRef<FlatList>(null);
  const data = chat;

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: 1 }}>
      <View style={{ paddingTop: header + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[font('small', color.muted), { flex: 1 }]}>{brainStatus === 'ready' ? 'Modelo local disponible' : 'Chat con respuesta alternativa'}</Text>
        {chat.length ? (
          <Press label="Nueva conversación" hint="Borra este chat y empieza de cero" disabled={busy} onPress={() => Alert.alert('¿Nueva conversación?', 'Se borra este chat. Orbi empieza de cero.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Empezar de nuevo', style: 'destructive', onPress: () => useStore.getState().clearChat() },
          ])} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: color.raised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
            <Text style={font('small', color.text)}>Nueva conversación</Text>
          </Press>
        ) : null}
      </View>
      <FlatList
        ref={list}
        data={data}
        keyExtractor={(m, i) => `${m.ts}${i}`}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 4, flexGrow: 1 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={busy ? (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 5, backgroundColor: color.raised, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, marginTop: 4 }} accessibilityLabel="Orbi está escribiendo">
            {[0, 1, 2].map((i) => <Dot key={i} i={i} />)}
          </View>
        ) : null}
        ListEmptyComponent={<View style={{ gap: 16, paddingVertical: 24 }}>
          <View style={{ alignItems: 'center' }}><Creature size={100} /></View>
          <Text style={font('title')}>Hola, soy Orbi</Text>
          <Text style={font('body', color.muted)}>Escribe abajo o elige una frase para empezar. Este chat es por texto.</Text>
          {['Quiero contarte cómo va mi día', 'Me siento cansado', 'Estoy preocupado'].map(prompt => <Press key={prompt} label={prompt} onPress={() => void send(prompt)} disabled={busy} style={{ padding: 14, minHeight: 44, borderRadius: 14, backgroundColor: color.raised }}><Text style={font('body')}>{prompt}</Text></Press>)}
        </View>}
        renderItem={({ item: m, index }) => {
          const older = data[index - 1]; // lista invertida: el siguiente es el anterior en el tiempo
          const newer = data[index + 1];
          const mine = m.from === 'me';
          const firstOfBlock = !older || older.from !== m.from;
          const gap = older && m.ts - older.ts > 15 * 60_000;
          void newer;
          return (
            <View>
              {!older || gap ? <Text style={{ ...font('small', color.faint), fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>{new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: firstOfBlock ? 8 : 0 }}>
                {!mine ? <View style={{ width: 28, height: 28, overflow: 'hidden', opacity: firstOfBlock ? 1 : 0 }}><Creature size={28} mood={petMood(metrics, checkins[checkins.length - 1], care)} /></View> : null}
                <View style={{ maxWidth: '78%', backgroundColor: mine ? color.accent : color.raised, borderRadius: 18, borderCurve: 'continuous', ...(mine ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }), paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={font('body', mine ? color.onAccent : color.text)} selectable>{m.text}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
      {error && <Text accessibilityRole="alert" style={{ ...font('small', color.status.watch), paddingHorizontal: 16 }}>{error}</Text>}
      {busy && <Text accessibilityLiveRegion="polite" style={{ ...font('small', color.muted), paddingHorizontal: 16 }}>Orbi está preparando su respuesta…</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: keyboard ? 8 : tabHeight + 8, backgroundColor: color.bg }}>
        <TextInput accessibilityLabel="Mensaje para Orbi" value={text} onChangeText={setText} multiline placeholder="Escribe a Orbi" placeholderTextColor={color.faint} style={{ ...font('body'), flex: 1, maxHeight: 120, backgroundColor: color.raised, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9 }} />
        <Press label="Enviar mensaje" haptic="light" onPress={() => void send()} disabled={busy || !text.trim()} style={{ minWidth: 68, minHeight: 44, borderRadius: 22, paddingHorizontal: 12, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={font('button', color.onAccent)}>Enviar</Text>
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}
