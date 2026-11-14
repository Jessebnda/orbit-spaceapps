import { useEffect } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMERGENCY_LABEL, type Emergency } from '@orbit/shared';
import { send } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { Press } from '../../components/ui/Press';
import { CprGuide } from './CprGuide';

/** Takeover de emergencia sobre todo. Único lugar, con el SOS, donde aparece el rojo de emergencia. */
export function EmergencyTakeover() {
  const e = useStore((s) => s.emergency);
  return (
    <Modal visible={!!e} animationType="fade" presentationStyle="fullScreen">
      {e && <EmergencyView e={e} />}
    </Modal>
  );
}

function EmergencyView({ e }: { e: Emergency }) {
  useKeepAwake();
  const crewId = useStore((s) => s.profile.crewId);
  const insets = useSafeAreaInsets();
  const victim = e.victimId === crewId;
  const rank = e.responders.indexOf(crewId);
  useEffect(() => {
    const id = setInterval(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), 1500);
    return () => clearInterval(id);
  }, []);
  const resolve = () => {
    send({ t: 'resolve', emergencyId: e.id });
    useStore.getState().setEmergency(null);
  };
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: color.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.lg, gap: space.lg }}>
      <View style={{ height: 6, backgroundColor: color.emergency, borderRadius: 3, marginTop: space.sm }} />
      <Text style={font('caption', color.emergency)}>Emergencia · {EMERGENCY_LABEL[e.kind]}</Text>
      {victim ? (
        <>
          <Text style={font('hero')}>Se avisó a {e.responders.join(', ') || 'tu equipo'}.</Text>
          <Text style={font('body')}>No te levantes. Respira despacio. Ellos van hacia ti.</Text>
        </>
      ) : (
        <>
          <Text style={font('hero')}>{rank === 0 ? 'Eres el más cercano' : rank > 0 ? `Eres el ${rank + 1}.º más cercano` : 'Alerta cerca de ti'}</Text>
          <Text style={font('body', color.muted)}>Paciente: {e.victimId}</Text>
          {e.kind === 'cardiac_arrest' ? <CprGuide /> : <Text style={font('body')}>Acude a {e.victimId} y mantén contacto visual.</Text>}
        </>
      )}
      <Press label="Marcar como resuelto" onPress={resolve} style={{ backgroundColor: color.raised, borderRadius: radius.md, padding: space.lg, alignItems: 'center' }}>
        <Text style={font('button')}>Resuelto</Text>
      </Press>
    </ScrollView>
  );
}
