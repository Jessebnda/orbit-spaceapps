import { useEffect, useState, type ComponentType } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme';
import { ANDROID, Icon, type IconName } from '../components/ui/Icon';
import { Press } from '../components/ui/Press';
import { SosButton } from '../components/ui/SosButton';
import { GameScreen } from '../features/game/GameScreen';
import { ChatScreen } from '../features/pet/ChatScreen';
import { PetScreen } from '../features/pet/PetScreen';
import { AllAchievementsScreen } from '../features/profile/AchievementsGrid';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SettingsScreen } from '../features/profile/SettingsScreen';
import { ProtocolDetailScreen, ProtocolsScreen } from '../features/protocols/ProtocolsScreen';
import { TodayScreen } from '../features/today/TodayScreen';
import { useStore } from '../store/store';
import type { MainTabParamList } from './navigation';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator();

type Nav = { navigate: (name: string, params?: object) => void };

const base: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: false,
  headerTitleStyle: { color: color.text },
  headerLargeTitleStyle: { color: color.text },
  headerTransparent: false,
  headerStyle: { backgroundColor: color.bg }, // inline native header avoids blank large-title space inside iOS native tabs
  headerBlurEffect: 'systemChromeMaterialDark',
  headerLargeTitleShadowVisible: false,
  headerTintColor: color.accent,
  headerLargeStyle: { backgroundColor: color.bg },
};
const pushed: NativeStackNavigationOptions = { headerLargeTitleEnabled: false, headerTransparent: true, headerBlurEffect: 'systemChromeMaterialDark', headerTintColor: color.accent };

function CheckInButton({ nav }: { nav: Nav }) {
  return (
    <Press label="Check-in de hoy" onPress={() => nav.navigate('CheckIn')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="square.and.pencil" size={20} color={color.accent} />
    </Press>
  );
}

/** Cada pestaña es un stack nativo con título grande que se contrae. SOS solo en Hoy y Protocolos (en Juego tapa el campo, en Mascota roba foco). */
function page(title: string, component: ComponentType, opts: (nav: Nav) => NativeStackNavigationOptions, extra?: (S: typeof Stack) => React.ReactNode) {
  return function TabPage() {
    return (
      <Stack.Navigator screenOptions={base}>
        <Stack.Screen name={title} component={component} options={({ navigation }) => opts(navigation as unknown as Nav)} />
        {extra?.(Stack)}
      </Stack.Navigator>
    );
  };
}

const HoyPage = page('Hoy', TodayScreen, (nav) => ({
  headerRight: () => (
    <>
      <CheckInButton nav={nav} />
      <SosButton />
    </>
  ),
}));
const MascotaPage = page('Mascota', PetScreen, () => ({}), (S) => <S.Screen name="Chat" component={ChatScreen} options={{ ...pushed, title: 'Orbi' }} />);
const ProtocolosPage = page('Protocolos', ProtocolsScreen, () => ({ headerRight: () => <SosButton /> }), (S) => (
  <S.Screen name="ProtocolDetail" component={ProtocolDetailScreen} options={{ ...pushed, title: 'Protocolo' }} />
));
const JuegoPage = page('Juego', GameScreen, () => ({ headerLargeTitleEnabled: false, headerTransparent: false, headerBlurEffect: undefined, headerStyle: { backgroundColor: color.bg }, title: 'Defensor' }));
const YoPage = page('Yo', ProfileScreen, (nav) => ({
  headerRight: () => (
    <Press label="Ajustes" onPress={() => nav.navigate('Ajustes')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="gearshape" size={22} color={color.accent} />
    </Press>
  ),
}), (S) => (
  <>
    <S.Screen name="Ajustes" component={SettingsScreen} options={{ ...base, headerLargeTitleEnabled: false, title: 'Ajustes' }} />
    <S.Screen name="Logros" component={AllAchievementsScreen} options={{ ...pushed, title: 'Logros' }} />
  </>
));

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
  const badge = pending.length ? (pending.some((p) => p.kind === 'emergency') ? '•' : String(pending.length)) : undefined;
  if (Platform.OS === 'android' && !androidIcons) return null;
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: color.accent, sceneStyle: { backgroundColor: color.bg } }}>
      <Tab.Screen name="Hoy" component={HoyPage} options={{ title: 'Hoy', tabBarIcon: tabIcon('heart.text.square') }} />
      <Tab.Screen name="Mascota" component={MascotaPage} options={{ title: 'Mascota', tabBarIcon: tabIcon('pawprint') }} />
      <Tab.Screen name="Protocolos" component={ProtocolosPage} options={{ title: 'Protocolos', tabBarIcon: tabIcon('list.bullet.clipboard'), tabBarBadge: badge }} />
      <Tab.Screen name="Juego" component={JuegoPage} options={{ title: 'Juego', tabBarIcon: tabIcon('gamecontroller') }} />
      <Tab.Screen name="Yo" component={YoPage} options={{ title: 'Yo', tabBarIcon: tabIcon('person.crop.circle') }} />
    </Tab.Navigator>
  );
}
