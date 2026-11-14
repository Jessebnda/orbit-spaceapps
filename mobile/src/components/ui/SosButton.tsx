import { useState } from 'react';
import { Text, View } from 'react-native';
import { color, font, radius } from '../../theme';
import { send } from '../../services/hub';
import { useStore } from '../../store/store';
import { HoldRing } from './HoldRing';
import { Icon } from './Icon';

/** Mantener 1 s con anillo de progreso. Un toque corto nunca manda alarma. Rojo de emergencia solo aquí y en el takeover. `large`: modo nave, 72 pt de alto (pasa `width`). */
export function SosButton({ large = false, width = 200 }: { large?: boolean; width?: number }) {
  const [sent, setSent] = useState(false);
  const fire = () => {
    send({ t: 'sos', crewId: useStore.getState().profile.crewId, kind: 'panic' });
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };
  return (
    <HoldRing
      label="SOS, mantén pulsado"
      hint="Mantén un segundo para avisar al capitán"
      onComplete={fire}
      width={large ? width : 56}
      height={large ? 72 : 32}
      radius={large ? 20 : 16}
      stroke={large ? 4 : 3}
      tint={color.onAccent}
      style={{ backgroundColor: color.emergency, borderRadius: large ? 20 : radius.full, borderCurve: 'continuous' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {sent ? <Icon name="checkmark" size={large ? 20 : 14} color={color.onAccent} weight="bold" /> : null}
        <Text style={font(large ? 'section' : 'button', color.onAccent)}>{sent ? 'Enviado' : large ? 'Mantén para SOS' : 'SOS'}</Text>
      </View>
    </HoldRing>
  );
}
