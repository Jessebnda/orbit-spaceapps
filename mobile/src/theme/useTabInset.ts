import { Platform } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';

/** How much of a tab scene the tab bar covers. iOS native tabs overlay the scene; Android's Material bar sits below it (0). */
export function useTabInset(): number {
  const h = useBottomTabBarHeight();
  return Platform.OS === 'ios' ? h : 0;
}
