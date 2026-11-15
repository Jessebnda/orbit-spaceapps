import { useEffect, useState } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme';
import { ANDROID, type IconName } from '../components/ui/Icon';
import { HoyPage, JuegoPage, MascotaPage, ProtocolosPage, YoPage } from './pages';
import { useStore } from '../store/store';
import type { MainTabParamList } from './navigation';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();
/** Android needs a bitmap per tab and @expo/vector-icons only renders them async (no getImageSourceSync), so they load once before the tabs mount. */
const TAB_ICONS: IconName[] = ['heart.text.square', 'pawprint', 'list.bullet.clipboard', 'gamecontroller', 'person.crop.circle'];
function useAndroidTabIcons(): Record<string, ImageSourcePropType> | null {
  const [icons, setIcons] = useState<Record<string, ImageSourcePropType> | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let live = true;
    Promise.all(TAB_ICONS.map((n) => Ionicons.getImageSource(ANDROID[n], 24, color.muted) as Promise<ImageSourcePropType>))
      .then((r) => { if (live) setIcons(Object.fromEntries(TAB_ICONS.map((n, i) => [n, r[i]]))); })
      .catch(() => { if (live) setIcons({}); }); // icons are cosmetic: never block the app on them
    return () => { live = false; };
  }, []);
  return icons;
}

/** Cinco pestañas nativas: Hoy · Mascota · Protocolos · Juego · Yo. Check-in es una acción de Hoy (hoja), no un destino. */
export function MainTabs() {
  const protocols = useStore((s) => s.protocols);
  const done = useStore((s) => s.done);
  const pending = protocols.filter((p) => !done.includes(p.id));
  const androidIcons = useAndroidTabIcons();
  const tabIcon = (name: IconName) => () => (Platform.OS === 'ios' ? { sfSymbol: name } : androidIcons?.[name]) as never;
  const urgent = pending.some((p) => p.kind === 'emergency');
  const badge = pending.length ? String(pending.length) : undefined;
  if (Platform.OS === 'android' && !androidIcons) return null;
  return (
    // Android: Material's default lavender indicator and pink badge are the only purple in the app; tint them to the monochrome system.
    <Tab.Navigator labeled tabBarActiveTintColor={color.text} tabBarInactiveTintColor={color.muted} activeIndicatorColor={color.raised} rippleColor={color.raised} tabBarStyle={{ backgroundColor: color.surface }} screenOptions={{ sceneStyle: { backgroundColor: color.bg } }}>
      <Tab.Screen name="Hoy" component={HoyPage} options={{ title: 'Hoy', tabBarIcon: tabIcon('heart.text.square') }} />
      <Tab.Screen name="Mascota" component={MascotaPage} options={{ title: 'Mascota', tabBarIcon: tabIcon('pawprint') }} />
      <Tab.Screen name="Protocolos" component={ProtocolosPage} options={{ title: 'Protocolos', tabBarIcon: tabIcon('list.bullet.clipboard'), tabBarBadge: badge, tabBarBadgeBackgroundColor: urgent ? color.status.critical : color.accent, tabBarBadgeTextColor: urgent ? color.text : color.onAccent }} />
      <Tab.Screen name="Juego" component={JuegoPage} options={{ title: 'Juego', tabBarIcon: tabIcon('gamecontroller') }} />
      <Tab.Screen name="Yo" component={YoPage} options={{ title: 'Yo', tabBarIcon: tabIcon('person.crop.circle') }} />
    </Tab.Navigator>
  );
}
