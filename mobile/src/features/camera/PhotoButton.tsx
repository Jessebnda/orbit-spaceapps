import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Text, View } from 'react-native';
import { useStore } from '../../store/store';
import { color, font, radius } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { takePhoto } from '../../services/sensors/ble';
import { send } from '../../services/hub';

/** Pide una foto a la cámara del casco (esp cabeza) por BLE y la muestra a pantalla completa. */
export function PhotoButton({ size = 44 }: { size?: number }) {
  const ready = useStore((s) => s.camera);
  const [busy, setBusy] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const shoot = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await takePhoto();
      setUri(data);
      send({ t: 'photo', crewId: useStore.getState().profile.crewId, ts: Date.now(), jpeg: data.slice(data.indexOf(',') + 1) }); // to the station's crew album
    }
    catch (e) { useStore.getState().showToast((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <>
      <Press label={ready ? 'Tomar foto con la cámara del casco' : 'Cámara del casco sin conexión'} haptic="light" onPress={shoot} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: ready ? 1 : 0.5 }}>
        {busy ? <ActivityIndicator color={color.accent} /> : <Icon name="camera.fill" size={20} color={color.accent} />}
      </Press>
      <Modal visible={uri != null} transparent animationType="fade" onRequestClose={() => setUri(null)} supportedOrientations={['portrait', 'landscape']}>
        <View style={{ flex: 1, backgroundColor: '#000E', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 }}>
          {uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', flex: 1 }} accessibilityLabel="Foto de la cámara del casco" /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press label="Otra foto" haptic="light" onPress={shoot} style={{ height: 44, paddingHorizontal: 24, borderRadius: radius.full, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <ActivityIndicator color={color.accent} /> : <Text style={font('button', color.accentText)}>Otra foto</Text>}
            </Press>
            <Press label="Cerrar foto" haptic="light" onPress={() => setUri(null)} style={{ height: 44, paddingHorizontal: 24, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.muted)}>Cerrar</Text>
            </Press>
          </View>
        </View>
      </Modal>
    </>
  );
}
