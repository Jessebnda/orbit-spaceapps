import { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CheckIn } from '@orbit/shared';
import { send } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { FormSection } from '../../components/ui/FormSection';
import { Press } from '../../components/ui/Press';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { SettingsRow } from '../../components/ui/SettingsGroup';

type Score = CheckIn['mood'];
const SCORES = [1, 2, 3, 4, 5] as const;
const MOOD_ICON = ['sad-outline', 'thumbs-down-outline', 'remove-circle-outline', 'thumbs-up-outline', 'happy-outline'] as const;
const MOOD_LABEL = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];
const input = { backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, color: color.text, fontSize: 16 };

/** Check-in diario: ánimo, estrés, perspectiva y notas. Formulario, sin cards. */
export function CheckInScreen() {
  const [mood, setMood] = useState<Score>(3);
  const [stress, setStress] = useState<Score>(2);
  const [outlook, setOutlook] = useState<Score>(3);
  const [injury, setInjury] = useState('');
  const [bereavement, setBereavement] = useState(false);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    const c: CheckIn = { ts: Date.now(), mood, stress, missionOutlook: outlook, injury: injury.trim() || undefined, bereavement, note: note.trim() || undefined };
    useStore.getState().addCheckIn(c);
    send({ t: 'checkin', crewId: useStore.getState().profile.crewId, checkin: c });
    useStore.getState().showToast('Check-in enviado');
    setSent(true);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space['2xl'] }}>
      <ScreenHeader kicker="Check-in" title="¿Cómo estás hoy?" subtitle="Solo tú lo ves y el capitán recibe el resumen." />
      <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
        <FormSection title="Ánimo">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {SCORES.map((s, i) => (
              <Press key={s} label={`Ánimo ${MOOD_LABEL[i]}`} onPress={() => setMood(s)} style={{ alignItems: 'center', gap: space.xs, padding: space.xs, borderRadius: radius.md, backgroundColor: mood === s ? color.raised : 'transparent' }}>
                <Ionicons name={MOOD_ICON[i]} size={28} color={mood === s ? color.accent : color.muted} />
                <Text style={font('small', mood === s ? color.text : color.faint)}>{MOOD_LABEL[i]}</Text>
              </Press>
            ))}
          </View>
        </FormSection>

        <FormSection title="Estrés" hint="1 = tranquilo, 5 = muy alto">
          <SegmentedTabs tabs={SCORES.map((s) => ({ key: String(s), label: String(s) }))} active={String(stress)} onChange={(k) => setStress(Number(k) as Score)} />
        </FormSection>

        <FormSection title="Perspectiva de la misión" hint="1 = muy pesimista, 5 = muy optimista">
          <SegmentedTabs tabs={SCORES.map((s) => ({ key: String(s), label: String(s) }))} active={String(outlook)} onChange={(k) => setOutlook(Number(k) as Score)} />
        </FormSection>

        <FormSection title="Lesiones o molestias" hint="Opcional. Escríbelo tal cual lo sientes.">
          <TextInput value={injury} onChangeText={setInjury} placeholder="Ninguna" placeholderTextColor={color.faint} style={input} />
        </FormSection>

        <FormSection title="Noticias de casa">
          <SettingsRow last>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={font('body')}>Recibí una noticia familiar difícil</Text>
              <Switch value={bereavement} onValueChange={setBereavement} trackColor={{ true: color.accent, false: color.raised }} />
            </View>
          </SettingsRow>
        </FormSection>

        <FormSection title="Nota">
          <TextInput value={note} onChangeText={setNote} multiline placeholder="Lo que quieras contar" placeholderTextColor={color.faint} style={{ ...input, minHeight: 88, textAlignVertical: 'top' }} />
        </FormSection>

        <Press label="Enviar check-in" onPress={submit} disabled={sent} style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
          <Text style={font('button', color.onAccent)}>{sent ? 'Enviado por hoy' : 'Enviar check-in'}</Text>
        </Press>
      </View>
    </ScrollView>
  );
}
