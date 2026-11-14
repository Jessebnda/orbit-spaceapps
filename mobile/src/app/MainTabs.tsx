import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { color, font } from '../theme';
import { SosButton } from '../components/ui/SosButton';
import { CheckInScreen } from '../features/checkin/CheckInScreen';
import { GameScreen } from '../features/game/GameScreen';
import { PetScreen } from '../features/pet/PetScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ProtocolsScreen } from '../features/protocols/ProtocolsScreen';
import { TodayScreen } from '../features/today/TodayScreen';
import type { MainTabParamList } from './navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON = {
  Hoy: 'pulse-outline',
  CheckIn: 'create-outline',
  Mascota: 'paw-outline',
  Protocolos: 'document-text-outline',
  Juego: 'game-controller-outline',
  Yo: 'person-circle-outline',
} as const;

/** Seis pestañas. El SOS vive en la cabecera de todas, siempre a un toque de mantener. */
export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.text,
        headerTitleStyle: font('section'),
        headerShadowVisible: false,
        headerRight: () => <SosButton />,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.hairline },
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: font('small'),
        sceneStyle: { backgroundColor: color.bg },
        headerShown: false,
        tabBarIcon: ({ color: c, size }) => <Ionicons name={ICON[route.name]} size={size} color={c} />,
      })}
    >
      <Tab.Screen name="Hoy" component={TodayScreen} options={{ headerShown: true, headerTitle: '' }} />
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Check-in' }} />
      <Tab.Screen name="Mascota" component={PetScreen} />
      <Tab.Screen name="Protocolos" component={ProtocolsScreen} />
      <Tab.Screen name="Juego" component={GameScreen} />
      <Tab.Screen name="Yo" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
