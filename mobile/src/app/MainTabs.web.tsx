import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { color } from '../theme';
import { Icon, type IconName } from '../components/ui/Icon';
import { useStore } from '../store/store';
import { HoyPage, JuegoPage, MascotaPage, ProtocolosPage, YoPage } from './pages';
import type { MainTabParamList } from './navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const icon = (name: IconName) => ({ color: c }: { color: string }) => <Icon name={name} size={22} color={c} />;

/** Web build: same five tabs with the JS tab bar (the native one has no web renderer). */
export function MainTabs() {
  const protocols = useStore((s) => s.protocols);
  const done = useStore((s) => s.done);
  const pending = protocols.filter((p) => !done.includes(p.id));
  const urgent = pending.some((p) => p.kind === 'emergency');
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: color.text, tabBarInactiveTintColor: color.muted, tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.hairline }, sceneStyle: { backgroundColor: color.bg } }}>
      <Tab.Screen name="Hoy" component={HoyPage} options={{ tabBarIcon: icon('heart.text.square') }} />
      <Tab.Screen name="Mascota" component={MascotaPage} options={{ tabBarIcon: icon('pawprint') }} />
      <Tab.Screen name="Protocolos" component={ProtocolosPage} options={{ tabBarIcon: icon('list.bullet.clipboard'), tabBarBadge: pending.length || undefined, tabBarBadgeStyle: { backgroundColor: urgent ? color.status.critical : color.accent, color: urgent ? color.text : color.onAccent } }} />
      <Tab.Screen name="Juego" component={JuegoPage} options={{ tabBarIcon: icon('gamecontroller') }} />
      <Tab.Screen name="Yo" component={YoPage} options={{ tabBarIcon: icon('person.crop.circle') }} />
    </Tab.Navigator>
  );
}
