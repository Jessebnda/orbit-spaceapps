import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../../theme';
import { send } from '../../services/hub';
import { useStore } from '../../store/store';
import { Press } from './Press';

/** Solo long press de 1 s: un toque corto nunca manda una alarma. Rojo de emergencia permitido aquí. */
export function SosButton({ large = false }: { large?: boolean }) {
  const onLong = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    send({ t: 'sos', crewId: useStore.getState().profile.crewId, kind: 'panic' });
    Alert.alert('SOS enviado', 'El capitán y el equipo cercano han sido avisados.');
  };
  return (
    <Press label="SOS, mantén pulsado" onLongPress={onLong} delayLongPress={1000} haptic={false}
      style={large ? { flex: 1, backgroundColor: color.raised, borderRadius: radius.lg, padding: space.md, alignItems: 'center', gap: space.xs } : { padding: space.sm }}>
      {large ? (
        <View style={{ alignItems: 'center', gap: space.xs }}>
          <Ionicons name="alert-circle" size={44} color={color.emergency} />
          <Text style={font('button')}>SOS · mantén 1 s</Text>
        </View>
      ) : (
        <Ionicons name="alert-circle" size={26} color={color.emergency} />
      )}
    </Press>
  );
}
