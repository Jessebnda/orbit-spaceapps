import { useCallback, useState } from 'react';
import { Image, Modal, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CrewPhoto } from '@orbit/shared';
import { useStore } from '../../store/store';
import { color, font, radius } from '../../theme';
import { Card, Section } from '../../components/ui/FormSection';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';

/** Same host as the hub socket: wss://host/ws → https://host. */
const httpBase = (hubUrl: string) => hubUrl.replace(/^ws/, 'http').replace(/\/ws\/?$/, '');
const when = (ts: number) => new Date(ts).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Shared album: every helmet-camera photo the station received, newest first. */
export function CrewAlbum() {
  const base = httpBase(useStore((s) => s.hubUrl));
  const photoAt = useStore((s) => s.photoAt);
  const [photos, setPhotos] = useState<CrewPhoto[] | null>(null);
  const [open, setOpen] = useState<CrewPhoto | null>(null);
  useFocusEffect(useCallback(() => {
    let live = true;
    const load = () => fetch(`${base}/api/photos`).then((r) => r.json()).then((p) => { if (live && Array.isArray(p)) setPhotos(p); }).catch(() => {});
    void load();
    const id = setInterval(load, 15_000);
    return () => { live = false; clearInterval(id); };
  }, [base, photoAt]));
  const src = (p: CrewPhoto) => ({ uri: `${base}/api/photos/${p.id}.jpg` });

  return (
    <Section title="Álbum de la tripulación">
      {!photos?.length ? (
        <Card>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Icon name="camera.fill" size={20} color={color.faint} />
            <Text style={[font('small', color.muted), { textAlign: 'center' }]}>{photos ? 'Aún no hay fotos. Toma una con la cámara del casco.' : 'Cargando el álbum de la estación…'}</Text>
          </View>
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {photos.slice(0, 30).map((p) => (
            <Press key={p.id} label={`Foto de ${p.name}, ${when(p.ts)}`} onPress={() => setOpen(p)} style={{ width: '32.5%', aspectRatio: 1, borderRadius: radius.sm, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.raised }}>
              <Image source={src(p)} style={{ width: '100%', height: '100%' }} />
            </Press>
          ))}
        </View>
      )}
      <Modal visible={open != null} transparent animationType="fade" onRequestClose={() => setOpen(null)} supportedOrientations={['portrait', 'landscape']}>
        <View style={{ flex: 1, backgroundColor: '#000E', padding: 16, gap: 12, justifyContent: 'center' }}>
          {open ? <Image source={src(open)} resizeMode="contain" style={{ width: '100%', flex: 1 }} /> : null}
          {open ? <Text style={[font('small', color.muted), { textAlign: 'center' }]}>{open.name} · {when(open.ts)}</Text> : null}
          <Press label="Cerrar foto" haptic="light" onPress={() => setOpen(null)} style={{ alignSelf: 'center', height: 44, paddingHorizontal: 28, borderRadius: radius.full, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={font('button', color.accentText)}>Cerrar</Text>
          </Press>
        </View>
      </Modal>
    </Section>
  );
}
