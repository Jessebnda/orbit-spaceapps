import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Text, TextInput, View } from 'react-native';
import { useStore } from '../store/store';
import { color, font, radius } from '../theme';
import { Press } from '../components/ui/Press';
import { Creature } from '../features/pet/Creature';

/**
 * Web entry: a name is the whole login. Each visitor joins the crew with simulated vitals and their own id.
 * shortcut: no password or account; anyone on the ship network can join, fine for a demo LAN.
 */
export function WebJoin() {
  const [name, setName] = useState('');
  const clean = name.trim().slice(0, 40);
  const join = () => joinAs(clean);
  const joinAs = (who: string) => {
    if (!who) return;
    const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const s = useStore.getState();
    s.setDataSource('sim');
    s.setProfile({ crewId: id, name: who, role: 'Tripulante', joined: true });
  };
  // ?name=Ana joins straight away: a per-person QR, and a way to test in a browser nobody can type into
  useEffect(() => {
    const n = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('name')?.trim().slice(0, 40) : '';
    if (n) { setName(n); joinAs(n); }
  }, []);
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.bg, justifyContent: 'center', padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', gap: 20 }}>
        <View style={{ alignItems: 'center' }}><Creature size={120} /></View>
        <View style={{ gap: 6 }}>
          <Text style={font('title')}>Únete a la tripulación</Text>
          <Text style={font('body', color.muted)}>Escribe tu nombre para probar la app. Tus signos vitales serán datos falsos generados por simulación, y se enviarán al monitor del capitán como un tripulante más.</Text>
        </View>
        <TextInput accessibilityLabel="Tu nombre" value={name} onChangeText={setName} onSubmitEditing={join} autoFocus autoComplete="name" returnKeyType="go" placeholder="Tu nombre" placeholderTextColor={color.faint}
          style={{ ...font('body'), backgroundColor: color.raised, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14 }} />
        <Press label="Entrar" haptic="light" onPress={join} disabled={!clean}
          style={{ minHeight: 50, borderRadius: radius.lg, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', opacity: clean ? 1 : 0.5 }}>
          <Text style={font('button', color.onAccent)}>Entrar</Text>
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Always-visible web notice: every vital on screen (and on the captain's monitor) is generated. */
export function WebDemoBanner() {
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: color.raised, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.hairline }}>
      <Text style={[font('caption', color.muted), { textAlign: 'center' }]}>Demo · los datos son falsos (simulados), no son mediciones de salud reales</Text>
    </View>
  );
}
