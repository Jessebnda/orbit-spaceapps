import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { color, radius } from '../theme';
import { startRuntime } from '../services/runtime';
import { CheckInScreen } from '../features/checkin/CheckInScreen';
import { EmergencyTakeover } from '../features/emergency/EmergencyTakeover';
import { SessionBanner, SessionFlow } from '../features/pet/SessionFlow';
import { ShipHud } from '../features/ship';
import { Toast } from '../components/ui/Toast';
import { AppErrorBoundary } from './AppErrorBoundary';
import { MainTabs } from './MainTabs';
import { linking } from './linking';
import type { RootParamList } from './navigation';

const navTheme = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: color.bg, card: color.surface, text: color.text, border: color.hairline, primary: color.accent } };
const Root = createNativeStackNavigator<RootParamList>();

/** Entrada: arranca el runtime y monta navegación, modo nave y capas globales. La navegación NO se desmonta al girar: el HUD de nave se superpone. */
export default function App() {
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    startRuntime();
    void ScreenOrientation.unlockAsync().catch(() => {});
  }, []);
  const ship = width > height;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}><AppErrorBoundary>
        <StatusBar style="light" />
        <View style={{ flex: 1, display: ship ? 'none' : 'flex' }}>
          <NavigationContainer theme={navTheme} linking={linking}>
            <Root.Navigator screenOptions={{ headerShown: false }}>
              <Root.Screen name="Tabs" component={MainTabs} />
              <Root.Screen
                name="CheckIn"
                component={CheckInScreen}
                options={{ presentation: 'formSheet', sheetAllowedDetents: [1.0], sheetGrabberVisible: true, sheetCornerRadius: radius.sheet, contentStyle: { backgroundColor: color.bg } }}
              />
            </Root.Navigator>
          </NavigationContainer>
        </View>
        {ship ? <View style={StyleSheet.absoluteFill}><ShipHud /></View> : null}
        <Toast />
        <SessionBanner />
        <SessionFlow />
        <EmergencyTakeover />
      </AppErrorBoundary></SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
