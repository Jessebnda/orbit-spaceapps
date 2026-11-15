import type { ComponentType } from 'react';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { color } from '../theme';
import { Icon } from '../components/ui/Icon';
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

// The five tab stacks, shared by the native tab bar (MainTabs.tsx) and the web one (MainTabs.web.tsx).
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

export const HoyPage = page('Hoy', TodayScreen, (nav) => ({
  headerRight: () => (
    <>
      <CheckInButton nav={nav} />
      <SosButton />
    </>
  ),
}));
export const MascotaPage = page('Mascota', PetScreen, () => ({}), (S) => <S.Screen name="Chat" component={ChatScreen} options={{ ...pushed, title: 'Orbi' }} />);
export const ProtocolosPage = page('Protocolos', ProtocolsScreen, () => ({ headerRight: () => <SosButton /> }), (S) => (
  <S.Screen name="ProtocolDetail" component={ProtocolDetailScreen} options={{ ...pushed, title: 'Protocolo' }} />
));
export const JuegoPage = page('Juego', GameScreen, () => ({ headerLargeTitleEnabled: false, headerTransparent: false, headerBlurEffect: undefined, headerStyle: { backgroundColor: color.bg }, title: 'Defensor' }));
export const YoPage = page('Yo', ProfileScreen, (nav) => ({
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

