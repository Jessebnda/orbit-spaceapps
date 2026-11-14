import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { color } from '../theme';
import { startRuntime } from '../services/runtime';
import { EmergencyTakeover } from '../features/emergency/EmergencyTakeover';
import { SessionBanner, SessionFlow } from '../features/pet/SessionFlow';
import { ShipHud } from '../features/ship';
import { Toast } from '../components/ui/Toast';
import { useStore } from '../store/store';
import { MainTabs } from './MainTabs';

const navTheme = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: color.bg, card: color.surface, text: color.text, border: color.hairline, primary: color.accent } };

/** Entrada: arranca el runtime, elige tabs o modo nave según la orientación y monta las capas globales. */
export default function App() {
  const { width, height } = useWindowDimensions();
  const toast = useStore((s) => s.toast);
  useEffect(() => {
    startRuntime();
    void ScreenOrientation.unlockAsync().catch(() => {});
  }, []);
  const ship = width > height;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ship ? <ShipHud /> : <NavigationContainer theme={navTheme}><MainTabs /></NavigationContainer>}
      {toast ? <Toast text={toast} /> : null}
      <SessionBanner />
      <SessionFlow />
      <EmergencyTakeover />
    </SafeAreaProvider>
  );
}
